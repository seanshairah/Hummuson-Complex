import { describe, expect, it } from "vitest";
import { buildCataloguePages } from "@/lib/catalogue-pages";
import type { CatalogueData } from "@/server/data/catalogue";
import type { ProductCardData } from "@/server/data/products";

const product = (name: string): ProductCardData => ({
  id: name,
  slug: name.toLowerCase(),
  name,
  tagline: null,
  shortDescription: null,
  category: null,
  image: null,
  priceUsd: null,
  packSizes: [],
  cropNames: [],
  cropSlugs: [],
  methods: [],
  benefitSlugs: [],
  benefitNames: [],
  stageKeys: [],
  featured: false,
  hasRates: false,
});

const catalogue: CatalogueData = {
  id: "c1",
  title: "Guide",
  slug: "guide",
  year: 2026,
  intro: "intro",
  pdfUrl: null,
  sections: [
    {
      id: "s1",
      title: "Organic",
      slug: "organic",
      intro: null,
      theme: "soil",
      image: null,
      entries: [
        { id: "e1", layout: "FEATURE_LEFT", headline: null, body: null, image: null, product: product("Azofix") },
        { id: "e2", layout: "FEATURE_RIGHT", headline: null, body: null, image: null, product: product("Fosfix") },
      ],
    },
    {
      id: "s2",
      title: "Liquid",
      slug: "liquid",
      intro: null,
      theme: "nutrition",
      image: null,
      entries: [
        { id: "e3", layout: "FEATURE_LEFT", headline: null, body: null, image: null, product: product("IN5") },
      ],
    },
  ],
};

describe("buildCataloguePages", () => {
  const pages = buildCataloguePages(catalogue);

  it("starts with cover and toc", () => {
    expect(pages[0]?.kind).toBe("cover");
    expect(pages[1]?.kind).toBe("toc");
  });

  it("produces an even page count for complete sheets", () => {
    expect(pages.length % 2).toBe(0);
  });

  it("fills the toc with correct chapter page numbers", () => {
    const toc = pages[1];
    if (toc?.kind !== "toc") throw new Error("expected toc");
    expect(toc.entries).toHaveLength(2);
    for (const entry of toc.entries) {
      expect(pages[entry.page]?.kind).toBe("chapter");
    }
  });

  it("keeps every product on its own page after its chapter", () => {
    const chapterIndex = pages.findIndex((page) => page.kind === "chapter");
    const first = pages[chapterIndex + 1];
    expect(first?.kind).toBe("product");
    if (first?.kind === "product") expect(first.product.name).toBe("Azofix");
  });

  it("ends with a back cover", () => {
    expect(pages[pages.length - 1]?.kind).toBe("back");
  });
});
