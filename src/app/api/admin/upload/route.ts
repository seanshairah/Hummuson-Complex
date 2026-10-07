import { NextRequest, NextResponse } from "next/server";
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
/** Decoded formats accepted; anything else is refused whatever it was called. */
const ACCEPTED_FORMATS = new Set(["jpeg", "jpg", "png", "webp", "avif", "gif"]);
/** Longest edge kept. Plenty for a full-page picture in the printed PDF. */
const MAX_EDGE = 2400;

/**
 * Media upload: validates the image, normalises it to WebP, and stores the
 * bytes in the database (MediaFile) next to a Media row, served back by
 * src/app/media-files/[id]/[name]/route.ts.
 *
 * Not the filesystem: the production host is serverless, where a file
 * written under public/ is gone with the instance that wrote it (or refused
 * outright on a read-only disk). A catalogue picture has to outlive that.
 *
 * Re-encoding is also a security step. What gets stored and served is what
 * sharp produced from the decoded pixels — never the uploaded bytes, so no
 * payload smuggled into metadata or trailing data survives, whatever the
 * file was called or claimed to be.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Per signed-in user, not per address: this endpoint stores files, so the
  // limit that matters is on the account doing the storing.
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

  const input = Buffer.from(await file.arrayBuffer());
  let format: string | undefined;
  let output: Buffer;
  let width: number;
  let height: number;
  let blurDataUrl: string;
  try {
    const meta = await sharp(input).metadata();
    format = meta.format;
    if (!format || !ACCEPTED_FORMATS.has(format)) {
      return NextResponse.json({ error: "Unsupported image format" }, { status: 415 });
    }
    const result = await sharp(input)
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
    output = result.data;
    width = result.info.width;
    height = result.info.height;
    const blur = await sharp(output).resize(18, undefined, { fit: "inside" }).webp({ quality: 30 }).toBuffer();
    blurDataUrl = `data:image/webp;base64,${blur.toString("base64")}`;
  } catch {
    return NextResponse.json({ error: "Could not read image" }, { status: 400 });
  }

  const base = slugify(path.basename(file.name, path.extname(file.name))).slice(0, 60) || "upload";
  const filename = `${base}.webp`;

  const media = await db.$transaction(async (tx) => {
    const created = await tx.media.create({
      data: {
        // Placeholder until the id exists to build the address from.
        url: `/media-files/pending-${crypto.randomUUID()}`,
        alt: formData.get("alt")?.toString().slice(0, 300) || null,
        width,
        height,
        blurDataUrl,
        kind: "upload",
        filename,
        sizeBytes: output.length,
        file: { create: { mimeType: "image/webp", data: new Uint8Array(output) } },
      },
    });
    return tx.media.update({
      where: { id: created.id },
      data: { url: `/media-files/${created.id}/${filename}` },
    });
  });

  await writeAuditEvent({
    action: "media.uploaded",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "media",
    entityId: media.id,
    label: media.url,
    requestHeaders: request.headers,
    meta: {
      sizeBytes: file.size,
      storedBytes: output.length,
      declaredType: file.type,
      decodedFormat: format,
    },
  });

  return NextResponse.json({
    id: media.id,
    url: media.url,
    width: media.width,
    height: media.height,
    alt: media.alt,
    blurDataUrl: media.blurDataUrl,
  });
}
