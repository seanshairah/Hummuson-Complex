import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Invariants of the content files that a person editing them by hand cannot
 * see, and that fail quietly on the live site rather than loudly in a build.
 *
 * Two families of mistake are covered here:
 *
 *   - a delisting that only half happened — the product is out of the
 *     catalogue but its URL still 404s, or it is recorded as delisted and
 *     still on sale;
 *   - a crop taxonomy that promises something it cannot show — a family that
 *     names a crop as text when that crop actually has a page, or a group that
 *     answers to one of its own members' names.
 */
function content<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), "content", name), "utf8")) as T;
}

interface Product {
  slug: string;
  name: string;
  brand?: string | null;
  suitableCrops?: string[];
}
interface Delisted {
  slug: string;
  name: string;
  delistedOn: string;
  redirectTo?: string;
}
interface Crop {
  slug: string;
  name: string;
  aka?: string[];
  parentSlug?: string;
  alsoIncludes?: string[];
}
interface UrlMapEntry {
  oldUrl: string;
  newPath: string;
  redirect?: boolean;
}

const products = content<Product[]>("products.json");
const delisted = content<Delisted[]>("delisted-products.json");
const crops = content<Crop[]>("crops.json");
const urlMap = content<UrlMapEntry[]>("old-url-map.json");

const productSlugs = new Set(products.map((p) => p.slug));
const cropSlugs = new Set(crops.map((c) => c.slug));

describe("delisted products", () => {
  it("are gone from the catalogue", () => {
    const stillListed = delisted.filter((d) => productSlugs.has(d.slug));
    expect(stillListed.map((d) => d.slug)).toEqual([]);
  });

  it("send their old WordPress URL somewhere that exists", () => {
    // Left pointing at /products/<slug>, the legacy redirect would land on the
    // 404 of a product that has been withdrawn.
    for (const entry of delisted) {
      const legacy = urlMap.filter((u) => u.oldUrl.includes(`/product/${entry.slug}/`));
      for (const row of legacy) {
        expect(row.newPath, `${entry.slug} legacy URL`).not.toContain(`/products/${entry.slug}`);
      }
    }
  });

  it("carry the record a redirect can be built from", () => {
    for (const entry of delisted) {
      expect(entry.slug, "slug").toBeTruthy();
      expect(entry.delistedOn, `${entry.slug} delistedOn`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.redirectTo ?? "/products", `${entry.slug} redirectTo`).toMatch(/^\//);
    }
  });
});

describe("crop taxonomy", () => {
  it("gives every child a parent that exists", () => {
    for (const crop of crops) {
      if (!crop.parentSlug) continue;
      expect(cropSlugs, `${crop.slug} parent`).toContain(crop.parentSlug);
    }
  });

  it("keeps the tree one level deep", () => {
    const parents = new Set(crops.filter((c) => c.parentSlug).map((c) => c.parentSlug!));
    for (const slug of parents) {
      const parent = crops.find((c) => c.slug === slug)!;
      expect(parent.parentSlug, `${slug} is both a parent and a child`).toBeUndefined();
    }
  });

  it("never lets a group answer to one of its own members' names", () => {
    // "cabbage" resolving to the brassica group would put one cabbage product
    // in front of every brassica grower — the exact claim the catalogue is not
    // allowed to make.
    for (const crop of crops) {
      const children = crops.filter((c) => c.parentSlug === crop.slug);
      const aliases = new Set((crop.aka ?? []).map((a) => a.toLowerCase()));
      for (const child of children) {
        expect(aliases, `${crop.slug} aka contains ${child.slug}`).not.toContain(child.slug);
        expect(aliases, `${crop.slug} aka contains ${child.name}`).not.toContain(
          child.name.toLowerCase(),
        );
      }
    }
  });

  it("only lists a crop as text when it has no page of its own", () => {
    // `alsoIncludes` is what the family page prints without a link. A name in
    // there that is also a real crop would be shown as a dead end while a
    // perfectly good page for it exists.
    for (const crop of crops) {
      for (const name of crop.alsoIncludes ?? []) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        expect(cropSlugs, `${crop.slug} lists "${name}" as text`).not.toContain(slug);
      }
    }
  });

  it("does not leave a product pointing at a crop that was removed", () => {
    // Products name crops in prose ("leafy vegetables"), which the importer
    // resolves by slug and then by alias. A crop dropped from the taxonomy with
    // no alias to catch it becomes a new top-level crop on the next import.
    const known = new Set<string>();
    for (const crop of crops) {
      known.add(crop.slug);
      known.add(crop.name.toLowerCase());
      for (const alias of crop.aka ?? []) known.add(alias.toLowerCase());
    }
    const unresolved = new Set<string>();
    for (const product of products) {
      for (const name of product.suitableCrops ?? []) {
        const lower = name.toLowerCase();
        const slug = lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (!known.has(lower) && !known.has(slug)) unresolved.add(name);
      }
    }
    expect([...unresolved]).toEqual([]);
  });
});

describe("stockists", () => {
  interface Distributor {
    name: string;
    slug: string;
    town: string;
    address?: string;
    phones?: string[];
    mapsLat?: number;
    mapsLng?: number;
    sourceNote?: string;
    status?: string;
    verifiedOn?: string;
  }
  const distributors = content<Distributor[]>("distributors.json");

  it("gives every shop a unique slug", () => {
    const slugs = distributors.map((d) => d.slug);
    expect(new Set(slugs).size, slugs.join(", ")).toBe(slugs.length);
  });

  it("never stores half a map pin", () => {
    // One coordinate alone puts a confident pin on the equator.
    for (const shop of distributors) {
      expect(
        typeof shop.mapsLat === "number",
        `${shop.slug} has one coordinate but not the other`,
      ).toBe(typeof shop.mapsLng === "number");
    }
  });

  it("leaves an unknown address blank rather than guessing one", () => {
    for (const shop of distributors) {
      if (shop.address === undefined) continue;
      expect(shop.address.trim(), `${shop.slug} address`).not.toBe("");
    }
  });

  it("records where every row came from", () => {
    // Most of these addresses were transcribed from third-party listings, one
    // of which rates itself "0% accurate". A row with no provenance is a row
    // nobody can check, and a wrong address costs a farmer a wasted drive.
    for (const shop of distributors) {
      expect(shop.sourceNote?.trim(), `${shop.slug} has no sourceNote`).toBeTruthy();
    }
  });

  it("dates every verification it claims", () => {
    for (const shop of distributors) {
      if (!shop.verifiedOn) continue;
      expect(shop.verifiedOn, `${shop.slug} verifiedOn`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // A row cannot be confirmed and addressless at the same time: what would
      // have been confirmed?
      expect(shop.address?.trim(), `${shop.slug} is verified with no address`).toBeTruthy();
    }
  });

  it("never publishes a shop without a name of its own", () => {
    // One source screenshot carried an address and no business name. It is
    // kept as a draft rather than published as "Unnamed".
    for (const shop of distributors) {
      if (/unnamed/i.test(shop.name)) {
        expect(shop.status, `${shop.slug} is published without a real name`).toBe("DRAFT");
      }
    }
  });
});
