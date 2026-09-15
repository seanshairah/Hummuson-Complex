import { openZip, ZipError } from "./zip";

/**
 * Reads the cell values out of an .xlsx workbook.
 *
 * Deliberately narrow: it returns the grid as text and numbers and nothing
 * else. Styles, merges, dates, formulas-as-formulas and charts are all
 * ignored, because the thing on the other end of this is a price list — a
 * header row and some numbers. Formula cells give up their cached result,
 * which is what Excel shows and therefore what the person uploading the file
 * believes it says.
 */

export class XlsxError extends Error {}

export interface Sheet {
  name: string;
  /** Row-major grid. Short rows are not padded; trailing empties are trimmed. */
  rows: (string | number | null)[][];
}

const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function decodeXmlText(value: string): string {
  return value.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|amp|lt|gt|quot|apos);/g, (match, dec, hex) => {
    if (dec) return String.fromCodePoint(Number(dec));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return XML_ENTITIES[match] ?? match;
  });
}

/** Text content of every <t> element inside a fragment, concatenated. */
function textOf(fragment: string): string {
  let out = "";
  let at = 0;
  for (;;) {
    const open = fragment.indexOf("<t", at);
    if (open === -1) break;
    const nextChar = fragment[open + 2];
    // Must be <t> or <t attr…>, not <tableParts> or similar.
    if (nextChar !== ">" && nextChar !== " " && nextChar !== "/") {
      at = open + 2;
      continue;
    }
    const gt = fragment.indexOf(">", open);
    if (gt === -1) break;
    if (fragment[gt - 1] === "/") {
      at = gt + 1;
      continue;
    }
    const close = fragment.indexOf("</t>", gt);
    if (close === -1) break;
    out += decodeXmlText(fragment.slice(gt + 1, close));
    at = close + 4;
  }
  return out;
}

/** Shared strings are stored once and referenced by index from the cells. */
function readSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const strings: string[] = [];
  let at = 0;
  for (;;) {
    const open = xml.indexOf("<si", at);
    if (open === -1) break;
    const gt = xml.indexOf(">", open);
    if (gt === -1) break;
    if (xml[gt - 1] === "/") {
      strings.push("");
      at = gt + 1;
      continue;
    }
    const close = xml.indexOf("</si>", gt);
    if (close === -1) break;
    strings.push(textOf(xml.slice(gt + 1, close)));
    at = close + 5;
  }
  return strings;
}

/** "A" → 0, "Z" → 25, "AA" → 26. The digits of a cell reference are the row. */
function columnIndex(reference: string): number {
  let index = 0;
  for (const character of reference) {
    const code = character.charCodeAt(0);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

function attribute(tag: string, name: string): string | null {
  const key = ` ${name}="`;
  const start = tag.indexOf(key);
  if (start === -1) return null;
  const from = start + key.length;
  const end = tag.indexOf('"', from);
  return end === -1 ? null : tag.slice(from, end);
}

function readSheet(xml: string, shared: string[], name: string): Sheet {
  const rows: (string | number | null)[][] = [];
  let at = 0;
  let autoRow = 0;

  for (;;) {
    const rowOpen = xml.indexOf("<row", at);
    if (rowOpen === -1) break;
    const rowGt = xml.indexOf(">", rowOpen);
    if (rowGt === -1) break;
    const rowTag = xml.slice(rowOpen, rowGt + 1);
    const selfClosing = xml[rowGt - 1] === "/";
    const body = selfClosing
      ? ""
      : (() => {
          const close = xml.indexOf("</row>", rowGt);
          return close === -1 ? "" : xml.slice(rowGt + 1, close);
        })();

    // r= is 1-based and may skip blank rows entirely; without honouring it a
    // gap in the sheet silently shifts every row below it up.
    const declared = Number(attribute(rowTag, "r"));
    const rowIndex = Number.isFinite(declared) && declared > 0 ? declared - 1 : autoRow;
    autoRow = rowIndex + 1;

    const cells: (string | number | null)[] = [];
    let cellAt = 0;
    let autoColumn = 0;
    for (;;) {
      const cellOpen = body.indexOf("<c", cellAt);
      if (cellOpen === -1) break;
      const after = body[cellOpen + 2];
      if (after !== ">" && after !== " " && after !== "/") {
        cellAt = cellOpen + 2;
        continue;
      }
      const cellGt = body.indexOf(">", cellOpen);
      if (cellGt === -1) break;
      const cellTag = body.slice(cellOpen, cellGt + 1);
      const cellSelfClosing = body[cellGt - 1] === "/";
      let inner = "";
      if (!cellSelfClosing) {
        const close = body.indexOf("</c>", cellGt);
        if (close === -1) break;
        inner = body.slice(cellGt + 1, close);
        cellAt = close + 4;
      } else {
        cellAt = cellGt + 1;
      }

      const reference = attribute(cellTag, "r");
      const column = reference ? columnIndex(reference) : autoColumn;
      autoColumn = column + 1;

      const type = attribute(cellTag, "t");
      let value: string | number | null = null;
      if (type === "inlineStr") {
        value = textOf(inner) || null;
      } else {
        const vOpen = inner.indexOf("<v");
        if (vOpen !== -1) {
          const vGt = inner.indexOf(">", vOpen);
          const vClose = inner.indexOf("</v>", vGt);
          if (vGt !== -1 && vClose !== -1) {
            const raw = decodeXmlText(inner.slice(vGt + 1, vClose));
            if (type === "s") {
              const index = Number(raw);
              value = shared[index] ?? null;
            } else if (type === "b") {
              value = raw === "1" ? "TRUE" : "FALSE";
            } else if (type === "e") {
              // An error cell (#REF!, #DIV/0!) is a value the sheet does not
              // have. Reporting it as text keeps it visible in the preview
              // instead of quietly becoming a zero.
              value = raw;
            } else if (type === "str") {
              value = raw;
            } else {
              const numeric = Number(raw);
              value = Number.isFinite(numeric) ? numeric : raw;
            }
          }
        }
      }

      if (column >= 0) cells[column] = value ?? null;
    }

    // Normalise holes left by sparse cells, then trim the trailing run of
    // empties so "how many columns does this row have" means something.
    for (let index = 0; index < cells.length; index++) {
      if (cells[index] === undefined) cells[index] = null;
    }
    while (cells.length > 0 && cells[cells.length - 1] === null) cells.pop();

    rows[rowIndex] = cells;
    at = selfClosing ? rowGt + 1 : xml.indexOf("</row>", rowGt) + 6;
  }

  for (let index = 0; index < rows.length; index++) {
    if (rows[index] === undefined) rows[index] = [];
  }
  while (rows.length > 0 && rows[rows.length - 1]!.length === 0) rows.pop();

  return { name, rows };
}

/** Sheet order and names live in workbook.xml; their files, in its rels. */
function sheetTargets(
  workbookXml: string,
  relsXml: string | null,
): { name: string; path: string }[] {
  const relationships = new Map<string, string>();
  if (relsXml) {
    for (const match of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
      const id = attribute(match[0], "Id");
      const target = attribute(match[0], "Target");
      if (id && target) relationships.set(id, target);
    }
  }

  const sheets: { name: string; path: string }[] = [];
  for (const match of workbookXml.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attribute(match[0], "name") ?? `Sheet${sheets.length + 1}`;
    const id = attribute(match[0], "r:id") ?? attribute(match[0], "id");
    const target = id ? relationships.get(id) : undefined;
    const path = target
      ? target.startsWith("/")
        ? target.slice(1)
        : `xl/${target.replace(/^\.\//, "")}`
      : `xl/worksheets/sheet${sheets.length + 1}.xml`;
    sheets.push({ name: decodeXmlText(name), path });
  }
  return sheets;
}

/**
 * Reads every worksheet in an .xlsx workbook.
 *
 * @throws {XlsxError} when the bytes are not a workbook this can read. The
 * message is written to be shown to whoever uploaded the file.
 */
export function readXlsx(buffer: Buffer): Sheet[] {
  let archive;
  try {
    archive = openZip(buffer);
  } catch (error) {
    if (error instanceof ZipError) {
      throw new XlsxError(
        error.message.startsWith("Not a ZIP")
          ? "That file is not an .xlsx workbook. If it is an older .xls, open it in Excel and save as .xlsx (or as CSV)."
          : error.message,
      );
    }
    throw error;
  }

  const workbookXml = archive.read("xl/workbook.xml")?.toString("utf8");
  if (!workbookXml) {
    throw new XlsxError("That .xlsx file has no workbook part — it may be corrupt.");
  }
  const relsXml = archive.read("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? null;
  const shared = readSharedStrings(archive.read("xl/sharedStrings.xml")?.toString("utf8") ?? null);

  const sheets: Sheet[] = [];
  for (const { name, path } of sheetTargets(workbookXml, relsXml)) {
    const xml = archive.read(path)?.toString("utf8");
    if (xml) sheets.push(readSheet(xml, shared, name));
  }
  if (sheets.length === 0) throw new XlsxError("That workbook has no readable sheets.");
  return sheets;
}
