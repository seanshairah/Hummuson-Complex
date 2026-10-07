import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9_-]{1,40}$/;
/** Only ever image types the upload route itself wrote. */
const SERVABLE = new Set(["image/webp", "image/jpeg", "image/png", "image/avif", "image/gif"]);

/**
 * Serves an uploaded file from the database (see api/admin/upload). The
 * address names the Media row, and ids are never reused, so a response can be
 * cached for good. The trailing file name is for people saving the picture;
 * it is not used to find it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id } = await params;
  if (!ID.test(id)) return new NextResponse("Not found", { status: 404 });

  const file = await db.mediaFile.findUnique({
    where: { mediaId: id },
    select: { data: true, mimeType: true },
  });
  if (!file || !SERVABLE.has(file.mimeType)) return new NextResponse("Not found", { status: 404 });

  const body = Buffer.from(file.data);
  return new NextResponse(body, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      // A picture has no business running anything, even opened on its own.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
