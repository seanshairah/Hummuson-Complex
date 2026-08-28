"use server";

import { PublishStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { readingMinutes, slugify } from "@/lib/utils";
import type { AdminActionState } from "@/lib/admin-state";
import { formBool, formList, formOptional, formString, revalidateContent } from "./helpers";

export async function saveArticle(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireUser();
  const id = formOptional(formData, "id");
  const title = formString(formData, "title");
  const bodyHtml = formOptional(formData, "bodyHtml");
  if (title.length < 3) return { status: "error", fieldErrors: { title: "Title is required" } };
  if (!bodyHtml) return { status: "error", fieldErrors: { bodyHtml: "The article needs a body" } };

  const slug = formOptional(formData, "slug") ?? slugify(title);
  const clash = await db.article.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { status: "error", fieldErrors: { slug: "Slug already in use" } };

  const statusInput = formString(formData, "status") || "DRAFT";
  const scheduledAtRaw = formOptional(formData, "scheduledAt");
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;
  const status = statusInput as PublishStatus;

  const clean = sanitizeRichHtml(bodyHtml);
  const data = {
    title,
    slug,
    excerpt: formOptional(formData, "excerpt"),
    bodyHtml: clean,
    status,
    featured: formBool(formData, "featured"),
    readingMinutes: readingMinutes(clean),
    coverImageId: formList(formData, "galleryIds")[0] ?? formOptional(formData, "coverImageId"),
    categoryId: formOptional(formData, "categoryId"),
    tags: formList(formData, "tags"),
    seoTitle: formOptional(formData, "seoTitle"),
    seoDescription: formOptional(formData, "seoDescription"),
    scheduledAt,
    publishedAt: status === "PUBLISHED" ? new Date() : (scheduledAt ?? undefined),
    authorId: user.id,
    products: { set: formList(formData, "productIds").map((pid) => ({ id: pid })) },
    crops: { set: formList(formData, "cropIds").map((cid) => ({ id: cid })) },
  };

  let articleId = id;
  if (id) {
    await db.article.update({ where: { id }, data });
  } else {
    const created = await db.article.create({
      data: {
        ...data,
        products: { connect: formList(formData, "productIds").map((pid) => ({ id: pid })) },
        crops: { connect: formList(formData, "cropIds").map((cid) => ({ id: cid })) },
      },
    });
    articleId = created.id;
  }

  revalidateContent("articles");
  return { status: "success", message: "Article saved.", createdId: id ? undefined : (articleId ?? undefined) };
}

export async function setArticleStatus(id: string, status: PublishStatus): Promise<void> {
  await requireUser();
  await db.article.update({
    where: { id },
    data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined },
  });
  revalidateContent("articles");
}

export async function deleteArticle(id: string): Promise<void> {
  await requireUser();
  await db.article.delete({ where: { id } });
  revalidateContent("articles");
}

export async function saveArticleCategory(name: string): Promise<{ id: string } | { error: string }> {
  await requireUser();
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Name too short" };
  const slug = slugify(trimmed);
  const category = await db.articleCategory.upsert({
    where: { slug },
    update: {},
    create: { name: trimmed, slug },
  });
  revalidateContent("articles");
  return { id: category.id };
}
