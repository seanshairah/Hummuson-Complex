"use server";

import { CatalogueLayout, EnquiryStatus, PublishStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { requireAdmin, requireUser } from "@/server/auth";
import { updateSetting } from "@/server/data/settings";
import { site } from "@/lib/site";
import type { AdminActionState } from "@/lib/admin-state";
import { formList, formOptional, formString, revalidateContent } from "./helpers";

/* ── Enquiries ──────────────────────────────────────────────────────────── */

export async function setEnquiryStatus(id: string, status: EnquiryStatus): Promise<void> {
  await requireUser();
  await db.enquiry.update({ where: { id }, data: { status } });
}

export async function saveEnquiryNotes(id: string, notes: string): Promise<void> {
  await requireUser();
  await db.enquiry.update({ where: { id }, data: { adminNotes: notes.slice(0, 2000) } });
}

export async function deleteEnquiry(id: string): Promise<void> {
  await requireUser();
  await db.enquiry.delete({ where: { id } });
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
  const role = (formString(formData, "role") || "EDITOR") as Role;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: "error", fieldErrors: { email: "Valid email required" } };
  }
  if (name.length < 2) return { status: "error", fieldErrors: { name: "Name is required" } };
  if (!id && password.length < 10) {
    return { status: "error", fieldErrors: { password: "At least 10 characters" } };
  }

  const clash = await db.user.findFirst({ where: { email, NOT: id ? { id } : undefined } });
  if (clash) return { status: "error", fieldErrors: { email: "Email already in use" } };

  if (id) {
    await db.user.update({
      where: { id },
      data: {
        email,
        name,
        role,
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      },
    });
  } else {
    await db.user.create({
      data: { email, name, role, passwordHash: await bcrypt.hash(password, 12) },
    });
  }
  void actor;
  return { status: "success", message: "User saved." };
}

export async function toggleUserActive(id: string): Promise<{ error?: string } | void> {
  const actor = await requireAdmin();
  if (actor.id === id) return { error: "You cannot deactivate your own account." };
  const user = await db.user.findUniqueOrThrow({ where: { id }, select: { active: true } });
  await db.user.update({ where: { id }, data: { active: !user.active } });
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
  revalidateContent("catalogue");
}

export async function setCatalogueEntryLayout(id: string, layout: string): Promise<void> {
  await requireUser();
  if (!(Object.values(CatalogueLayout) as string[]).includes(layout)) return;
  await db.catalogueEntry.update({ where: { id }, data: { layout: layout as CatalogueLayout } });
  revalidateContent("catalogue");
}

export async function removeCatalogueEntry(id: string): Promise<void> {
  await requireUser();
  await db.catalogueEntry.delete({ where: { id } });
  revalidateContent("catalogue");
}

export async function addCatalogueEntry(sectionId: string, productId: string): Promise<void> {
  await requireUser();
  const last = await db.catalogueEntry.findFirst({
    where: { sectionId },
    orderBy: { order: "desc" },
  });
  await db.catalogueEntry.create({
    data: {
      sectionId,
      productId,
      order: (last?.order ?? -1) + 1,
      layout: ((last?.order ?? -1) + 1) % 2 === 0 ? "FEATURE_LEFT" : "FEATURE_RIGHT",
    },
  });
  revalidateContent("catalogue");
}

/* ── Media ──────────────────────────────────────────────────────────────── */

export async function updateMediaAlt(id: string, alt: string): Promise<void> {
  await requireUser();
  await db.media.update({ where: { id }, data: { alt: alt.slice(0, 300) } });
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
  await db.media.delete({ where: { id } });
}
