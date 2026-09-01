import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { slugify } from "@/lib/utils";
import { rateLimit, tooManyRequests } from "@/server/rate-limit";
import { writeAuditEvent } from "@/server/audit-log";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

/**
 * The extension is decided by what the bytes actually decode to, never by the
 * uploaded filename or its declared type — both are supplied by the client.
 * A file called "logo.jpg.html", or a real PNG named "x.svg", would otherwise
 * be written under public/ with an extension the web server will happily
 * serve as markup.
 */
const EXTENSION_FOR_FORMAT: Record<string, string> = {
  jpeg: ".jpg",
  jpg: ".jpg",
  png: ".png",
  webp: ".webp",
  avif: ".avif",
  gif: ".gif",
};

/**
 * Local media upload driver: stores files under public/uploads and registers
 * a Media row (with dimensions + blur placeholder). On serverless hosting,
 * point uploads at Cloudinary instead — see docs/DEPLOYMENT.md.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Per signed-in user, not per address: this endpoint writes files to disk,
  // so the limit that matters is on the account doing the writing.
  const verdict = await rateLimit(
    [{ name: "upload:user", subject: session.user.id, limit: 60, windowSeconds: 600 }],
    { failOpen: false },
  );
  if (!verdict.allowed) return tooManyRequests(verdict, "Too many uploads — please wait a moment.");

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let width: number | undefined;
  let height: number | undefined;
  let blurDataUrl: string | undefined;
  let format: string | undefined;
  try {
    const image = sharp(buffer);
    const meta = await image.metadata();
    width = meta.width;
    height = meta.height;
    format = meta.format;
    const blur = await image.resize(18, undefined, { fit: "inside" }).webp({ quality: 30 }).toBuffer();
    blurDataUrl = `data:image/webp;base64,${blur.toString("base64")}`;
  } catch {
    return NextResponse.json({ error: "Could not read image" }, { status: 400 });
  }

  // The declared content type got the request this far; the decoded format
  // decides what actually lands on disk. If sharp read something that is not
  // on the list, the file is refused rather than given a guessed extension.
  const extension = format ? EXTENSION_FOR_FORMAT[format] : undefined;
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported image format" },
      { status: 415 },
    );
  }

  const base = slugify(path.basename(file.name, path.extname(file.name))) || "upload";
  const filename = `${base}-${Date.now().toString(36)}${extension}`;
  const year = String(new Date().getFullYear());
  const directory = path.join(process.cwd(), "public", "uploads", year);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);
  const url = `/uploads/${year}/${filename}`;

  const media = await db.media.create({
    data: {
      url,
      alt: formData.get("alt")?.toString().slice(0, 300) || null,
      width,
      height,
      blurDataUrl,
      kind: "upload",
      filename,
      sizeBytes: file.size,
    },
  });

  await writeAuditEvent({
    action: "media.uploaded",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "media",
    entityId: media.id,
    label: media.url,
    requestHeaders: request.headers,
    meta: { sizeBytes: file.size, declaredType: file.type, decodedFormat: format },
  });

  return NextResponse.json({ id: media.id, url: media.url });
}
