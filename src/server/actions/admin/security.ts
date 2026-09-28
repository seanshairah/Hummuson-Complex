"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin, requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { createEnrolment, createRecoveryCodes, verifyTotp } from "@/server/mfa";
import type { AdminActionState } from "@/lib/admin-state";

export interface EnrolmentState extends AdminActionState {
  /** The secret being enrolled, carried across the confirm step. */
  secret?: string;
  uri?: string;
  /** Shown exactly once, immediately after enrolment is confirmed. */
  recoveryCodes?: string[];
}

/**
 * Begins enrolment: a fresh secret and the URI an authenticator app scans.
 *
 * The secret is not written to the user record here. Until a working code has
 * been produced from it, an abandoned enrolment would otherwise leave an
 * account holding a factor nobody can satisfy.
 */
export async function beginMfaEnrolment(): Promise<EnrolmentState> {
  const user = await requireUser();
  const { secret, uri } = createEnrolment(user.email ?? user.id);
  await audit("user.mfa_enrolment_started", { entityType: "user", entityId: user.id });
  return { status: "idle", secret, uri };
}

/** Confirms enrolment with a code produced from the secret being enrolled. */
export async function confirmMfaEnrolment(
  _prev: EnrolmentState,
  formData: FormData,
): Promise<EnrolmentState> {
  const user = await requireUser();
  const secret = String(formData.get("secret") ?? "");
  const uri = String(formData.get("uri") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!secret) return { status: "error", message: "Start again — the enrolment expired." };
  if (!verifyTotp(user.email ?? user.id, secret, code)) {
    return {
      status: "error",
      secret,
      uri,
      fieldErrors: { code: "That code wasn’t right. Check your app and try the current one." },
    };
  }

  const { codes, hashes } = await createRecoveryCodes();
  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpConfirmedAt: new Date(), recoveryCodes: hashes },
  });
  await audit("user.mfa_enabled", { entityType: "user", entityId: user.id, label: user.email });
  revalidatePath("/admin/security");

  return {
    status: "success",
    message: "Two-factor authentication is on.",
    recoveryCodes: codes,
  };
}

/**
 * Turns the second factor off for one's own account, confirmed with a current
 * code — otherwise anyone who walked up to an unlocked screen could remove it.
 */
export async function disableMfa(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireUser();
  const record = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { totpSecret: true, email: true },
  });
  const code = String(formData.get("code") ?? "");

  if (!record.totpSecret || !verifyTotp(record.email, record.totpSecret, code)) {
    return { status: "error", fieldErrors: { code: "Enter a current code to turn this off." } };
  }

  await db.user.update({
    where: { id: user.id },
    data: { totpSecret: null, totpConfirmedAt: null, recoveryCodes: [] },
  });
  await audit("user.mfa_disabled", { entityType: "user", entityId: user.id, label: record.email });
  revalidatePath("/admin/security");
  return { status: "success", message: "Two-factor authentication is off." };
}

/** Replaces the recovery codes, confirmed with a current code. */
export async function regenerateRecoveryCodes(
  _prev: EnrolmentState,
  formData: FormData,
): Promise<EnrolmentState> {
  const user = await requireUser();
  const record = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { totpSecret: true, email: true },
  });
  const code = String(formData.get("code") ?? "");

  if (!record.totpSecret || !verifyTotp(record.email, record.totpSecret, code)) {
    return { status: "error", fieldErrors: { code: "Enter a current code to replace these." } };
  }

  const { codes, hashes } = await createRecoveryCodes();
  await db.user.update({ where: { id: user.id }, data: { recoveryCodes: hashes } });
  await audit("user.recovery_codes_replaced", { entityType: "user", entityId: user.id });
  revalidatePath("/admin/security");
  return { status: "success", message: "New recovery codes.", recoveryCodes: codes };
}

/**
 * Clears another account's second factor — for the person who has lost their
 * phone. Deliberately an administrator action and prominently audited, because
 * it is also exactly what an attacker with an admin account would reach for.
 */
export async function resetUserMfa(id: string): Promise<{ error?: string } | void> {
  await requireAdmin();
  const target = await db.user.update({
    where: { id },
    data: { totpSecret: null, totpConfirmedAt: null, recoveryCodes: [] },
    select: { email: true },
  });
  await audit("user.mfa_reset_by_admin", {
    entityType: "user",
    entityId: id,
    label: target.email,
  });
  revalidatePath("/admin/users");
}
