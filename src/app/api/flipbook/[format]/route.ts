import { NextRequest, NextResponse } from "next/server";
import { loadPublishedFlipbook } from "@/server/flipbook/load";
import { flipbookDownload, isDownloadFormat, linkOrigin } from "@/server/flipbook/respond";
import { limitByIp, tooManyRequests } from "@/server/rate-limit";
import { flipbookDownloads } from "@/lib/flipbook/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A full catalogue with its pictures takes a few seconds to build.
export const maxDuration = 60;

/**
 * The published flipbook as a download: `/api/flipbook/pdf` or
 * `/api/flipbook/html`. Only ever the published flipbook — the designer's
 * unpublished draft has its own signed-in route (api/admin/flipbook).
 *
 * The address carries the flipbook's fingerprint (`?v=`), and anything else
 * is sent to the current one first — so each version is built once and then
 * served from the edge cache, and a changed `v` cannot be used to make the
 * server rebuild on every request.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ format: string }> },
) {
  const { format } = await params;
  if (!isDownloadFormat(format)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const flipbook = await loadPublishedFlipbook();
  if (!flipbook) return NextResponse.json({ error: "No catalogue is published" }, { status: 404 });

  const current = flipbookDownloads(flipbook.hash);
  if (request.nextUrl.searchParams.get("v") !== flipbook.hash) {
    return new NextResponse(null, {
      status: 307,
      headers: { Location: current[format], "Cache-Control": "public, max-age=0, s-maxage=60" },
    });
  }

  const verdict = await limitByIp(request.headers, "flipbook:download", 30, 600);
  if (!verdict.allowed) {
    return tooManyRequests(verdict, "Too many downloads — please try again in a few minutes.");
  }

  const origin = linkOrigin(request);
  return flipbookDownload(flipbook, format, {
    origin,
    filename: flipbook.slug,
    cacheControl: "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400",
    pdfUrl: `${origin}${current.pdf}`,
  });
}
