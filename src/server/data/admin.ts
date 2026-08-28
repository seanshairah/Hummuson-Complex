import { db } from "@/server/db";

/** Uncached reads for the admin area (always fresh). */

export async function listAdminProducts(q?: string) {
  return db.product.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: [{ status: "asc" }, { order: "asc" }, { name: "asc" }],
    include: {
      category: true,
      primaryImage: true,
      _count: { select: { crops: true, applicationGuides: true, faqs: true } },
    },
  });
}

export async function getAdminProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      category: true,
      gallery: { orderBy: { order: "asc" } },
      packageSizes: { orderBy: { order: "asc" } },
      applicationGuides: { orderBy: { order: "asc" } },
      crops: true,
      benefits: { orderBy: { order: "asc" } },
      growthStages: true,
      related: { select: { id: true } },
    },
  });
}

export async function getProductFormOptions() {
  const [categories, crops, benefits, stages, media, products] = await Promise.all([
    db.productCategory.findMany({ orderBy: { order: "asc" } }),
    db.crop.findMany({ orderBy: { name: "asc" } }),
    db.benefit.findMany({ orderBy: { order: "asc" } }),
    db.growthStage.findMany({ orderBy: { order: "asc" } }),
    db.media.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    crops: crops.map((c) => ({ id: c.id, name: c.name })),
    benefits: benefits.map((b) => ({ id: b.id, name: b.name })),
    stages: stages.map((s) => ({ id: s.id, name: s.name })),
    media: media.map((m) => ({ id: m.id, url: m.url, alt: m.alt })),
    products,
  };
}
