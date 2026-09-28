import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv, readWorkbook, XlsxError, type Cell, type Sheet } from "@/lib/spreadsheet";
import { detectLayout } from "@/lib/price-import/columns";
import { buildPlan, type CatalogueProduct } from "@/lib/price-import/plan";
import { parsePackSize, parsePrice, unitFromHeader } from "@/lib/price-import/normalise";

const fixture = () => readFileSync(path.join(process.cwd(), "tests/fixtures/price-list.xlsx"));

/** The fixture has exactly one sheet; `noUncheckedIndexedAccess` wants it said. */
const firstSheet = () => readWorkbook(fixture()).sheets[0]!;
const row = (sheet: Sheet, index: number): Cell[] => sheet.rows[index]!;

/** A slice of the real catalogue, including the names that caused trouble. */
const catalogue: CatalogueProduct[] = [
  {
    id: "p1",
    name: "Silicare",
    slug: "silicare",
    brand: "IKAR",
    packSizes: [
      { size: "1 L", priceUsd: 15 },
      { size: "5 L", priceUsd: 69 },
    ],
  },
  {
    id: "p2",
    name: "Bigo W",
    slug: "bigo-w",
    brand: "IKAR",
    packSizes: [{ size: "1 L", priceUsd: 27 }],
  },
  {
    id: "p3",
    name: "IN5",
    slug: "in5",
    brand: "IKAR",
    packSizes: [{ size: "1 L", priceUsd: null }],
  },
  {
    id: "p4",
    name: "A3 Biostimulant",
    slug: "a3-biostimulant",
    brand: "Arvensis Agro",
    packSizes: [{ size: "1 kg", priceUsd: 35 }],
  },
  {
    id: "p5",
    name: "CarboAmin",
    slug: "carboamin-basal-dressing",
    brand: "Sapropel Organics",
    packSizes: [{ size: "160 ml", priceUsd: 3 }],
  },
  {
    id: "p6",
    name: "Grow Plus",
    slug: "grow-top-dressing",
    brand: "Sapropel Organics",
    packSizes: [{ size: "80 ml", priceUsd: 3 }],
  },
  {
    id: "p7",
    name: "Master",
    slug: "master",
    brand: "Bio Energy",
    packSizes: [{ size: "5 L", priceUsd: 150 }],
  },
];

describe("spreadsheet reading", () => {
  it("reads an .xlsx through the zip container", () => {
    const workbook = readWorkbook(fixture());
    expect(workbook.kind).toBe("xlsx");
    expect(workbook.sheets).toHaveLength(1);
    expect(workbook.sheets[0]!.name).toBe("Price List");
  });

  it("keeps blank rows in place so the rows below do not shift up", () => {
    const sheet = firstSheet();
    expect(row(sheet, 0)).toEqual([]);
    expect(row(sheet, 1)[0]).toBe("Price List  March 2026");
    expect(row(sheet, 2)).toEqual([]);
    expect(row(sheet, 3)).toEqual(["ITEM", "DESCRIPTION", "UNIT l", "retail", "Whole sale"]);
  });

  it("keeps numbers as numbers and shared strings as text", () => {
    const sheet = firstSheet();
    expect(row(sheet, 4)).toEqual(["Ikar", "Silicare", 1, 20, 17]);
    expect(row(sheet, 8)).toEqual(["Humuson", "Carbo Amin", 2.5, 37, 32]);
  });

  it("decides the format from the bytes, not the filename", () => {
    // A .csv is not a ZIP, so it must not reach the xlsx reader at all.
    const workbook = readWorkbook(Buffer.from("a,b\n1,2\n", "utf8"));
    expect(workbook.kind).toBe("csv");
  });

  it("names the problem when given a legacy .xls", () => {
    const ole = Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.alloc(64),
    ]);
    expect(() => readWorkbook(ole)).toThrow(XlsxError);
    expect(() => readWorkbook(ole)).toThrow(/older \.xls/i);
  });

  it("refuses a truncated zip rather than returning half a sheet", () => {
    expect(() => readWorkbook(fixture().subarray(0, 400))).toThrow(XlsxError);
  });
});

describe("csv parsing", () => {
  it("handles quotes, embedded commas and CRLF", () => {
    const rows = parseCsv('name,note\r\n"Bigo W","1 L, 5 L"\r\n');
    expect(rows).toEqual([
      ["name", "note"],
      ["Bigo W", "1 L, 5 L"],
    ]);
  });

  it("follows the locale separator Excel used", () => {
    expect(parseCsv("name;price\nSilicare;20\n")).toEqual([
      ["name", "price"],
      ["Silicare", 20],
    ]);
  });

  it("strips the BOM Excel writes, so the first header still matches", () => {
    const rows = parseCsv("﻿ITEM,retail\nSilicare,20\n");
    expect(rows[0]![0]).toBe("ITEM");
  });
});

describe("cell readers", () => {
  it("reads a pack size, taking the unit from the header when the cell omits it", () => {
    expect(parsePackSize(1, "l")).toEqual({ label: "1 L", amount: 1, unit: "L" });
    expect(parsePackSize("1kg")).toEqual({ label: "1 kg", amount: 1, unit: "kg" });
    expect(parsePackSize("80ml")).toEqual({ label: "80 ml", amount: 80, unit: "ml" });
    expect(parsePackSize(2.5, "l")?.label).toBe("2.5 L");
  });

  it("leaves a bare number unresolved when nothing states the unit", () => {
    expect(parsePackSize(5, null)).toBeNull();
  });

  it("reads the unit out of a header like 'UNIT l'", () => {
    expect(unitFromHeader("UNIT l")).toBe("l");
    expect(unitFromHeader("Size (kg)")).toBe("kg");
    expect(unitFromHeader("Pack")).toBeNull();
  });

  it("treats zero, blank and dash as no price rather than as free", () => {
    expect(parsePrice(0)).toBeNull();
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("-")).toBeNull();
    expect(parsePrice("$80")).toBe(80);
    expect(parsePrice("1,250")).toBe(1250);
  });
});

describe("column detection", () => {
  it("finds a header row that is not the first row", () => {
    const sheet = firstSheet();
    const layout = detectLayout(sheet.rows)!;
    expect(layout.headerRow).toBe(3);
  });

  it("reads ITEM as the brand when DESCRIPTION is also present", () => {
    const sheet = firstSheet();
    const layout = detectLayout(sheet.rows)!;
    expect(layout.nameColumn).toBe(1);
    expect(layout.brandColumn).toBe(0);
    expect(layout.unitColumn).toBe(2);
    expect(layout.unitFromHeader).toBe("l");
  });

  it("reads ITEM as the product name when there is no DESCRIPTION", () => {
    const layout = detectLayout([
      ["ITEM", "UNIT", "Price"],
      ["Silicare", "1 L", 20],
    ])!;
    expect(layout.nameColumn).toBe(0);
    expect(layout.brandColumn).toBeNull();
  });

  it("defaults to the retail column, never the wholesale one", () => {
    const sheet = firstSheet();
    const layout = detectLayout(sheet.rows)!;
    expect(layout.priceColumns.map((column) => column.header)).toEqual(["retail", "Whole sale"]);
    expect(layout.defaultPriceColumn).toBe(3);
  });

  it("says so when no row looks like a header", () => {
    expect(
      detectLayout([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toBeNull();
  });
});

describe("import plan", () => {
  const plan = () => {
    const sheet = firstSheet();
    const layout = detectLayout(sheet.rows)!;
    return buildPlan(sheet, layout, catalogue, layout.defaultPriceColumn!);
  };

  it("matches on the name alone when the brand sits in its own column", () => {
    const row = plan().rows.find((entry) => entry.rawName === "Silicare")!;
    expect(row.match).toBe("exact");
    expect(row.product?.id).toBe("p1");
    expect(row.pack?.label).toBe("1 L");
    expect(row.currentPrice).toBe(15);
    expect(row.price).toBe(20);
    expect(row.effect).toBe("update-price");
  });

  it("reports a price that already matches as unchanged, not as an edit", () => {
    const row = plan().rows.find((entry) => entry.rawName === "Bigo W")!;
    expect(row.effect).toBe("unchanged");
  });

  it("refuses to guess IN5 from 'NPK 3-30-0+zn'", () => {
    const row = plan().rows.find((entry) => entry.rawName === "NPK 3-30-0+zn")!;
    expect(row.match).toBe("none");
    expect(row.product).toBeNull();
    expect(row.effect).toBe("no-product");
  });

  it("matches a misspelling on its distinctive word, but only as possible", () => {
    // The sheet says "A3 biostimuant"; the catalogue says "A3 Biostimulant".
    const row = plan().rows.find((entry) => entry.rawName === "A3 biostimuant")!;
    expect(row.match).toBe("possible");
    expect(row.product?.id).toBe("p4");
  });

  it("adds a pack the product does not have yet rather than repricing another", () => {
    const row = plan().rows.find((entry) => entry.rawName === "Carbo Amin")!;
    expect(row.pack?.label).toBe("2.5 L");
    expect(row.effect).toBe("add-pack");
    expect(row.currentPrice).toBeNull();
  });

  it("treats one word and two as the same name", () => {
    // The sheet writes "Carbo Amin"; the catalogue record is "CarboAmin".
    const row = plan().rows.find((entry) => entry.rawName === "Carbo Amin")!;
    expect(row.match).toBe("exact");
    expect(row.product?.id).toBe("p5");
  });

  it("matches on a short product code, which length alone would discard", () => {
    // "A3" is two characters and identifies the product better than any word
    // in its name; "biostimuant" is a typo for "Biostimulant" and matches
    // nothing.
    const row = plan().rows.find((entry) => entry.rawName === "A3 biostimuant")!;
    expect(row.product?.id).toBe("p4");
  });

  it("flags a brand the sheet disagrees with instead of overwriting it", () => {
    const row = plan().rows.find((entry) => entry.rawName === "Grow plus")!;
    expect(row.brandMismatch).toEqual({ sheet: "Humuson", catalogue: "Sapropel Organics" });
  });

  it("will not match on a word several products share", () => {
    // Against the real catalogue "NPK 3-30-0+zn" scored a decisive match on
    // "NPK" and proposed repricing NPK 12-11-30+TE from $18 to $16.
    const withNpk = [
      ...catalogue,
      {
        id: "p8",
        name: "NPK 12-11-30+TE",
        slug: "npk-12-11-30-te",
        brand: "IKAR",
        packSizes: [{ size: "1 L", priceUsd: 18 }],
      },
      {
        id: "p9",
        name: "Bio NPK Powder S",
        slug: "bio-npk-powder-s",
        brand: "Nando",
        packSizes: [],
      },
    ];
    const sheet = firstSheet();
    const layout = detectLayout(sheet.rows)!;
    const result = buildPlan(sheet, layout, withNpk, layout.defaultPriceColumn!);
    const npkRow = result.rows.find((entry) => entry.rawName === "NPK 3-30-0+zn")!;
    expect(npkRow.match).toBe("none");
    expect(npkRow.product).toBeNull();
  });

  it("finds a pack by its quantity, not by its label", () => {
    // The catalogue writes usage into the label; the sheet writes "80ml".
    const labelled: CatalogueProduct[] = [
      {
        id: "p6",
        name: "Grow Plus",
        slug: "grow-top-dressing",
        brand: "Sapropel Organics",
        packSizes: [{ size: "80 ml sachet (per 16 L knapsack)", priceUsd: 3 }],
      },
    ];
    const sheet = firstSheet();
    const layout = detectLayout(sheet.rows)!;
    const result = buildPlan(sheet, layout, labelled, layout.defaultPriceColumn!);
    const row80 = result.rows.find((entry) => entry.rawUnit === "80ml")!;
    expect(row80.effect).toBe("unchanged");
    expect(row80.currentPrice).toBe(3);
  });

  it("stops when a header-inferred unit contradicts the product's own pack", () => {
    // "160" under a column headed "UNIT l" reads as 160 litres of a sachet.
    const sachet: CatalogueProduct[] = [
      {
        id: "p5",
        name: "Carbo Amin",
        slug: "carboamin",
        brand: "Sapropel Organics",
        packSizes: [{ size: "160 ml sachet", priceUsd: 3 }],
      },
    ];
    const rows = parseCsv("ITEM,DESCRIPTION,UNIT l,retail\nHumuson,Carbo Amin,160,3\n");
    const layout = detectLayout(rows)!;
    const result = buildPlan({ name: "s", rows }, layout, sachet, layout.defaultPriceColumn!);
    expect(result.rows[0]!.effect).toBe("no-pack");
    expect(result.rows[0]!.packNote).toMatch(/160 ml sachet/);
  });

  it("lists the products the sheet never mentions", () => {
    const names = plan().unmentioned.map((product) => product.name);
    expect(names).toContain("Master");
    expect(names).not.toContain("Silicare");
  });

  it("publishes the wholesale column only when explicitly asked for it", () => {
    const sheet = firstSheet();
    const layout = detectLayout(sheet.rows)!;
    const wholesale = buildPlan(sheet, layout, catalogue, 4);
    const row = wholesale.rows.find((entry) => entry.rawName === "Silicare")!;
    expect(row.price).toBe(17);
    expect(wholesale.priceColumnHeader).toBe("Whole sale");
  });
});
