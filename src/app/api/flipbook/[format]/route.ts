import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { loadDraftFlipbook, loadPublishedFlipbook } from "@/server/flipbook/load";
import { renderFlipbookPdf } from "@/server/flipbook/pdf";
import { renderFlipbookHtml } from "@/server/flipbook/standalone";
import { limitByIp, tooManyRequests } from "@/server/rate-limit";
import { resolveDesign } from "@/lib/flipbook/resolve";
import { flipbookDownloads } from "@/lib/flipbook/downloads";
import { site } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A full catalogue with its pictures takes a few seconds to build.
export const maxDuration = 60;

/**
 * The flipbook as a download: `/api/flipbook/pdf` or `/api/flipbook/html`.
 *
 * Readers get the published flipbook. The address carries the flipbook's
 * fingerprint (`?v=`), and anything else is sent to the current one first —
 * so each version is built once and then served from the edge cache, and a
 * changed `v` cannot be used to make the server rebuild on every request.
 *
 * `?draft=1` is the designer's preview of unpublished work: signed-in only,
 * never cached.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ format: string }> },
) {
  const { format } = await params;
  if (format !== "pdf" && format !== "html") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const draft = request.nextUrl.searchParams.get("draft") === "1";
  if (draft) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flipbook = draft ? await loadDraftFlipbook() : await loadPublishedFlipbook();
  if (!flipbook) return NextResponse.json({ error: "No catalogue is published" }, { status: 404 });

  if (!draft) {
    if (request.nextUrl.searchParams.get("v") !== flipbook.hash) {
      const current = flipbookDownloads(flipbook.hash)[format];
      return new NextResponse(null, {
        status: 307,
        headers: { Location: current, "Cache-Control": "public, max-age=0, s-maxage=60" },
      });
    }
    const verdict = await limitByIp(request.headers, "flipbook:download", 30, 600);
    if (!verdict.allowed) {
      return tooManyRequests(verdict, "Too many downloads — please try again in a few minutes.");
    }
  }

  const pages = resolveDesign(flipbook.design, flipbook.context, { pad: true, absoluteLinks: true });
  const filename = `${flipbook.slug}${draft ? "-draft" : ""}.${format}`;
  const caching = draft
    ? "private, no-store"
    : "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400";

  try {
    if (format === "pdf") {
      const pdf = await renderFlipbookPdf(pages, flipbook.title);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(pdf.length),
          "Cache-Control": caching,
        },
      });
    }

    const html = await renderFlipbookHtml(pages, {
      title: flipbook.title,
      siteUrl: site.url,
      pdfUrl: draft ? null : `${site.url}${flipbookDownloads(flipbook.hash).pdf}`,
    });
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": caching,
      },
    });
  } catch (error) {
    // Logged in full for the host's function logs; the reader gets no internals.
    console.error(`[flipbook] ${format} download failed`, error);
    return NextResponse.json(
      { error: `The ${format.toUpperCase()} could not be made just now. Please try again shortly.` },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
