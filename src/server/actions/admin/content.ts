"use server";

import { PublishStatus, VideoCategory } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { slugify } from "@/lib/utils";
import { parseYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import { sanitizeRichHtml } from "@/lib/sanitize";
import type { AdminActionState } from "@/lib/admin-state";
import {
  formBool,
  formList,
  formOptional,
  formString,
  revalidateContent,
} from "./helpers";

/* ── Categories ─────────────────────────────────────────────────────────── */

export async function saveCategory(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  const id = formOptional(formData, "id");
  const name = formString(formData, "name");
  if (name.length < 2) return { status: "error", fieldErrors: { name: "Name is required" } };
  const slug = formOptional(formData, "slug") ?? slugify(name);
  const data = {
    name,
    slug,
    description: formOptional(formData, "description"),
    order: Number(formString(formData, "order") || 0),
  };
  const clash = await db.productCategory.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { status: "error", fieldErrors: { slug: "Slug already in use" } };
  const saved = id
    ? await db.productCategory.update({ where: { id }, data })
    : await db.productCategory.create({ data });
  revalidateContent("products", "catalogue");
  await audit(id ? "category.updated" : "category.created", {
    entityType: "productCategory",
    entityId: saved.id,
    label: name,
  });
  return { status: "success", message: "Category saved." };
}

export async function deleteCategory(id: string): Promise<{ error?: string } | void> {
  await requireUser();
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) return { error: `This category still has ${count} product(s). Move them first.` };
  const category = await db.productCategory.findUnique({ where: { id }, select: { name: true } });
  await db.productCategory.delete({ where: { id } });
  await audit("category.deleted", {
    entityType: "productCategory",
    entityId: id,
    label: category?.name,
  });
  revalidateContent("products", "catalogue");
}

/* ── Crops ──────────────────────────────────────────────────────────────── */

export async function saveCrop(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  const id = formOptional(formData, "id");
  const name = formString(formData, "name");
  if (name.length < 2) return { status: "error", fieldErrors: { name: "Name is required" } };
  const slug = formOptional(formData, "slug") ?? slugify(name);
  const clash = await db.crop.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { status: "error", fieldErrors: { slug: "Slug already in use" } };
  const data = {
    name,
    slug,
    aka: formList(formData, "aka"),
    description: formOptional(formData, "description"),
    featured: formBool(formData, "featured"),
    imageId: formOptional(formData, "imageId") ?? formList(formData, "galleryIds")[0] ?? null,
  };
  const saved = id
    ? await db.crop.update({ where: { id }, data })
    : await db.crop.create({ data });
  revalidateContent("crops", "products");
  await audit(id ? "crop.updated" : "crop.created", {
    entityType: "crop",
    entityId: saved.id,
    label: name,
  });
  return { status: "success", message: "Crop saved." };
}

export async function deleteCrop(id: string): Promise<{ error?: string } | void> {
  await requireUser();
  const links = await db.productCrop.count({ where: { cropId: id } });
  if (links > 0) return { error: `This crop is linked to ${links} product(s). Unlink them first.` };
  const crop = await db.crop.findUnique({ where: { id }, select: { name: true } });
  await db.crop.delete({ where: { id } });
  await audit("crop.deleted", { entityType: "crop", entityId: id, label: crop?.name });
  revalidateContent("crops", "products");
}

/* ── Testimonials ───────────────────────────────────────────────────────── */

export async function saveTestimonial(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  const id = formOptional(formData, "id");
  const name = formString(formData, "name");
  const quote = formString(formData, "quote");
  if (!name || !quote) {
    return {
      status: "error",
      fieldErrors: {
        ...(name ? {} : { name: "Name is required" }),
        ...(quote ? {} : { quote: "Quote is required" }),
      },
    };
  }
  const data = {
    name,
    quote,
    role: formOptional(formData, "role"),
    location: formOptional(formData, "location"),
    status: (formString(formData, "status") || "PUBLISHED") as PublishStatus,
    order: Number(formString(formData, "order") || 0),
  };
  const saved = id
    ? await db.testimonial.update({ where: { id }, data })
    : await db.testimonial.create({ data });
  revalidateContent("testimonials", "projects");
  await audit(id ? "testimonial.updated" : "testimonial.created", {
    entityType: "testimonial",
    entityId: saved.id,
    label: name,
  });
  return { status: "success", message: "Testimonial saved." };
}

export async function deleteTestimonial(id: string): Promise<void> {
  await requireUser();
  await db.project.updateMany({ where: { testimonialId: id }, data: { testimonialId: null } });
  const testimonial = await db.testimonial.findUnique({ where: { id }, select: { name: true } });
  await db.testimonial.delete({ where: { id } });
  await audit("testimonial.deleted", {
    entityType: "testimonial",
    entityId: id,
    label: testimonial?.name,
  });
  revalidateContent("testimonials", "projects");
}

/* ── Videos ─────────────────────────────────────────────────────────────── */

export async function saveVideo(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  const id = formOptional(formData, "id");
  const url = formString(formData, "youtubeUrl");
  const youtubeId = parseYouTubeId(url);
  if (!youtubeId) {
    return { status: "error", fieldErrors: { youtubeUrl: "Not a recognisable YouTube URL" } };
  }

  // Derive metadata via oEmbed when no title was provided (override allowed).
  let title = formOptional(formData, "title");
  if (!title) {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (response.ok) {
        const meta = (await response.json()) as { title?: string };
        title = meta.title ?? null;
      }
    } catch {
      // Offline or blocked — fall through to manual title requirement.
    }
  }
  if (!title) {
    return {
      status: "error",
      fieldErrors: { title: "Could not fetch the title automatically — please enter it." },
    };
  }

  const clash = await db.video.findFirst({ where: { youtubeId, NOT: id ? { id } : undefined } });
  if (clash) return { status: "error", fieldErrors: { youtubeUrl: "This video is already added" } };

  const data = {
    youtubeId,
    youtubeUrl: url,
    title,
    description: formOptional(formData, "description"),
    thumbnailUrl: youtubeThumbnail(youtubeId),
    category: (formString(formData, "category") || "AGRONOMY_EDUCATION") as VideoCategory,
    featured: formBool(formData, "featured"),
    status: (formString(formData, "status") || "PUBLISHED") as PublishStatus,
    products: { set: formList(formData, "productIds").map((pid) => ({ id: pid })) },
    crops: { set: formList(formData, "cropIds").map((cid) => ({ id: cid })) },
  };
  const saved = id
    ? await db.video.update({ where: { id }, data })
    : await db.video.create({
        data: {
          ...data,
          products: { connect: formList(formData, "productIds").map((pid) => ({ id: pid })) },
          crops: { connect: formList(formData, "cropIds").map((cid) => ({ id: cid })) },
        },
      });
  revalidateContent("videos");
  await audit(id ? "video.updated" : "video.created", {
    entityType: "video",
    entityId: saved.id,
    label: title,
    meta: { youtubeId },
  });
  return { status: "success", message: "Video saved." };
}

export async function deleteVideo(id: string): Promise<void> {
  await requireUser();
  const video = await db.video.findUnique({ where: { id }, select: { title: true } });
  await db.video.delete({ where: { id } });
  await audit("video.deleted", { entityType: "video", entityId: id, label: video?.title });
  revalidateContent("videos");
}

/* ── Projects / results ─────────────────────────────────────────────────── */

export async function saveProject(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();
  const id = formOptional(formData, "id");
  const title = formString(formData, "title");
  if (title.length < 2) return { status: "error", fieldErrors: { title: "Title is required" } };
  const slug = formOptional(formData, "slug") ?? slugify(title);
  const clash = await db.project.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { status: "error", fieldErrors: { slug: "Slug already in use" } };

  const status = (formString(formData, "status") || "DRAFT") as PublishStatus;
  const bodyRaw = formOptional(formData, "bodyHtml");
  const data = {
    title,
    slug,
    status,
    cropId: formOptional(formData, "cropId"),
    location: formOptional(formData, "location"),
    summary: formOptional(formData, "summary"),
    problem: formOptional(formData, "problem"),
    application: formOptional(formData, "application"),
    outcome: formOptional(formData, "outcome"),
    bodyHtml: bodyRaw ? sanitizeRichHtml(bodyRaw) : null,
    testimonialId: formOptional(formData, "testimonialId"),
    publishedAt: status === "PUBLISHED" ? new Date() : undefined,
    products: { set: formList(formData, "productIds").map((pid) => ({ id: pid })) },
  };

  let projectId = id;
  if (id) {
    await db.project.update({ where: { id }, data });
  } else {
    const created = await db.project.create({
      data: {
        ...data,
        products: { connect: formList(formData, "productIds").map((pid) => ({ id: pid })) },
      },
    });
    projectId = created.id;
  }

  const galleryIds = formList(formData, "galleryIds");
  await db.projectImage.deleteMany({ where: { projectId: projectId! } });
  for (const [order, mediaId] of galleryIds.entries()) {
    await db.projectImage.create({ data: { projectId: projectId!, mediaId, order } });
  }

  revalidateContent("projects", "crops");
  await audit(id ? "project.updated" : "project.created", {
    entityType: "project",
    entityId: projectId,
    label: title,
  });
  return { status: "success", message: "Result saved.", createdId: id ? undefined : (projectId ?? undefined) };
}

export async function deleteProject(id: string): Promise<void> {
  await requireUser();
  const project = await db.project.findUnique({ where: { id }, select: { title: true } });
  await db.project.delete({ where: { id } });
  await audit("project.deleted", { entityType: "project", entityId: id, label: project?.title });
  revalidateContent("projects", "crops");
}
