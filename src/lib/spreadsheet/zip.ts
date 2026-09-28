import { inflateRawSync } from "node:zlib";

/**
 * The few bytes of the ZIP container an .xlsx needs.
 *
 * An .xlsx is a ZIP of XML parts, and reading a price sheet means pulling
 * three of them out. The npm options for this are a maintained parser that
 * arrives with 97 transitive packages, or the abandoned `xlsx@0.18.5` that
 * carries open prototype-pollution and ReDoS advisories. Neither is a fair
 * trade for reading a twenty-row spreadsheet, so the container is read here:
 * no dependency, no parser surface beyond what is written below.
 *
 * Only what Excel actually emits is supported — stored and deflated entries,
 * read through the central directory. Anything else (encryption, ZIP64,
 * multi-disk archives, compression methods 1–7) is rejected by name rather
 * than guessed at.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

const STORED = 0;
const DEFLATED = 8;

/** Central-directory record for one file in the archive. */
interface Entry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export class ZipError extends Error {}

/**
 * The end-of-central-directory record is the only fixed anchor in a ZIP, and
 * it sits at the end behind a variable-length comment — so it is found by
 * scanning backwards for its signature rather than by arithmetic.
 */
function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimum = 22;
  if (buffer.length < minimum) throw new ZipError("Not a ZIP archive (too short)");
  // A ZIP comment is at most 65535 bytes, so the record cannot be further back.
  const earliest = Math.max(0, buffer.length - minimum - 0xffff);
  for (let at = buffer.length - minimum; at >= earliest; at--) {
    if (buffer.readUInt32LE(at) === EOCD_SIGNATURE) return at;
  }
  throw new ZipError("Not a ZIP archive (no end-of-central-directory record)");
}

function readCentralDirectory(buffer: Buffer): Map<string, Entry> {
  const eocd = findEndOfCentralDirectory(buffer);
  const count = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);

  // 0xffff / 0xffffffff are the ZIP64 escape values. Excel only writes ZIP64
  // for archives past 4GB, which a price sheet is not, so this is a genuine
  // "that is not the file you think it is" rather than a missing feature.
  if (count === 0xffff || directoryOffset === 0xffffffff) {
    throw new ZipError("ZIP64 archives are not supported");
  }
  if (directoryOffset + directorySize > buffer.length) {
    throw new ZipError("Corrupt ZIP (central directory runs past the end of the file)");
  }

  const entries = new Map<string, Entry>();
  let at = directoryOffset;
  for (let index = 0; index < count; index++) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== CENTRAL_SIGNATURE) {
      throw new ZipError("Corrupt ZIP (bad central directory entry)");
    }
    const flags = buffer.readUInt16LE(at + 8);
    // Bit 0 is the encryption flag. A password-protected workbook decodes to
    // noise otherwise, which would surface as an unhelpful XML error.
    if (flags & 0x1) throw new ZipError("The workbook is password-protected");

    const method = buffer.readUInt16LE(at + 10);
    const compressedSize = buffer.readUInt32LE(at + 20);
    const uncompressedSize = buffer.readUInt32LE(at + 24);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const localHeaderOffset = buffer.readUInt32LE(at + 42);
    const name = buffer.toString("utf8", at + 46, at + 46 + nameLength);

    entries.set(name, { name, method, compressedSize, uncompressedSize, localHeaderOffset });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/**
 * Reads one entry. The local header's name and extra-field lengths are read
 * fresh rather than reused from the central directory — the two are allowed
 * to differ, and trusting the wrong one lands the read at the wrong offset.
 */
function readEntry(buffer: Buffer, entry: Entry, maxUncompressedBytes: number): Buffer {
  const at = entry.localHeaderOffset;
  if (at + 30 > buffer.length || buffer.readUInt32LE(at) !== LOCAL_SIGNATURE) {
    throw new ZipError(`Corrupt ZIP (bad local header for ${entry.name})`);
  }
  if (entry.uncompressedSize > maxUncompressedBytes) {
    throw new ZipError(`${entry.name} is too large to read`);
  }
  const nameLength = buffer.readUInt16LE(at + 26);
  const extraLength = buffer.readUInt16LE(at + 28);
  const start = at + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > buffer.length) throw new ZipError(`Corrupt ZIP (${entry.name} runs past the end)`);

  const raw = buffer.subarray(start, end);
  if (entry.method === STORED) return Buffer.from(raw);
  if (entry.method === DEFLATED) {
    // maxOutputLength makes a zip bomb fail as an error rather than as memory
    // exhaustion. The cap is the caller's, not this file's, so the same reader
    // can serve a 20-row price sheet and a larger export.
    return inflateRawSync(raw, { maxOutputLength: maxUncompressedBytes });
  }
  throw new ZipError(`Unsupported compression method ${entry.method} in ${entry.name}`);
}

export interface ZipArchive {
  /** Entry names, in central-directory order. */
  names(): string[];
  /** Decompressed bytes for one entry, or null when it is not in the archive. */
  read(name: string): Buffer | null;
}

export function openZip(buffer: Buffer, options: { maxEntryBytes?: number } = {}): ZipArchive {
  const maxEntryBytes = options.maxEntryBytes ?? 32 * 1024 * 1024;
  const entries = readCentralDirectory(buffer);
  return {
    names: () => [...entries.keys()],
    read(name) {
      const entry = entries.get(name);
      return entry ? readEntry(buffer, entry, maxEntryBytes) : null;
    },
  };
}
