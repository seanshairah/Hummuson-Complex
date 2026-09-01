"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CatalogueLayout, EnquiryStatus, PublishStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { requireAdmin, requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { updateSetting } from "@/server/data/settings";
import { site } from "@/lib/site";
import type { AdminActionState } from "@/lib/admin-state";
import { formList, formOptional, formString, revalidateContent } from "./helpers";

/* ── Enquiries ──────────────────────────────────────────────────────────── */

export async function setEnquiryStatus(id: string, status: EnquiryStatus): Promise<void> {
  await requireUser();
  await db.enquiry.update({ where: { id }, data: { status } });
  await audit("enquiry.status_changed", { entityType: "enquiry", entityId: id, meta: { status } });
}

export async function saveEnquiryNotes(id: string, notes: string): Promise<void> {
  await requireUser();
  await db.enquiry.update({ where: { id }, data: { adminNotes: notes.slice(0, 2000) } });
  await audit("enquiry.notes_updated", { entityType: "enquiry", entityId: id });
}

export async function deleteEnquiry(id: string): Promise<void> {
  await requireUser();
  const enquiry = await db.enquiry.findUnique({ where: { id }, select: { name: true } });
  await db.enquiry.delete({ where: { id } });
  await audit("enquiry.deleted", { entityType: "enquiry", entityId: id, label: enquiry?.name });
}

/* ── Settings ───────────────────────────────────────────────────────────── */

export async function saveContactSettings(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  await updateSetting("contact", {
    phones: formList(formData, "phones"),
    whatsapp: formString(formData, "whatsapp").replace(/[^0-9]/g, ""),
    whatsappCatalogueUrl:
      formOptional(formData, "whatsappCatalogueUrl") ?? site.whatsappCatalogueUrl,
    emails: formList(formData, "emails"),
    address: formOptional(formData, "address"),
    hours: formOptional(formData, "hours"),
    socials: {
      facebook: formOptional(formData, "facebook"),
      instagram: formOptional(formData, "instagram"),
      youtube: formOptional(formData, "youtube"),
      linkedin: formOptional(formData, "linkedin"),
      twitter: formOptional(formData, "twitter"),
      tiktok: formOptional(formData, "tiktok"),
    },
  });
  revalidateContent("settings");
  await audit("settings.updated", { entityType: "settings", entityId: "contact" });
  return { status: "success", message: "Contact settings saved." };
}

export async function saveCompanySettings(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  const existing = await db.siteSetting.findUnique({ where: { key: "company" } });
  const current = (existing?.value ?? {}) as Record<string, unknown>;
  await updateSetting("company", {
    ...current,
    tagline: formString(formData, "tagline"),
    shortAbout: formString(formData, "shortAbout"),
    about: formString(formData, "about"),
    whyChooseUs: formList(formData, "whyChooseUs"),
    services: formList(formData, "services").map((title) => ({ title })),
  });
  revalidateContent("settings");
  await audit("settings.updated", { entityType: "settings", entityId: "company" });
  return { status: "success", message: "Company settings saved." };
}

/* ── Users ──────────────────────────────────────────────────────────────── */

export async function saveUser(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await requireAdmin();
  const id = formOptional(formData, "id");
  const email = formString(formData, "email").toLowerCase();
  const name = formString(formData, "name");
  const password = formString(formData, "password");

  // Parsed, not cast. The value arrives in a form post, so anything can be in
  // it — an unchecked cast to Role would let a crafted request write a value
  // the enum does not contain, or promote an account by typing "ADMIN" into
  // a field the interface never offers.
  const parsedRole = z.nativeEnum(Role).safeParse(formString(formData, "role") || "EDITOR");
  if (!parsedRole.success) return { status: "error", fieldErrors: { role: "Unknown role" } };
  const role = parsedRole.data;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: "error", fieldErrors: { email: "Valid email required" } };
  }
  if (name.length < 2) return { status: "error", fieldErrors: { name: "Name is required" } };
  // The minimum applies to any password being set, not only at account
  // creation. It was checked on create alone, so the way to give an account a
  // four-character password was to create it properly and then edit it.
  if (!id && !password) {
    return { status: "error", fieldErrors: { password: "A password is required" } };
  }
  if (password && password.length < 10) {
    return { status: "error", fieldErrors: { password: "At least 10 characters" } };
  }

  const clash = await db.user.findFirst({ where: { email, NOT: id ? { id } : undefined } });
  if (clash) return { status: "error", fieldErrors: { email: "Email already in use" } };

  if (id) {
    const before = await db.user.findUniqueOrThrow({ where: { id }, select: { role: true } });
    // A new password or a changed role has to end the sessions issued under
    // the old one. Without this, someone whose password was changed because
    // it leaked stays signed in on the attacker's browser for a week.
    const roleChanged = before.role !== role;
    const invalidatesSessions = Boolean(password) || roleChanged;
    await db.user.update({
      where: { id },
      data: {
        email,
        name,
        role,
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        ...(invalidatesSessions ? { sessionsValidFrom: new Date() } : {}),
      },
    });
    // A privilege change is the single most important line in this log, so it
    // is recorded as its own event rather than buried in an "updated" entry.
    if (roleChanged) {
      await audit("user.role_changed", {
        entityType: "user",
        entityId: id,
        label: email,
        meta: { from: before.role, to: role },
      });
    }
    if (password) {
      await audit("user.password_changed", { entityType: "user", entityId: id, label: email });
    }
    await audit("user.updated", { entityType: "user", entityId: id, label: email });
  } else {
    const created = await db.user.create({
      data: { email, name, role, passwordHash: await bcrypt.hash(password, 12) },
    });
    await audit("user.created", {
      entityType: "user",
      entityId: created.id,
      label: email,
      meta: { role },
    });
  }
  void actor;
  return { status: "success", message: "User saved." };
}

export async function toggleUserActive(id: string): Promise<{ error?: string } | void> {
  const actor = await requireAdmin();
  if (actor.id === id) return { error: "You cannot deactivate your own account." };
  const user = await db.user.findUniqueOrThrow({
    where: { id },
    select: { active: true, email: true },
  });
  await db.user.update({
    where: { id },
    data: {
      active: !user.active,
      // Deactivating has to take the account's live sessions with it —
      // otherwise "deactivated" only means "cannot sign in again".
      ...(user.active ? { sessionsValidFrom: new Date() } : {}),
    },
  });
  await audit(user.active ? "user.deactivated" : "user.reactivated", {
    entityType: "user",
    entityId: id,
    label: user.email,
  });
  // Without this the table keeps showing the state from before the click, so
  // the next click quietly toggles the account back.
  revalidatePath("/admin/users");
}

/**
 * Ends every session for one account without changing anything else about it.
 * The move to reach for when a laptop goes missing or a session is suspected
 * of being shared: the person can sign straight back in, and anyone holding a
 * copy of their token cannot.
 */
export async function revokeUserSessions(id: string): Promise<{ error?: string } | void> {
  await requireAdmin();
  const user = await db.user.update({
    where: { id },
    data: { sessionsValidFrom: new Date() },
    select: { email: true },
  });
  await audit("user.sessions_revoked", { entityType: "user", entityId: id, label: user.email });
  revalidatePath("/admin/users");
}

/* ── Catalogue ──────────────────────────────────────────────────────────── */

export async function saveCatalogueMeta(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  const id = formString(formData, "id");
  await db.catalogue.update({
    where: { id },
    data: {
      title: formString(formData, "title"),
      year: Number(formString(formData, "year")) || null,
      intro: formOptional(formData, "intro"),
      status: (formString(formData, "status") || "PUBLISHED") as PublishStatus,
    },
  });
  revalidateContent("catalogue");
  await audit("catalogue.updated", { entityType: "catalogue", entityId: id });
  return { status: "success", message: "Catalogue saved." };
}

export async function saveCatalogueSection(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  const id = formString(formData, "id");
  await db.catalogueSection.update({
    where: { id },
    data: {
      title: formString(formData, "title"),
      intro: formOptional(formData, "intro"),
      theme: formString(formData, "theme") || "soil",
    },
  });
  revalidateContent("catalogue");
  await audit("catalogue_section.updated", { entityType: "catalogueSection", entityId: id });
  return { status: "success", message: "Chapter saved." };
}

export async function moveCatalogueEntry(id: string, direction: "up" | "down"): Promise<void> {
  await requireUser();
  const entry = await db.catalogueEntry.findUniqueOrThrow({ where: { id } });
  const siblings = await db.catalogueEntry.findMany({
    where: { sectionId: entry.sectionId },
    orderBy: { order: "asc" },
  });
  const index = siblings.findIndex((sibling) => sibling.id === id);
  const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
  if (!swapWith) return;
  await db.$transaction([
    db.catalogueEntry.update({ where: { id: entry.id }, data: { order: swapWith.order } }),
    db.catalogueEntry.update({ where: { id: swapWith.id }, data: { order: entry.order } }),
  ]);
  await audit("catalogue_entry.reordered", {
    entityType: "catalogueEntry",
    entityId: id,
    meta: { direction },
  });
  revalidateContent("catalogue");
}

export async function setCatalogueEntryLayout(id: string, layout: string): Promise<void> {
  await requireUser();
  if (!(Object.values(CatalogueLayout) as string[]).includes(layout)) return;
  await db.catalogueEntry.update({ where: { id }, data: { layout: layout as CatalogueLayout } });
  await audit("catalogue_entry.layout_changed", {
    entityType: "catalogueEntry",
    entityId: id,
    meta: { layout },
  });
  revalidateContent("catalogue");
}

export async function removeCatalogueEntry(id: string): Promise<void> {
  await requireUser();
  await db.catalogueEntry.delete({ where: { id } });
  await audit("catalogue_entry.removed", { entityType: "catalogueEntry", entityId: id });
  revalidateContent("catalogue");
}

export async function addCatalogueEntry(sectionId: string, productId: string): Promise<void> {
  await requireUser();
  const last = await db.catalogueEntry.findFirst({
    where: { sectionId },
    orderBy: { order: "desc" },
  });
  const entry = await db.catalogueEntry.create({
    data: {
      sectionId,
      productId,
      order: (last?.order ?? -1) + 1,
      layout: ((last?.order ?? -1) + 1) % 2 === 0 ? "FEATURE_LEFT" : "FEATURE_RIGHT",
    },
  });
  await audit("catalogue_entry.added", {
    entityType: "catalogueEntry",
    entityId: entry.id,
    meta: { sectionId, productId },
  });
  revalidateContent("catalogue");
}

/* ── Media ──────────────────────────────────────────────────────────────── */

export async function updateMediaAlt(id: string, alt: string): Promise<void> {
  await requireUser();
  await db.media.update({ where: { id }, data: { alt: alt.slice(0, 300) } });
  await audit("media.alt_updated", { entityType: "media", entityId: id });
  revalidateContent("products", "articles", "crops", "projects");
}

export async function deleteMedia(id: string): Promise<{ error?: string } | void> {
  await requireUser();
  const [products, gallery, articles, crops, projectImages] = await Promise.all([
    db.product.count({ where: { primaryImageId: id } }),
    db.productImage.count({ where: { mediaId: id } }),
    db.article.count({ where: { coverImageId: id } }),
    db.crop.count({ where: { imageId: id } }),
    db.projectImage.count({ where: { mediaId: id } }),
  ]);
  const uses = products + gallery + articles + crops + projectImages;
  if (uses > 0)
    return { error: `This file is used in ${uses} place(s). Remove those references first.` };
  const media = await db.media.findUnique({ where: { id }, select: { url: true } });
  await db.media.delete({ where: { id } });
  await audit("media.deleted", { entityType: "media", entityId: id, label: media?.url });
}
