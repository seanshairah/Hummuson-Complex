import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import { getAllProducts, type ImageData, type ProductCardData, filterProducts } from "./products";

/**
 * Unique published products per crop slug. Every crop count on the site is
 * derived from this one helper so the homepage, crop cards, crop pages and the
 * product finder can never disagree.
 */
export function countProductsByCropSlug(products: ProductCardData[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const product of products) {
    for (const slug of new Set(product.cropSlugs)) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return counts;
}

export interface CropListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: ImageData | null;
  productCount: number;
  featured: boolean;
}

export const getAllCrops = unstable_cache(
  async (): Promise<CropListItem[]> => {
    const [crops, products] = await Promise.all([
      db.crop.findMany({
        orderBy: [{ featured: "desc" }, { order: "asc" }],
        include: { image: true },
      }),
      getAllProducts(),
    ]);
    // Counts come from the canonical published-product list, never from a raw
    // join-row count — a drafted product must disappear from every count at once.
    const productCounts = countProductsByCropSlug(products);
    return crops.map((crop) => ({
      id: crop.id,
      slug: crop.slug,
      name: crop.name,
      description: crop.description,
      image: crop.image
        ? {
            url: crop.image.url,
            alt: crop.image.alt,
            width: crop.image.width,
            height: crop.image.height,
            blurDataUrl: crop.image.blurDataUrl,
          }
        : null,
      productCount: productCounts.get(crop.slug) ?? 0,
      featured: crop.featured,
    }));
  },
  ["all-crops"],
  { tags: ["crops", "products"], revalidate: 600 },
);

export interface CropDetailData extends CropListItem {
  aka: string[];
  stages: {
    key: string;
    name: string;
    headline: string | null;
    description: string | null;
    products: ProductCardData[];
  }[];
  products: ProductCardData[];
  faqs: { id: string; question: string; answerHtml: string }[];
  articles: { title: string; slug: string; excerpt: string | null }[];
  videos: { youtubeId: string; title: string }[];
  projects: { title: string; slug: string; summary: string | null }[];
}

export const getCropBySlug = (slug: string) =>
  unstable_cache(
    async (): Promise<CropDetailData | null> => {
      const crop = await db.crop.findUnique({
        where: { slug },
        include: {
          image: true,
          stages: { include: { growthStage: true } },
          faqs: { include: { faq: true } },
          articles: {
            where: { status: "PUBLISHED" },
            select: { title: true, slug: true, excerpt: true },
          },
          videos: { where: { status: "PUBLISHED" }, select: { youtubeId: true, title: true } },
          projects: {
            where: { status: "PUBLISHED" },
            select: { title: true, slug: true, summary: true },
          },
        },
      });
      if (!crop) return null;

      const allProducts = await getAllProducts();
      const cropProducts = filterProducts(allProducts, { crop: slug });
      const allStages = await db.growthStage.findMany({ orderBy: { order: "asc" } });
      const narratives = new Map(crop.stages.map((s) => [s.growthStage.key, s]));

      return {
        id: crop.id,
        slug: crop.slug,
        name: crop.name,
        description: crop.description,
        aka: crop.aka,
        image: crop.image
          ? {
              url: crop.image.url,
              alt: crop.image.alt,
              width: crop.image.width,
              height: crop.image.height,
              blurDataUrl: crop.image.blurDataUrl,
            }
          : null,
        productCount: cropProducts.length,
        featured: crop.featured,
        stages: allStages.map((stage) => ({
          key: stage.key,
          name: stage.name,
          headline: narratives.get(stage.key)?.headline ?? null,
          description: narratives.get(stage.key)?.description ?? null,
          products: cropProducts.filter((p) => p.stageKeys.includes(stage.key)),
        })),
        products: cropProducts,
        faqs: crop.faqs
          .filter((f) => f.faq.status === "PUBLISHED")
          .map((f) => ({ id: f.faq.id, question: f.faq.question, answerHtml: f.faq.answerHtml })),
        articles: crop.articles,
        videos: crop.videos,
        projects: crop.projects,
      };
    },
    [`crop-${slug}`],
    { tags: ["crops", "products", "faqs"], revalidate: 600 },
  )();

export async function getCropSlugs(): Promise<string[]> {
  const crops = await getAllCrops();
  return crops.map((c) => c.slug);
}
