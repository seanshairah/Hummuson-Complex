import { readXlsx, XlsxError, type Sheet } from "./xlsx";

export { XlsxError } from "./xlsx";
export type { Sheet } from "./xlsx";

export type Cell = string | number | null;

/**
 * Excel writes CSV with the list separator from the machine's locale, so the
 * same "Save as CSV" produces commas on one desk and semicolons on another.
 * The delimiter is therefore counted rather than assumed: whichever candidate
 * appears most often outside quotes on the first non-empty line wins.
 */
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const counts = [",", ";", "\t", "|"].map((delimiter) => {
    let count = 0;
    let quoted = false;
    for (let at = 0; at < firstLine.length; at++) {
      const character = firstLine[at];
      if (character === '"') quoted = !quoted;
      else if (!quoted && character === delimiter) count++;
    }
    return { delimiter, count };
  });
  const best = counts.reduce((a, b) => (b.count > a.count ? b : a));
  return best.count > 0 ? best.delimiter : ",";
}

export function parseCsv(text: string): Cell[][] {
  // Excel prefixes a UTF-8 BOM, which would otherwise become part of the
  // first header cell and stop it matching anything.
  const body = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(body);

  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let field = "";
  let quoted = false;
  let touched = false;

  const endField = () => {
    const trimmed = field.trim();
    row.push(trimmed === "" ? null : trimmed);
    field = "";
    touched = true;
  };
  const endRow = () => {
    endField();
    while (row.length > 0 && row[row.length - 1] === null) row.pop();
    rows.push(row);
    row = [];
    touched = false;
  };

  for (let at = 0; at < body.length; at++) {
    const character = body[at];
    if (quoted) {
      if (character === '"') {
        if (body[at + 1] === '"') {
          field += '"';
          at++;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
      touched = true;
    } else if (character === delimiter) {
      endField();
    } else if (character === "\n") {
      endRow();
    } else if (character === "\r") {
      // Swallowed; the \n that follows ends the row.
    } else {
      field += character;
    }
  }
  if (field !== "" || touched || row.length > 0) endRow();
  while (rows.length > 0 && rows[rows.length - 1]!.length === 0) rows.pop();

  // A CSV column of numbers is still a column of numbers once it has been
  // through a text format, and the price columns downstream depend on that.
  return rows.map((cells) =>
    cells.map((cell) => {
      if (typeof cell !== "string") return cell;
      if (!/^-?\d+(\.\d+)?$/.test(cell)) return cell;
      const numeric = Number(cell);
      return Number.isFinite(numeric) ? numeric : cell;
    }),
  );
}

export interface Workbook {
  /** "xlsx" or "csv" — shown back to the admin so a surprise is visible. */
  kind: "xlsx" | "csv";
  sheets: Sheet[];
}

/**
 * Reads an uploaded spreadsheet into sheets of cells.
 *
 * The format is decided by the bytes, not the filename: a .csv renamed .xlsx
 * still reads, and an .xlsx renamed .csv is not fed to the CSV parser as
 * mojibake. `PK\x03\x04` is the ZIP local-header signature every .xlsx starts
 * with.
 */
export function readWorkbook(buffer: Buffer): Workbook {
  const looksZipped =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04;

  if (looksZipped) return { kind: "xlsx", sheets: readXlsx(buffer) };

  const text = buffer.toString("utf8");
  // The legacy .xls binary format is a compound-document, not a ZIP, and is
  // the most likely wrong file to arrive here. Saying so beats a wall of
  // binary parsed as CSV.
  if (buffer.length >= 8 && buffer.readUInt32BE(0) === 0xd0cf11e0) {
    throw new XlsxError(
      "That is an older .xls workbook. Open it in Excel and save as .xlsx or CSV, then upload again.",
    );
  }
  // Text formats do not contain NUL. Anything that does is some other binary
  // arriving with a .csv name, and parsing it would produce nonsense rows
  // rather than an error the admin can act on.
  if (text.includes("\u0000")) {
    throw new XlsxError("That file is not a spreadsheet — upload an .xlsx or a .csv.");
  }
  return { kind: "csv", sheets: [{ name: "Sheet1", rows: parseCsv(text) }] };
}
