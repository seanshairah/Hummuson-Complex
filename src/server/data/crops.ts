import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import { getAllProducts, type ImageData, type ProductCardData, filterProducts } from "./products";

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
    const crops = await db.crop.findMany({
      orderBy: [{ featured: "desc" }, { order: "asc" }],
      include: { image: true, _count: { select: { products: true } } },
    });
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
      productCount: crop._count.products,
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
          _count: { select: { products: true } },
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
        productCount: crop._count.products,
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
