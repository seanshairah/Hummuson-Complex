import { describe, expect, it } from "vitest";
import { filterProducts, type ProductCardData } from "@/server/data/products";

/**
 * The two classification rules this catalogue turns on, and the one that is
 * easiest to get wrong by accident:
 *
 *   - a product belongs to every range its own text supports, and is still one
 *     product — listing it twice in a combined result would be a bug that only
 *     shows up on a page, not in a count;
 *   - a crop group returns everything listed across it, but a single crop
 *     returns only what names that crop. Inheriting downwards would put a
 *     cabbage product in front of a broccoli grower on no evidence at all.
 */

function product(overrides: Partial<ProductCardData> & { slug: string }): ProductCardData {
  return {
    id: overrides.slug,
    name: overrides.slug,
    brand: null,
    tagline: null,
    shortDescription: null,
    categories: [],
    image: null,
    priceUsd: null,
    pricedPackCount: 0,
    packSizes: [],
    cropNames: [],
    cropSlugs: [],
    cropGroupSlugs: [],
    methods: [],
    benefitSlugs: [],
    benefitNames: [],
    stageKeys: [],
    featured: false,
    hasRates: false,
    ...overrides,
  };
}

const CROP_NUTRITION = { name: "Crop Nutrition", slug: "crop-nutrition" };
const LIQUID = { name: "Liquid Foliar Fertilisers", slug: "liquid-fertilisers" };
const MICRO = { name: "Microbiological Fertilisers", slug: "microbiological" };

/** One record, two ranges — the case the single-category column could not hold. */
const npk = product({ slug: "npk", categories: [LIQUID, CROP_NUTRITION] });
const fortik = product({ slug: "fortik", categories: [CROP_NUTRITION] });
const master = product({ slug: "master", categories: [MICRO] });

const catalogue = [npk, fortik, master];

describe("range filtering", () => {
  it("finds a multi-range product under each of its ranges", () => {
    expect(filterProducts(catalogue, { category: "liquid-fertilisers" })).toContain(npk);
    expect(filterProducts(catalogue, { category: "crop-nutrition" })).toContain(npk);
  });

  it("lists it once, not once per range", () => {
    const results = filterProducts(catalogue, { category: "crop-nutrition" });
    expect(results.filter((p) => p.slug === "npk")).toHaveLength(1);
    expect(results.map((p) => p.slug)).toEqual(["npk", "fortik"]);
  });

  it("leaves a product out of a range it does not belong to", () => {
    expect(filterProducts(catalogue, { category: "microbiological" }).map((p) => p.slug)).toEqual([
      "master",
    ]);
  });

  it("resolves the ranges that were renamed, so old links still work", () => {
    // ?category=value and ?category=physio are in bookmarks and old pages; a
    // stale one would otherwise render the whole catalogue and look fine.
    expect(filterProducts(catalogue, { category: "value" }).map((p) => p.slug)).toEqual([
      "npk",
      "fortik",
    ]);
    expect(filterProducts(catalogue, { category: "physio" }).map((p) => p.slug)).toEqual(["master"]);
  });

  it("returns nothing for a range that does not exist", () => {
    expect(filterProducts(catalogue, { category: "no-such-range" })).toHaveLength(0);
  });
});

/** Listed for cabbage only; the group comes along because cabbage is in it. */
const cabbageOnly = product({
  slug: "cabbage-only",
  cropSlugs: ["cabbage"],
  cropGroupSlugs: ["brassicas"],
});
/** Listed for the group in its own text, with no single brassica named. */
const groupOnly = product({ slug: "group-only", cropSlugs: ["brassicas"] });
const maize = product({ slug: "maize-only", cropSlugs: ["maize"], cropGroupSlugs: ["cereals"] });

const cropCatalogue = [cabbageOnly, groupOnly, maize];

describe("crop filtering", () => {
  it("returns everything listed across a group", () => {
    expect(filterProducts(cropCatalogue, { crop: "brassicas" }).map((p) => p.slug)).toEqual([
      "cabbage-only",
      "group-only",
    ]);
  });

  it("returns only what names the single crop", () => {
    expect(filterProducts(cropCatalogue, { crop: "cabbage" }).map((p) => p.slug)).toEqual([
      "cabbage-only",
    ]);
  });

  it("does not spread one brassica's product across the others", () => {
    expect(filterProducts(cropCatalogue, { crop: "broccoli" })).toHaveLength(0);
  });

  it("keeps groups apart", () => {
    expect(filterProducts(cropCatalogue, { crop: "cereals" }).map((p) => p.slug)).toEqual([
      "maize-only",
    ]);
  });

  it("combines with a range filter rather than widening it", () => {
    const both = [
      product({ slug: "in-both", cropSlugs: ["cabbage"], cropGroupSlugs: ["brassicas"], categories: [MICRO] }),
      cabbageOnly,
    ];
    expect(filterProducts(both, { crop: "brassicas", category: "microbiological" }).map((p) => p.slug)).toEqual([
      "in-both",
    ]);
  });
});
