/**
 * Turning what a spreadsheet says into what the catalogue calls things.
 */

/**
 * Comparison form for a product name: lowercase, unaccented, punctuation and
 * runs of whitespace collapsed to single spaces.
 *
 * "Bigo W", "BIGO w" and "bigo-w" are the same product written by three
 * people, and none of them is wrong.
 */
export function normaliseName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function nameTokens(value: string): string[] {
  return normaliseName(value).split(" ").filter(Boolean);
}

/** Units the catalogue writes, keyed by every spelling a sheet might use. */
const UNIT_ALIASES: Record<string, string> = {
  l: "L",
  lt: "L",
  ltr: "L",
  ltrs: "L",
  litre: "L",
  litres: "L",
  liter: "L",
  liters: "L",
  ml: "ml",
  mls: "ml",
  g: "g",
  gr: "g",
  gm: "g",
  gms: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
};

export interface PackSize {
  /** Catalogue label, e.g. "1 L", "250 g", "80 ml". */
  label: string;
  amount: number;
  unit: string;
}

/**
 * Reads a pack size out of a UNIT cell.
 *
 * The cell is often just a number, because the unit lives in the column
 * header ("UNIT l"). `headerUnit` carries that down so a bare `1` under such
 * a header becomes "1 L" rather than an unlabelled quantity — and so a bare
 * number under a header that says nothing stays unresolved instead of being
 * guessed into litres.
 */
export function parsePackSize(value: unknown, headerUnit?: string | null): PackSize | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === "") return null;

  const match = /^([\d]+(?:[.,]\d+)?)\s*([a-zA-Z]*)/.exec(text);
  if (!match) return null;

  const amount = Number((match[1] ?? "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const written = (match[2] ?? "").toLowerCase();
  const unit = written
    ? UNIT_ALIASES[written]
    : headerUnit
      ? UNIT_ALIASES[headerUnit.toLowerCase()]
      : undefined;
  if (!unit) return null;

  return { label: `${amount} ${unit}`, amount, unit };
}

/** The unit named in a header like "UNIT l", "Size (kg)" or "Pack — ml". */
export function unitFromHeader(header: string): string | null {
  const words = header.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const word of words) {
    if (word === "unit" || word === "size" || word === "pack") continue;
    if (UNIT_ALIASES[word]) return word;
  }
  return null;
}

/**
 * Reads a money cell.
 *
 * Sheets carry prices as numbers, as "$80", as "80.00", and as "1,250". A
 * blank, a dash or a zero all mean "no price here" — a product priced at zero
 * is a listing error, never an offer, and the old site had exactly that on
 * IN5.
 */
export function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;

  const text = String(value).trim();
  if (text === "" || text === "-" || text === "—" || text === "n/a") return null;

  const cleaned = text.replace(/[^0-9.,-]/g, "");
  if (cleaned === "") return null;
  // Thousands separators only; a comma decimal ("1,5") is handled by treating
  // a lone trailing group of one or two digits as the fraction.
  const normalised = /,\d{1,2}$/.test(cleaned)
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/,/g, "");

  const amount = Number(normalised);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}
