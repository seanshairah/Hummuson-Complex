import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

/**
 * Local media upload driver: stores files under public/uploads and registers
 * a Media row (with dimensions + blur placeholder). On serverless hosting,
 * point uploads at Cloudinary instead — see docs/DEPLOYMENT.md.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let width: number | undefined;
  let height: number | undefined;
  let blurDataUrl: string | undefined;
  try {
    const image = sharp(buffer);
    const meta = await image.metadata();
    width = meta.width;
    height = meta.height;
    const blur = await image.resize(18, undefined, { fit: "inside" }).webp({ quality: 30 }).toBuffer();
    blurDataUrl = `data:image/webp;base64,${blur.toString("base64")}`;
  } catch {
    return NextResponse.json({ error: "Could not read image" }, { status: 400 });
  }

  const extension = path.extname(file.name) || ".jpg";
  const base = slugify(path.basename(file.name, extension)) || "upload";
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

  return NextResponse.json({ id: media.id, url: media.url });
}
