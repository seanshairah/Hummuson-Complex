import { DESIGN_VERSION, type DesignPage, type FlipbookDesign } from "./model";
import {
  backPage,
  chapterPage,
  contentsPage,
  coverPage,
  productPage,
  stableId,
} from "./templates";

/**
 * Lays the catalogue out from its chapters: cover, contents, and for every
 * range a chapter opener followed by one page per product, then the back
 * cover — the flipbook as it was before it could be designed.
 *
 * This is what the public flipbook shows until a design is published, so it
 * follows the ranges on its own; it is also the designer's "Rebuild from the
 * ranges". Text on the product pages is token-bound, so a product edited in
 * the dashboard reads correctly without rebuilding.
 */

export interface GenerateSection {
  title: string;
  slug: string;
  intro: string | null;
  theme: string;
  image: { url: string; alt: string | null } | null;
  products: { id: string; slug: string; name: string }[];
}

export interface GenerateInput {
  year: number | null;
  sections: GenerateSection[];
}

export function generateDesign(input: GenerateInput): FlipbookDesign {
  const pages: DesignPage[] = [
    coverPage({ id: "cover", year: input.year !== null }),
    contentsPage({ id: "contents" }),
  ];

  for (const section of input.sections) {
    if (section.products.length === 0) continue;
    pages.push(
      chapterPage({
        id: stableId("ch", section.slug),
        title: section.title,
        intro: section.intro,
        theme: section.theme,
        image: section.image,
      }),
    );
    for (const product of section.products) {
      pages.push(
        productPage({
          // A product in two ranges gets a page in each chapter.
          id: stableId("pr", `${section.slug}/${product.slug}`),
          productId: product.id,
          name: product.name,
        }),
      );
    }
  }

  pages.push(backPage({ id: "back" }));
  return { version: DESIGN_VERSION, pages };
}
