import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import type { ImageData, ProductCardData } from "./products";
import { getAllProducts } from "./products";

export interface CatalogueEntryData {
  id: string;
  layout: string;
  headline: string | null;
  body: string | null;
  image: ImageData | null;
  product: ProductCardData | null;
}

export interface CatalogueSectionData {
  id: string;
  title: string;
  slug: string;
  intro: string | null;
  theme: string;
  image: ImageData | null;
  entries: CatalogueEntryData[];
}

export interface CatalogueData {
  id: string;
  title: string;
  slug: string;
  year: number | null;
  intro: string | null;
  pdfUrl: string | null;
  sections: CatalogueSectionData[];
}

const toImage = (media: {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
} | null): ImageData | null =>
  media
    ? {
        url: media.url,
        alt: media.alt,
        width: media.width,
        height: media.height,
        blurDataUrl: media.blurDataUrl,
      }
    : null;

export const getPublishedCatalogue = unstable_cache(
  async (): Promise<CatalogueData | null> => {
    const catalogue = await db.catalogue.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            image: true,
            entries: { orderBy: { order: "asc" }, include: { image: true } },
          },
        },
      },
    });
    if (!catalogue) return null;

    const products = await getAllProducts();
    const productById = new Map(products.map((p) => [p.id, p]));

    return {
      id: catalogue.id,
      title: catalogue.title,
      slug: catalogue.slug,
      year: catalogue.year,
      intro: catalogue.intro,
      pdfUrl: catalogue.pdfUrl,
      sections: catalogue.sections.map((section) => ({
        id: section.id,
        title: section.title,
        slug: section.slug,
        intro: section.intro,
        theme: section.theme ?? "soil",
        image: toImage(section.image),
        entries: section.entries.map((entry) => ({
          id: entry.id,
          layout: entry.layout,
          headline: entry.headline,
          body: entry.body,
          image: toImage(entry.image),
          product: entry.productId ? (productById.get(entry.productId) ?? null) : null,
        })),
      })),
    };
  },
  ["published-catalogue"],
  { tags: ["catalogue", "products"], revalidate: 600 },
);
