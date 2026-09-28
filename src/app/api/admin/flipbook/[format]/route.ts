import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { loadDraftFlipbook } from "@/server/flipbook/load";
import { flipbookDownload, isDownloadFormat, linkOrigin } from "@/server/flipbook/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A full catalogue with its pictures takes a few seconds to build.
export const maxDuration = 60;

/**
 * The designer's draft as a download — what the flipbook will look like once
 * published. Signed-in only, and never cached anywhere.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ format: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { format } = await params;
  if (!isDownloadFormat(format)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const flipbook = await loadDraftFlipbook();
  if (!flipbook) return NextResponse.json({ error: "No catalogue exists yet" }, { status: 404 });

  return flipbookDownload(flipbook, format, {
    origin: linkOrigin(request),
    filename: `${flipbook.slug}-draft`,
    cacheControl: "private, no-store",
    pdfUrl: null,
  });
}
