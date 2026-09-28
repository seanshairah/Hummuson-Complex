import { NextResponse, type NextRequest } from "next/server";
import { resolveDesign } from "@/lib/flipbook/resolve";
import { site } from "@/lib/site";
import type { LoadedFlipbook } from "./load";
import { renderFlipbookPdf } from "./pdf";
import { renderFlipbookHtml } from "./standalone";

export type DownloadFormat = "pdf" | "html";

export function isDownloadFormat(value: string): value is DownloadFormat {
  return value === "pdf" || value === "html";
}

/**
 * Where a download's links and QR codes should land: the site the reader
 * downloaded it from. Until the domain moves, the brand domain still serves
 * the old WordPress shop, and a PDF whose "View product" opened that would
 * be a PDF of dead links; the deployment's own address works now and keeps
 * working after the move. Anything unexpected falls back to the site URL.
 */
export function linkOrigin(request: NextRequest): string {
  const host = request.nextUrl.hostname;
  let home = "";
  try {
    home = new URL(site.url).hostname.replace(/^www\./, "");
  } catch {
    // site.url always parses; keep the fallback below regardless
  }
  const known =
    host === home ||
    host === `www.${home}` ||
    host.endsWith(".vercel.app") ||
    host === "localhost" ||
    host === "127.0.0.1";
  return known ? request.nextUrl.origin : site.url;
}

/**
 * The host refuses a function response over 4.5 MB unless it is streamed. A
 * catalogue of today's size is well under that, but one the owner fills with
 * photographs need not be — so the file goes out in chunks either way.
 */
function streamed(data: Uint8Array): ReadableStream<Uint8Array> {
  const CHUNK = 256 * 1024;
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= data.length) {
        controller.close();
        return;
      }
      controller.enqueue(data.subarray(offset, offset + CHUNK));
      offset += CHUNK;
    },
  });
}

/**
 * Builds the PDF or the standalone HTML of a loaded flipbook as a download
 * response. Callers decide which flipbook (published or draft) and who may
 * have it; this only draws it.
 */
export async function flipbookDownload(
  flipbook: LoadedFlipbook,
  format: DownloadFormat,
  options: { origin: string; filename: string; cacheControl: string; pdfUrl: string | null },
): Promise<NextResponse> {
  const pages = resolveDesign(flipbook.design, flipbook.context, {
    pad: true,
    absoluteLinks: true,
    linkBase: options.origin,
  });
  const disposition = `attachment; filename="${options.filename}.${format}"`;

  try {
    if (format === "pdf") {
      const pdf = await renderFlipbookPdf(pages, flipbook.title);
      return new NextResponse(streamed(new Uint8Array(pdf)), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": disposition,
          "Cache-Control": options.cacheControl,
        },
      });
    }

    const html = await renderFlipbookHtml(pages, {
      title: flipbook.title,
      siteUrl: options.origin,
      pdfUrl: options.pdfUrl,
    });
    return new NextResponse(streamed(new TextEncoder().encode(html)), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": disposition,
        "Cache-Control": options.cacheControl,
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
