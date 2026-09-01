"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { ApplicationMethod, PublishStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";
import type { AdminActionState } from "@/lib/admin-state";
import {
  formBool,
  formList,
  formNumber,
  formOptional,
  formString,
  revalidateContent,
  zodFieldErrors,
} from "./helpers";

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, "Lowercase letters, numbers and dashes only")
    .max(160)
    .optional()
    .or(z.literal("")),
  shortDescription: z.string().trim().max(500).optional().or(z.literal("")),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
});

const PRODUCT_TAGS = ["products", "catalogue", "faqs", "crops"];

export async function saveProduct(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    tagline: formData.get("tagline"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const id = formOptional(formData, "id");
  const slug = parsed.data.slug || slugify(parsed.data.name);
  if (!slug) return { status: "error", message: "A slug could not be derived from the name." };

  const clash = await db.product.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) {
    return { status: "error", fieldErrors: { slug: "Another product already uses this slug." }, message: "Slug already in use." };
  }

  // Paired dynamic rows
  const packSizes = formData.getAll("packSize.size").map((size, i) => ({
    size: String(size).trim(),
    priceUsd: (() => {
      const raw = String(formData.getAll("packSize.price")[i] ?? "").trim();
      const n = Number(raw);
      return raw !== "" && Number.isFinite(n) ? n : null;
    })(),
  })).filter((row) => row.size);

  const guides = formData.getAll("guide.rate").map((rate, i) => ({
    rate: String(rate).trim(),
    unit: String(formData.getAll("guide.unit")[i] ?? "").trim() || null,
    notes: String(formData.getAll("guide.notes")[i] ?? "").trim() || null,
    cropId: String(formData.getAll("guide.cropId")[i] ?? "").trim() || null,
    growthStageId: String(formData.getAll("guide.stageId")[i] ?? "").trim() || null,
  })).filter((row) => row.rate);

  const methods = formList(formData, "methods").filter((m): m is ApplicationMethod =>
    (Object.values(ApplicationMethod) as string[]).includes(m),
  );
  const status = (formString(formData, "status") || "DRAFT") as PublishStatus;

  const galleryIds = formList(formData, "galleryIds");
  const primaryImageId = formOptional(formData, "primaryImageId") ?? galleryIds[0] ?? null;

  const data = {
    name: parsed.data.name,
    slug,
    status,
    featured: formBool(formData, "featured"),
    tagline: parsed.data.tagline || null,
    shortDescription: parsed.data.shortDescription || null,
    descriptionHtml: formOptional(formData, "descriptionHtml")
      ? sanitizeRichHtml(formString(formData, "descriptionHtml"))
      : null,
    operatingPrinciple: formOptional(formData, "operatingPrinciple"),
    instructionsHtml: formOptional(formData, "instructionsHtml")
      ? sanitizeRichHtml(formString(formData, "instructionsHtml"))
      : null,
    composition: formList(formData, "composition"),
    benefitClaims: formList(formData, "benefitClaims"),
    priceUsd: formNumber(formData, "priceUsd"),
    whatsappRef: formOptional(formData, "whatsappRef"),
    applicationMethods: methods,
    categoryId: formOptional(formData, "categoryId"),
    tags: formList(formData, "tags"),
    primaryImageId,
    seoTitle: formOptional(formData, "seoTitle"),
    seoDescription: formOptional(formData, "seoDescription"),
    publishedAt: status === "PUBLISHED" ? new Date() : undefined,
  };

  const cropIds = formList(formData, "cropIds");
  const benefitIds = formList(formData, "benefitIds");
  const stageIds = formList(formData, "stageIds");
  const relatedIds = formList(formData, "relatedIds");

  const product = id
    ? await db.product.update({ where: { id }, data })
    : await db.product.create({ data });

  // Relations — rebuild deterministically.
  await db.productCrop.deleteMany({ where: { productId: product.id } });
  for (const cropId of cropIds) {
    await db.productCrop.create({ data: { productId: product.id, cropId } });
  }
  await db.productBenefit.deleteMany({ where: { productId: product.id } });
  for (const [order, benefitId] of benefitIds.entries()) {
    await db.productBenefit.create({ data: { productId: product.id, benefitId, order } });
  }
  await db.productGrowthStage.deleteMany({ where: { productId: product.id } });
  for (const growthStageId of stageIds) {
    await db.productGrowthStage.create({ data: { productId: product.id, growthStageId } });
  }
  await db.packageSize.deleteMany({ where: { productId: product.id } });
  for (const [order, row] of packSizes.entries()) {
    await db.packageSize.create({ data: { productId: product.id, order, ...row } });
  }
  await db.applicationGuide.deleteMany({ where: { productId: product.id } });
  for (const [order, row] of guides.entries()) {
    await db.applicationGuide.create({ data: { productId: product.id, order, ...row } });
  }
  await db.productImage.deleteMany({ where: { productId: product.id } });
  for (const [order, mediaId] of galleryIds.entries()) {
    await db.productImage.create({ data: { productId: product.id, mediaId, order } });
  }
  await db.product.update({
    where: { id: product.id },
    data: { related: { set: relatedIds.map((relatedId) => ({ id: relatedId })) } },
  });

  revalidateContent(...PRODUCT_TAGS);
  await audit(id ? "product.updated" : "product.created", {
    entityType: "product",
    entityId: product.id,
    label: product.name,
    meta: { status: product.status, slug: product.slug },
  });
  return {
    status: "success",
    message: id ? "Product saved." : "Product created.",
    createdId: id ? undefined : product.id,
  };
}

export async function setProductStatus(id: string, status: PublishStatus): Promise<void> {
  await requireUser();
  const product = await db.product.update({
    where: { id },
    data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined },
    select: { name: true },
  });
  await audit("product.status_changed", {
    entityType: "product",
    entityId: id,
    label: product.name,
    meta: { status },
  });
  revalidateContent(...PRODUCT_TAGS);
}

export async function toggleProductFeatured(id: string): Promise<void> {
  await requireUser();
  const product = await db.product.findUniqueOrThrow({
    where: { id },
    select: { featured: true, name: true },
  });
  await db.product.update({ where: { id }, data: { featured: !product.featured } });
  await audit("product.featured_changed", {
    entityType: "product",
    entityId: id,
    label: product.name,
    meta: { featured: !product.featured },
  });
  revalidateContent(...PRODUCT_TAGS);
}

export async function duplicateProduct(id: string): Promise<void> {
  await requireUser();
  const source = await db.product.findUniqueOrThrow({
    where: { id },
    include: { packageSizes: true, applicationGuides: true, crops: true, benefits: true, growthStages: true, gallery: true },
  });
  let slug = `${source.slug}-copy`;
  let counter = 2;
  while (await db.product.findUnique({ where: { slug } })) {
    slug = `${source.slug}-copy-${counter}`;
    counter += 1;
  }
  const copy = await db.product.create({
    data: {
      name: `${source.name} (copy)`,
      slug,
      status: "DRAFT",
      featured: false,
      tagline: source.tagline,
      shortDescription: source.shortDescription,
      descriptionHtml: source.descriptionHtml,
      operatingPrinciple: source.operatingPrinciple,
      instructionsHtml: source.instructionsHtml,
      composition: source.composition,
      benefitClaims: source.benefitClaims,
      priceUsd: source.priceUsd,
      whatsappRef: source.whatsappRef,
      applicationMethods: source.applicationMethods,
      categoryId: source.categoryId,
      tags: source.tags,
      primaryImageId: source.primaryImageId,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
    },
  });
  for (const row of source.packageSizes) {
    await db.packageSize.create({
      data: { productId: copy.id, size: row.size, priceUsd: row.priceUsd, order: row.order },
    });
  }
  for (const row of source.applicationGuides) {
    await db.applicationGuide.create({
      data: {
        productId: copy.id,
        rate: row.rate,
        unit: row.unit,
        notes: row.notes,
        cropId: row.cropId,
        growthStageId: row.growthStageId,
        method: row.method,
        order: row.order,
      },
    });
  }
  for (const row of source.crops) {
    await db.productCrop.create({ data: { productId: copy.id, cropId: row.cropId } });
  }
  for (const row of source.benefits) {
    await db.productBenefit.create({ data: { productId: copy.id, benefitId: row.benefitId, order: row.order } });
  }
  for (const row of source.growthStages) {
    await db.productGrowthStage.create({ data: { productId: copy.id, growthStageId: row.growthStageId } });
  }
  for (const row of source.gallery) {
    await db.productImage.create({ data: { productId: copy.id, mediaId: row.mediaId, order: row.order } });
  }
  await audit("product.duplicated", {
    entityType: "product",
    entityId: copy.id,
    label: copy.name,
    meta: { copiedFrom: id },
  });
  revalidateContent(...PRODUCT_TAGS);
  redirect(`/admin/products/${copy.id}`);
}

export async function deleteProduct(id: string): Promise<{ error?: string } | void> {
  await requireUser();
  const product = await db.product.findUnique({ where: { id }, select: { name: true } });
  try {
    await db.product.delete({ where: { id } });
  } catch {
    return { error: "Could not delete — the product may be referenced elsewhere. Archive it instead." };
  }
  await audit("product.deleted", { entityType: "product", entityId: id, label: product?.name });
  revalidateContent(...PRODUCT_TAGS);
}
