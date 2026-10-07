import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Secret, TOTP } from "otpauth";
import { db } from "@/server/db";
import { site } from "@/lib/site";

/**
 * Time-based one-time passwords for admin accounts.
 *
 * Self-contained on purpose: no SMS, no third-party identity provider, no
 * account to lose access to. The user's authenticator app and this database
 * are the whole system.
 */

/** How long a passed password step stays valid while waiting for a code. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Wrong codes allowed against one challenge before it is spent. */
const MAX_CHALLENGE_ATTEMPTS = 5;

/**
 * One step either side of the current window, so a code entered as the clock
 * rolls over — or from a phone whose time is slightly out — still works. Wider
 * than that starts handing back the guessing margin the second factor exists
 * to remove.
 */
const WINDOW = 1;

const RECOVERY_CODE_COUNT = 10;

function totpFor(email: string, secret: string): TOTP {
  return new TOTP({
    issuer: site.name,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
}

/** Starts enrolment: a fresh secret and the URI an authenticator app scans. */
export function createEnrolment(email: string): { secret: string; uri: string } {
  const secret = new Secret({ size: 20 }).base32;
  return { secret, uri: totpFor(email, secret).toString() };
}

export function verifyTotp(email: string, secret: string, code: string): boolean {
  const cleaned = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  return totpFor(email, secret).validate({ token: cleaned, window: WINDOW }) !== null;
}

/**
 * Recovery codes, returned in the clear exactly once and stored hashed.
 * They are passwords that skip the second factor, so they get the same
 * treatment as one.
 */
export async function createRecoveryCodes(): Promise<{ codes: string[]; hashes: string[] }> {
  const codes = Array.from(
    { length: RECOVERY_CODE_COUNT },
    () =>
      // Grouped for legibility when someone writes them down or reads them out.
      `${randomBytes(3).toString("hex")}-${randomBytes(3).toString("hex")}`,
  );
  const hashes = await Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
  return { codes, hashes };
}

/**
 * Consumes a recovery code if it matches. Returns the remaining hashes so the
 * caller can persist them — a used code must not work twice.
 */
export async function consumeRecoveryCode(
  code: string,
  hashes: string[],
): Promise<string[] | null> {
  const cleaned = code.trim().toLowerCase();
  for (const hash of hashes) {
    if (await bcrypt.compare(cleaned, hash)) {
      return hashes.filter((entry) => entry !== hash);
    }
  }
  return null;
}

export interface MfaState {
  enrolled: boolean;
  recoveryCodesRemaining: number;
}

export async function mfaStateFor(userId: string): Promise<MfaState> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { totpConfirmedAt: true, recoveryCodes: true },
  });
  return {
    enrolled: Boolean(user?.totpConfirmedAt),
    recoveryCodesRemaining: user?.recoveryCodes.length ?? 0,
  };
}

/* ── Challenges ─────────────────────────────────────────────────────────── */

/** Records that a password step was passed and a code is now needed. */
export async function createChallenge(userId: string): Promise<string> {
  const challenge = await db.mfaChallenge.create({
    data: { id: randomUUID(), userId, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
  });
  return challenge.id;
}

export type ChallengeOutcome =
  | { ok: true; userId: string; usedRecoveryCode: boolean }
  | { ok: false; reason: "expired" | "spent" | "code" };

/**
 * Redeems a challenge with a code. Single use: the row is marked consumed on
 * success, and each failure is counted so guessing runs out of attempts well
 * inside the challenge's five-minute life.
 */
export async function redeemChallenge(
  challengeId: string,
  code: string,
): Promise<ChallengeOutcome> {
  const challenge = await db.mfaChallenge.findUnique({
    where: { id: challengeId },
    include: {
      user: { select: { id: true, email: true, totpSecret: true, recoveryCodes: true } },
    },
  });

  if (!challenge || challenge.consumedAt) return { ok: false, reason: "spent" };
  if (challenge.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) return { ok: false, reason: "spent" };

  const { user } = challenge;

  if (user.totpSecret && verifyTotp(user.email, user.totpSecret, code)) {
    await db.mfaChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });
    return { ok: true, userId: user.id, usedRecoveryCode: false };
  }

  const remaining = await consumeRecoveryCode(code, user.recoveryCodes);
  if (remaining) {
    await db.$transaction([
      db.mfaChallenge.update({ where: { id: challengeId }, data: { consumedAt: new Date() } }),
      db.user.update({ where: { id: user.id }, data: { recoveryCodes: remaining } }),
    ]);
    return { ok: true, userId: user.id, usedRecoveryCode: true };
  }

  await db.mfaChallenge.update({
    where: { id: challengeId },
    data: { attempts: { increment: 1 } },
  });
  return { ok: false, reason: "code" };
}

/**
 * The most recent live challenge for an address, if there is one.
 *
 * The sign-in form uses this to decide whether to ask for a code. Reading the
 * row rather than the thrown error is deliberate: Auth.js normalises what
 * authorize() throws, so anything attached to the error may not survive the
 * round trip — whereas a challenge row only exists when a password has just
 * been accepted, which is exactly the condition being tested.
 */
export async function latestChallengeFor(email: string): Promise<string | null> {
  const challenge = await db.mfaChallenge.findFirst({
    where: {
      consumedAt: null,
      expiresAt: { gt: new Date() },
      user: { email },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return challenge?.id ?? null;
}

/** Housekeeping: challenges are short-lived and there is no reason to keep them. */
export async function sweepExpiredChallenges(): Promise<void> {
  await db.mfaChallenge
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } })
    .catch(() => {});
}
