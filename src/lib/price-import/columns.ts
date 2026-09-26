import type { Cell } from "@/lib/spreadsheet";
import { normaliseName, unitFromHeader } from "./normalise";

/**
 * Working out which column is which.
 *
 * Price sheets are written for people, so the header is wherever the person
 * put it — often below a title row and a blank line — and the columns are
 * named in whatever words they reached for. Everything detected here is shown
 * back to the admin and can be overridden, because a wrong guess about which
 * column holds the retail price is the kind of mistake that reprices a
 * catalogue at cost.
 */

export interface PriceColumn {
  index: number;
  header: string;
  /** True when the header names it as retail — the column to publish. */
  retail: boolean;
  /** True when the header names it as trade/wholesale — the one not to. */
  wholesale: boolean;
}

export interface Layout {
  /** 0-based index of the header row within the sheet. */
  headerRow: number;
  headers: string[];
  nameColumn: number;
  brandColumn: number | null;
  unitColumn: number | null;
  /** Unit implied by the UNIT header itself, e.g. "l" in "UNIT l". */
  unitFromHeader: string | null;
  priceColumns: PriceColumn[];
  /** The price column to use unless the admin picks another. */
  defaultPriceColumn: number | null;
}

const NAME_WORDS = ["description", "product", "item name", "name", "item"];
const BRAND_WORDS = ["brand", "supplier", "range", "manufacturer", "item"];
const UNIT_WORDS = ["unit", "size", "pack", "packing", "volume", "quantity", "qty"];
const RETAIL_WORDS = ["retail", "rrp", "selling", "list price", "srp"];
const WHOLESALE_WORDS = ["wholesale", "whole sale", "trade", "distributor", "dealer", "bulk"];
const PRICE_WORDS = ["price", "cost", "usd", "amount", ...RETAIL_WORDS, ...WHOLESALE_WORDS];

const includesAny = (value: string, words: string[]) => words.some((word) => value.includes(word));

function scoreAsHeader(cells: Cell[]): number {
  const headers = cells.map((cell) => normaliseName(String(cell ?? "")));
  const filled = headers.filter(Boolean).length;
  if (filled < 2) return 0;

  let score = 0;
  if (headers.some((header) => includesAny(header, NAME_WORDS))) score += 2;
  if (headers.some((header) => includesAny(header, PRICE_WORDS))) score += 3;
  if (headers.some((header) => includesAny(header, UNIT_WORDS))) score += 1;
  // A header row is words. A data row that happens to sit at the top is
  // mostly numbers, and would otherwise win on a lucky keyword.
  const numeric = cells.filter((cell) => typeof cell === "number").length;
  score -= numeric;
  return score;
}

/**
 * Finds the header row and reads the columns off it.
 *
 * Returns null when nothing in the first rows looks like a header — better to
 * say "I could not find the columns" than to import against row 1 and hope.
 */
export function detectLayout(rows: Cell[][]): Layout | null {
  let bestRow = -1;
  let bestScore = 0;
  const searchDepth = Math.min(rows.length, 15);
  for (let index = 0; index < searchDepth; index++) {
    const score = scoreAsHeader(rows[index] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestRow = index;
    }
  }
  if (bestRow === -1) return null;

  const raw = (rows[bestRow] ?? []).map((cell) => String(cell ?? "").trim());
  const headers = raw.map((header) => normaliseName(header));

  const priceColumns: PriceColumn[] = [];
  headers.forEach((header, index) => {
    if (!header || !includesAny(header, PRICE_WORDS)) return;
    priceColumns.push({
      index,
      header: raw[index] ?? "",
      retail: includesAny(header, RETAIL_WORDS),
      wholesale: includesAny(header, WHOLESALE_WORDS),
    });
  });

  const findColumn = (words: string[], exclude: number[] = []) =>
    headers.findIndex(
      (header, index) => Boolean(header) && !exclude.includes(index) && includesAny(header, words),
    );

  const priceIndexes = priceColumns.map((column) => column.index);
  const unitColumn = findColumn(UNIT_WORDS, priceIndexes);

  // "ITEM" is the ambiguous one: on a sheet that also has DESCRIPTION it is
  // the brand column, and on a sheet without one it is the product name. The
  // narrower word wins, so DESCRIPTION is looked for first.
  const excluded = [...priceIndexes, unitColumn].filter((index) => index >= 0);
  let nameColumn = findColumn(["description", "product", "item name", "name"], excluded);
  let brandColumn = findColumn(
    BRAND_WORDS,
    [...excluded, nameColumn].filter((i) => i >= 0),
  );

  if (nameColumn === -1 && brandColumn !== -1) {
    nameColumn = brandColumn;
    brandColumn = -1;
  }
  if (nameColumn === -1) {
    // No column names itself; fall back to the leftmost mostly-text column.
    nameColumn = headers.findIndex((_, index) => !excluded.includes(index));
  }
  if (nameColumn === -1) return null;

  const retail = priceColumns.find((column) => column.retail && !column.wholesale);
  const neutral = priceColumns.find((column) => !column.wholesale);
  const defaultPriceColumn = (retail ?? neutral ?? priceColumns[0])?.index ?? null;

  return {
    headerRow: bestRow,
    headers: raw,
    nameColumn,
    brandColumn: brandColumn >= 0 ? brandColumn : null,
    unitColumn: unitColumn >= 0 ? unitColumn : null,
    unitFromHeader: unitColumn >= 0 ? unitFromHeader(raw[unitColumn] ?? "") : null,
    priceColumns,
    defaultPriceColumn,
  };
}
