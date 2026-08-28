import type { CatalogueData } from "@/server/data/catalogue";
import type { ImageData, ProductCardData } from "@/server/data/products";

/**
 * Flattens a catalogue into an ordered list of flipbook pages. Pure and
 * unit-tested — the flipbook, the mobile swipe view and the PDF exporter all
 * consume the same sequence, so page numbers & deep links stay consistent.
 */

export type CataloguePage =
  | { kind: "cover"; title: string; year: number | null; intro: string | null }
  | { kind: "toc"; entries: { title: string; page: number; slug: string }[] }
  | {
      kind: "chapter";
      number: number;
      title: string;
      intro: string | null;
      theme: string;
      slug: string;
      image: ImageData | null;
      productCount: number;
    }
  | {
      kind: "product";
      product: ProductCardData;
      /** Entry's dedicated catalogue plate when set, else the product hero. */
      image: ImageData | null;
      theme: string;
      chapterTitle: string;
    }
  | { kind: "back"; title: string };

export function buildCataloguePages(catalogue: CatalogueData): CataloguePage[] {
  const pages: CataloguePage[] = [];
  pages.push({
    kind: "cover",
    title: catalogue.title,
    year: catalogue.year,
    intro: catalogue.intro,
  });

  // Reserve slot for TOC (filled after chapter pages are known).
  const tocIndex = pages.length;
  pages.push({ kind: "toc", entries: [] });

  const tocEntries: { title: string; page: number; slug: string }[] = [];

  catalogue.sections.forEach((section, sectionIndex) => {
    const entries = section.entries.filter(
      (entry): entry is (typeof section.entries)[number] & { product: ProductCardData } =>
        Boolean(entry.product),
    );

    tocEntries.push({ title: section.title, page: pages.length, slug: section.slug });
    pages.push({
      kind: "chapter",
      number: sectionIndex + 1,
      title: section.title,
      intro: section.intro,
      theme: section.theme,
      slug: section.slug,
      image: section.image ?? entries[0]?.image ?? entries[0]?.product.image ?? null,
      productCount: entries.length,
    });

    for (const entry of entries) {
      pages.push({
        kind: "product",
        product: entry.product,
        image: entry.image ?? entry.product.image,
        theme: section.theme,
        chapterTitle: section.title,
      });
    }
  });

  pages.push({ kind: "back", title: catalogue.title });

  // Even page count so every sheet has a front and a back.
  if (pages.length % 2 !== 0) {
    pages.splice(pages.length - 1, 0, { kind: "back", title: "" });
  }

  pages[tocIndex] = { kind: "toc", entries: tocEntries };
  return pages;
}
