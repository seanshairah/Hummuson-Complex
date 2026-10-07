import type { Cell, Sheet } from "@/lib/spreadsheet";
import type { Layout } from "./columns";
import { nameTokens, normaliseName, parsePackSize, parsePrice, type PackSize } from "./normalise";

/**
 * Turning a parsed sheet into a reviewable plan.
 *
 * The plan never applies itself. Everything below produces a proposal that an
 * admin confirms row by row, and the reason was a row from the March 2026
 * sheet: "Ikar NPK 3-30-0+zn" was the product this catalogue then called IN5,
 * which no string matcher could have worked out. That product was renamed to
 * "iN5 NPK 3-30-0" on 25 Sep 2026, so this particular row is now within reach —
 * but the rule stands, because the next sheet will carry its own name for
 * something. A matcher confident enough to act alone is a matcher confident
 * enough to be wrong alone.
 */

export interface CatalogueProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  packSizes: { size: string; priceUsd: number | null }[];
}

/** How sure we are that a sheet row names this product. */
export type MatchKind = "exact" | "possible" | "none";

/** What applying the row would do. */
export type Effect =
  "update-price" | "add-pack" | "unchanged" | "no-product" | "no-pack" | "no-price";

export interface Candidate {
  id: string;
  name: string;
  brand: string | null;
}

export interface PlannedRow {
  /** 1-based row number as Excel shows it, so the admin can find it. */
  rowNumber: number;
  rawName: string;
  sheetBrand: string | null;
  rawUnit: string | null;
  pack: PackSize | null;
  price: number | null;
  match: MatchKind;
  product: Candidate | null;
  /** Best other guesses, most likely first, for the override picker. */
  alternatives: Candidate[];
  /** Price this pack currently carries, where the pack already exists. */
  currentPrice: number | null;
  effect: Effect;
  /** Why the pack could not be used, where that needs explaining. */
  packNote: string | null;
  /** Set when the sheet's brand disagrees with the catalogue's. */
  brandMismatch: { sheet: string; catalogue: string | null } | null;
}

export interface UnmentionedProduct extends Candidate {
  packSizes: { size: string; priceUsd: number | null }[];
}

export interface ImportPlan {
  sheetName: string;
  priceColumnHeader: string;
  rows: PlannedRow[];
  /** Published products no row in the sheet mentions. */
  unmentioned: UnmentionedProduct[];
}

/** Words that identify nothing on their own. */
const WEAK_TOKENS = new Set([
  "the",
  "and",
  "plus",
  "pro",
  "bio",
  "new",
  "kg",
  "g",
  "l",
  "ml",
  "ltr",
  "litre",
  "pack",
  "size",
]);

/**
 * A token worth matching on.
 *
 * Length is the usual test, and a short token mixing letters and digits is a
 * product code — "A3", "IN5", "K2" — which identifies a product more sharply
 * than any word in its name. A token of digits alone is the opposite: in
 * "NPK 3-30-0+zn" and "NPK 12-11-30+TE" the numbers are the formulation, and
 * both contain "30" while naming completely different products.
 */
function distinctive(tokens: string[]): string[] {
  return tokens.filter((token) => {
    if (WEAK_TOKENS.has(token)) return false;
    if (/^\d+$/.test(token)) return false;
    return token.length >= 3 || /\d/.test(token);
  });
}

/**
 * Whether a name is written as one word or two is a typing habit, not a
 * difference: "CarboAmin", "Carbo Amin" and "Carbo-Amin" are one product.
 */
function condense(value: string): string {
  return normaliseName(value).replace(/ /g, "");
}

/**
 * Row name without a leading brand word, since sheets write the brand in its
 * own column and again at the front of the description about half the time.
 */
function stripBrand(name: string, brand: string | null): string {
  if (!brand) return name;
  const brandTokens = nameTokens(brand);
  const tokens = nameTokens(name);
  let at = 0;
  while (at < tokens.length && at < brandTokens.length && tokens[at] === brandTokens[at]) at++;
  return at > 0 && at < tokens.length ? tokens.slice(at).join(" ") : name;
}

/**
 * A word several products share identifies none of them. "NPK" is in both
 * "NPK 12-11-30+TE" and "Bio NPK Powder S", so a sheet row reading
 * "NPK 3-30-0+zn" has said nothing yet by matching it — and the difference
 * between saying nothing and naming a product is the difference between
 * asking someone and repricing the wrong item.
 */
function buildTokenFrequency(products: CatalogueProduct[]): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const product of products) {
    for (const token of new Set(nameTokens(product.name))) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }
  return frequency;
}

function scoreOverlap(
  rowTokens: string[],
  productTokens: string[],
  frequency: Map<string, number>,
): number {
  const product = new Set(productTokens);
  const shared = rowTokens.filter((token) => product.has(token));
  if (shared.length === 0) return 0;
  const strong = distinctive(shared).filter((token) => (frequency.get(token) ?? 0) <= 1).length;
  // A shared distinctive word is worth far more than a shared "plus".
  return strong * 10 + shared.length;
}

interface Matcher {
  find(
    rawName: string,
    brand: string | null,
  ): {
    match: MatchKind;
    product: CatalogueProduct | null;
    alternatives: CatalogueProduct[];
  };
}

function buildMatcher(products: CatalogueProduct[]): Matcher {
  const exact = new Map<string, CatalogueProduct>();
  const frequency = buildTokenFrequency(products);

  // A catalogue name often carries a descriptor the sheet leaves off:
  // "CarboAmin Basal Dressing" against a row that just says "Carbo Amin".
  // Leading-word prefixes catch that. They are offered as possible rather
  // than exact, because dropping words off the end is the admin's call.
  const prefixes = new Map<string, CatalogueProduct[]>();

  for (const product of products) {
    // "Humuson Grow Plus" in a sheet, "Grow Plus" in the catalogue.
    const withoutBrand = stripBrand(product.name, product.brand);
    for (const key of [
      normaliseName(product.name),
      normaliseName(product.slug),
      normaliseName(withoutBrand),
      condense(product.name),
      condense(withoutBrand),
    ]) {
      if (key && !exact.has(key)) exact.set(key, product);
    }

    const tokens = nameTokens(withoutBrand);
    for (let take = 1; take < tokens.length; take++) {
      const key = tokens.slice(0, take).join("");
      if (key.length < 4) continue;
      prefixes.set(key, [...(prefixes.get(key) ?? []), product]);
    }
  }

  return {
    find(rawName, brand) {
      const withoutBrand = stripBrand(rawName, brand);
      const forms = [
        normaliseName(rawName),
        normaliseName(withoutBrand),
        condense(rawName),
        condense(withoutBrand),
      ];
      for (const form of forms) {
        const hit = form ? exact.get(form) : undefined;
        if (hit) return { match: "exact", product: hit, alternatives: [] };
      }

      for (const form of [forms[2], forms[3]]) {
        const claimants = form ? prefixes.get(form) : undefined;
        // A prefix two products share has picked neither of them.
        if (claimants?.length === 1) {
          return { match: "possible", product: claimants[0]!, alternatives: claimants };
        }
      }

      const rowTokens = nameTokens(forms[1] || forms[0] || "");
      const ranked = products
        .map((product) => ({
          product,
          score: scoreOverlap(rowTokens, nameTokens(product.name), frequency),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

      const best = ranked[0];
      if (!best) return { match: "none", product: null, alternatives: [] };

      // A single distinctive word in common is a lead, not a conclusion. It is
      // offered as "possible" and stays unapplied until someone confirms it.
      const runnerUp = ranked[1];
      const decisive = best.score >= 10 && (!runnerUp || best.score > runnerUp.score);
      return {
        match: decisive ? "possible" : "none",
        product: decisive ? best.product : null,
        alternatives: ranked.slice(0, 6).map((entry) => entry.product),
      };
    },
  };
}

const toCandidate = (product: CatalogueProduct): Candidate => ({
  id: product.id,
  name: product.name,
  brand: product.brand,
});

/**
 * The pack on this product that the sheet's pack refers to.
 *
 * Catalogue labels carry usage with them — "80 ml sachet (per 16 L knapsack)"
 * — while a sheet says "80ml". Comparing the quantity they both parse to
 * finds the pack; comparing the strings would add a second 80 ml alongside
 * the first.
 */
function findExistingPack(
  product: CatalogueProduct,
  pack: PackSize,
): { size: string; priceUsd: number | null } | undefined {
  return product.packSizes.find((existing) => {
    if (normaliseName(existing.size) === normaliseName(pack.label)) return true;
    const parsed = parsePackSize(existing.size);
    return parsed?.amount === pack.amount && parsed.unit === pack.unit;
  });
}

/**
 * A pack of the same quantity in a different unit, which is what a
 * misread header looks like from here: the March 2026 sheet lists CarboAmin's
 * sachet as "160" under a column headed "UNIT l", and 160 litres of a
 * 160 ml sachet is not a pack size anyone sells.
 */
function conflictingUnit(product: CatalogueProduct, pack: PackSize) {
  return product.packSizes.find((existing) => {
    const parsed = parsePackSize(existing.size);
    return parsed?.amount === pack.amount && parsed.unit !== pack.unit;
  });
}

function cellText(cells: Cell[], index: number | null): string | null {
  if (index === null || index < 0) return null;
  const value = cells[index];
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

/**
 * Builds the plan for one sheet against the current catalogue.
 *
 * @param priceColumn index of the column to publish. The caller passes the
 * admin's choice; `layout.defaultPriceColumn` is only the opening suggestion.
 */
export function buildPlan(
  sheet: Sheet,
  layout: Layout,
  products: CatalogueProduct[],
  priceColumn: number,
): ImportPlan {
  const matcher = buildMatcher(products);
  const byId = new Map(products.map((product) => [product.id, product]));
  const rows: PlannedRow[] = [];
  const seen = new Set<string>();

  for (let index = layout.headerRow + 1; index < sheet.rows.length; index++) {
    const cells = sheet.rows[index] ?? [];
    const rawName = cellText(cells, layout.nameColumn);
    if (!rawName) continue;

    const sheetBrand = cellText(cells, layout.brandColumn);
    const rawUnit = cellText(cells, layout.unitColumn);
    const pack = parsePackSize(rawUnit, layout.unitFromHeader);
    const price = parsePrice(cells[priceColumn] ?? null);

    const { match, product, alternatives } = matcher.find(rawName, sheetBrand);
    if (product) seen.add(product.id);

    const existingPack = product && pack ? findExistingPack(product, pack) : undefined;
    const currentPrice = existingPack?.priceUsd ?? null;

    // The unit was inferred from the column header whenever the cell itself
    // carried no letters, and an inference is only as good as the header.
    const unitInferred = Boolean(pack && rawUnit && !/[a-z]/i.test(rawUnit));
    const clash =
      product && pack && unitInferred && !existingPack ? conflictingUnit(product, pack) : undefined;

    let effect: Effect;
    let packNote: string | null = null;
    if (!product) effect = "no-product";
    else if (price === null) effect = "no-price";
    else if (!pack) {
      effect = "no-pack";
      packNote = rawUnit
        ? `"${rawUnit}" has no unit, and the column header does not supply one.`
        : "This row states no pack size.";
    } else if (clash) {
      effect = "no-pack";
      packNote = `The sheet reads ${pack.label} from a header in ${pack.unit}, but this product has a ${clash.size}. Confirm which is meant.`;
    } else if (!existingPack) effect = "add-pack";
    else if (currentPrice === price) effect = "unchanged";
    else effect = "update-price";

    rows.push({
      rowNumber: index + 1,
      rawName,
      sheetBrand,
      rawUnit,
      pack,
      price,
      match,
      product: product ? toCandidate(product) : null,
      alternatives: alternatives.map(toCandidate),
      currentPrice,
      effect,
      packNote,
      brandMismatch:
        product && sheetBrand && normaliseName(sheetBrand) !== normaliseName(product.brand ?? "")
          ? { sheet: sheetBrand, catalogue: product.brand }
          : null,
    });
  }

  // The products the sheet says nothing about are the point of this section.
  // Bacto-K sat at a legacy $150 for a year because nothing ever listed what
  // a price update had failed to cover.
  const unmentioned = products
    .filter((product) => !seen.has(product.id))
    .map((product) => ({ ...toCandidate(product), packSizes: byId.get(product.id)!.packSizes }));

  const header = layout.headers[priceColumn] ?? `Column ${priceColumn + 1}`;
  return { sheetName: sheet.name, priceColumnHeader: header, rows, unmentioned };
}
