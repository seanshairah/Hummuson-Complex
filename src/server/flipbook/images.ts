import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/server/db";
import { site } from "@/lib/site";
import { safeImageUrl } from "@/lib/flipbook/schema";

/**
 * Picture bytes for the downloads, which carry their pictures inside the
 * file. Addresses are only ever ones safeImageUrl accepts: a path on this
 * site, or https on one of the image hosts the site already allows.
 */

const MAX_BYTES = 15 * 1024 * 1024;
const PUBLIC_DIR = path.join(process.cwd(), "public");

async function fetchBytes(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "error" });
    if (!response.ok) return null;
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length > MAX_BYTES ? null : bytes;
  } catch {
    return null;
  }
}

async function readBytes(url: string): Promise<Buffer | null> {
  const safe = safeImageUrl(url);
  if (!safe) return null;

  if (!safe.startsWith("/")) return fetchBytes(safe);

  const pathname = safe.split(/[?#]/)[0]!;
  const upload = /^\/media-files\/([A-Za-z0-9_-]{1,40})\//.exec(pathname);
  if (upload) {
    const file = await db.mediaFile.findUnique({
      where: { mediaId: upload[1] },
      select: { data: true },
    });
    return file ? Buffer.from(file.data) : null;
  }

  // Files under public/ ship with the deployment (see outputFileTracingIncludes
  // in next.config.ts); anything that did not is fetched from the site itself.
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const file = path.resolve(PUBLIC_DIR, `.${decoded}`);
  if (file.startsWith(PUBLIC_DIR + path.sep)) {
    try {
      const bytes = await readFile(file);
      if (bytes.length <= MAX_BYTES) return bytes;
    } catch {
      // not on this disk
    }
  }
  return fetchBytes(`${site.url}${pathname}`);
}

export interface PdfPicture {
  data: Buffer;
  format: "jpg" | "png";
  width: number;
  height: number;
}

/**
 * Loads each distinct picture once, a few at a time, and prepares it for one
 * output format. A picture that cannot be read is left out, never fatal.
 */
export async function loadPictures<T>(
  urls: Iterable<string>,
  prepare: (bytes: Buffer) => Promise<T>,
): Promise<Map<string, T>> {
  const unique = [...new Set(urls)].filter(Boolean);
  const result = new Map<string, T>();
  let next = 0;
  const worker = async () => {
    while (next < unique.length) {
      const url = unique[next++]!;
      try {
        const bytes = await readBytes(url);
        if (bytes) result.set(url, await prepare(bytes));
      } catch {
        // unreadable picture: the page draws without it
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, unique.length) }, worker));
  return result;
}

/** JPEG (PNG where there is transparency), sized for print. */
export async function forPdf(bytes: Buffer): Promise<PdfPicture> {
  const image = sharp(bytes, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const resized = image.resize(1600, 1600, { fit: "inside", withoutEnlargement: true });
  if (meta.hasAlpha) {
    const { data, info } = await resized.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
    return { data, format: "png", width: info.width, height: info.height };
  }
  const { data, info } = await resized
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data, format: "jpg", width: info.width, height: info.height };
}

/** A WebP data URI, sized for a screen. */
export async function forHtml(bytes: Buffer): Promise<string> {
  const data = await sharp(bytes, { failOn: "none" })
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 74 })
    .toBuffer();
  return `data:image/webp;base64,${data.toString("base64")}`;
}
