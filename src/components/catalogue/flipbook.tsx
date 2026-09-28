"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileCode2,
  FileText,
  LayoutGrid,
  Link2,
  List,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PageView } from "@/components/flipbook/page-view";
import { cn } from "@/lib/utils";
import { trackClient } from "@/lib/analytics-client";
import type { ResolvedPage } from "@/lib/flipbook/resolve";
import { FLIPBOOK_PAGE_CSS } from "@/lib/flipbook/tree";

export interface FlipbookDownloads {
  pdf: string;
  html: string;
}

/**
 * Follows a tap inside a page: a contents entry or page link turns the book,
 * a link into the site navigates in place, anything else is left to the
 * browser. Returns true when the tap was a link, so the page does not also
 * turn underneath it.
 */
function followLink(
  event: React.MouseEvent,
  jump: (page: number) => void,
  navigate: (href: string) => void,
): boolean {
  const anchor = (event.target as Element).closest("a");
  if (!anchor) return false;
  event.stopPropagation();
  const goto = anchor.getAttribute("data-goto");
  if (goto) {
    event.preventDefault();
    jump(Number(goto) - 1);
    return true;
  }
  const href = anchor.getAttribute("href") ?? "";
  if (href.startsWith("/") && !href.startsWith("//") && anchor.target !== "_blank") {
    event.preventDefault();
    navigate(href);
  }
  return true;
}

export function Flipbook({
  pages,
  title,
  downloads,
  onClose,
}: {
  pages: ResolvedPage[];
  title: string;
  downloads: FlipbookDownloads | null;
  /** Shown as a preview (the designer's): a close button instead of the way back to the site. */
  onClose?: () => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sheets = useMemo(() => {
    const list: { front: number; back: number | null }[] = [];
    for (let i = 0; i < pages.length; i += 2) {
      list.push({ front: i, back: i + 1 < pages.length ? i + 1 : null });
    }
    return list;
  }, [pages]);

  const [flipped, setFlipped] = useState(() => {
    const param = onClose ? 0 : Number(searchParams.get("page") ?? 0);
    if (Number.isFinite(param) && param > 0) {
      return Math.min(sheets.length, Math.ceil(param / 2));
    }
    return 0;
  });
  const [turning, setTurning] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [thumbsOpen, setThumbsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const rightPage = flipped * 2;
  const currentLabel =
    flipped === 0
      ? "Cover"
      : flipped >= sheets.length
        ? "Back cover"
        : `${flipped * 2}–${flipped * 2 + 1} / ${pages.length}`;

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(sheets.length, next));
      if (clamped === flipped) return;
      // The sheet in motion: next unflipped when going forward, last flipped when going back.
      setTurning(clamped > flipped ? flipped : flipped - 1);
      setFlipped(clamped);
      window.setTimeout(() => setTurning(null), reduce ? 0 : 850);
      const pageParam = clamped * 2;
      // A preview leaves the address and the reading figures alone.
      if (!onClose) {
        window.history.replaceState(
          null,
          "",
          pageParam > 0 ? `?page=${pageParam}` : window.location.pathname,
        );
        trackClient("CATALOGUE_PAGE_TURN", { meta: { page: pageParam } });
      }
    },
    [flipped, sheets.length, reduce, onClose],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(flipped + 1);
      if (e.key === "ArrowLeft") go(flipped - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, flipped]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // A deep link opens the phone reader on its page too.
  useEffect(() => {
    const target = Math.max(0, Math.min(pages.length - 1, flipped * 2 - 1));
    const reader = readerRef.current;
    const card = reader?.children[target] as HTMLElement | undefined;
    if (reader && card && target > 0) reader.scrollLeft = card.offsetLeft - reader.offsetLeft - 24;
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current?.requestFullscreen();
    } catch {
      // Unsupported (iOS Safari) — zoom still works.
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/catalogue/flipbook${rightPage > 0 ? `?page=${rightPage}` : ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      // cancelled
    }
  };

  const jumpToPage = useCallback(
    (pageIndex: number) => {
      go(Math.ceil(pageIndex / 2));
      setTocOpen(false);
      setThumbsOpen(false);
      const reader = readerRef.current;
      const card = reader?.children[pageIndex] as HTMLElement | undefined;
      if (reader && card && reader.offsetParent) {
        reader.scrollTo({ left: card.offsetLeft - reader.offsetLeft - 24, behavior: "smooth" });
      }
    },
    [go],
  );

  const navigate = useCallback((href: string) => router.push(href), [router]);
  const chapters = pages.filter((page) => page.chapter);

  return (
    <div ref={shellRef} className="bg-grain flex min-h-dvh flex-col bg-humus-950">
      <style>{FLIPBOOK_PAGE_CSS}</style>
      <div aria-hidden className="pointer-events-none fixed inset-0 glow-leaf" />

      {/* Top bar */}
      <header
        className={cn(
          "relative z-10 flex items-center justify-between gap-3 px-4 pb-2 md:px-8",
          onClose ? "pt-4 md:pt-6" : "pt-20 md:pt-24",
        )}
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center gap-2 rounded-full border border-paper/20 px-3 py-2 text-sm font-medium whitespace-nowrap text-paper/85 transition-colors hover:border-paper/50 sm:px-4"
          >
            <ArrowLeft className="size-4" /> Back to the designer
          </button>
        ) : (
          <Link
            href="/catalogue"
            className="flex shrink-0 items-center gap-2 rounded-full border border-paper/20 px-3 py-2 text-sm font-medium whitespace-nowrap text-paper/85 transition-colors hover:border-paper/50 sm:px-4"
          >
            <ArrowLeft className="size-4" /> Explore<span className="max-sm:hidden"> mode</span>
          </Link>
        )}
        <div className="flex items-center gap-1.5">
          <ToolButton label="Contents" onClick={() => setTocOpen(true)}>
            <List className="size-4" />
          </ToolButton>
          <ToolButton label="Thumbnails" onClick={() => setThumbsOpen(true)}>
            <LayoutGrid className="size-4" />
          </ToolButton>
          <ToolButton
            label={zoomed ? "Zoom out" : "Zoom in"}
            onClick={() => setZoomed((z) => !z)}
            className="max-md:hidden"
          >
            {zoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
          </ToolButton>
          <ToolButton
            label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </ToolButton>
          <ToolButton label={shared ? "Link copied" : "Share this page"} onClick={share}>
            {shared ? <Check className="size-4 text-leaf-400" /> : <Link2 className="size-4" />}
          </ToolButton>
          {downloads && (
            <ToolButton label="Download" onClick={() => setDownloadOpen(true)}>
              <Download className="size-4" />
            </ToolButton>
          )}
        </div>
      </header>

      {/* Desktop book */}
      <div className="relative z-10 hidden flex-1 items-center justify-center px-8 py-6 md:flex">
        <button
          type="button"
          onClick={() => go(flipped - 1)}
          disabled={flipped === 0}
          aria-label="Previous pages"
          className="mr-6 flex size-12 shrink-0 items-center justify-center rounded-full border border-paper/20 text-paper transition-all hover:border-leaf-400 hover:text-leaf-300 disabled:opacity-25"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className={cn("transition-transform duration-500", zoomed && "scale-125")}>
          <div
            className="relative"
            style={{ perspective: "2600px", width: "min(60vw, 58rem)", aspectRatio: "3 / 2.05" }}
            aria-label={`Catalogue, ${currentLabel}`}
          >
            {/* Book base shadow */}
            <div
              aria-hidden
              className="absolute inset-x-8 -bottom-5 h-10 rounded-[50%] bg-black/45 blur-xl"
            />

            {sheets.map((sheet, index) => {
              const isFlipped = index < flipped;
              const z =
                turning === index
                  ? sheets.length + 2
                  : isFlipped
                    ? index + 1
                    : sheets.length - index;
              const back = sheet.back === null ? null : pages[sheet.back]!;
              return (
                <div
                  key={index}
                  className="absolute top-0 right-0 h-full w-1/2"
                  style={{
                    zIndex: z,
                    transformStyle: "preserve-3d",
                    transformOrigin: "left center",
                    transform: `rotateY(${isFlipped ? -180 : 0}deg)`,
                    transition: reduce ? "none" : "transform 0.85s cubic-bezier(0.35, 0.1, 0.2, 1)",
                  }}
                >
                  {/* Front face (right-hand page) */}
                  <div
                    className="absolute inset-0 cursor-pointer overflow-hidden rounded-r-xl shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                    style={{ backfaceVisibility: "hidden" }}
                    onClick={(e) => {
                      if (!followLink(e, jumpToPage, navigate)) go(flipped + 1);
                    }}
                    role="button"
                    aria-label="Turn page forward"
                  >
                    <PageView page={pages[sheet.front]!} priority={index === 0} />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/25 to-transparent"
                    />
                  </div>
                  {/* Back face (left-hand page after flip) */}
                  <div
                    className="absolute inset-0 cursor-pointer overflow-hidden rounded-l-xl shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    onClick={(e) => {
                      if (!followLink(e, jumpToPage, navigate)) go(flipped - 1);
                    }}
                    role="button"
                    aria-label="Turn page back"
                  >
                    {back && <PageView page={back} />}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/25 to-transparent"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(flipped + 1)}
          disabled={flipped >= sheets.length}
          aria-label="Next pages"
          className="ml-6 flex size-12 shrink-0 items-center justify-center rounded-full border border-paper/20 text-paper transition-all hover:border-leaf-400 hover:text-leaf-300 disabled:opacity-25"
        >
          <ArrowRight className="size-5" />
        </button>
      </div>

      {/* Mobile swipe reader */}
      <div className="relative z-10 flex-1 md:hidden">
        <div
          ref={readerRef}
          className="scrollbar-none flex h-full snap-x snap-mandatory gap-4 overflow-x-auto px-6 py-4"
          onClick={(e) => followLink(e, jumpToPage, navigate)}
        >
          {pages.map((page, i) => (
            <div
              key={`${page.id}-${i}`}
              className="relative aspect-[3/4.1] w-[82vw] shrink-0 snap-center overflow-hidden rounded-xl shadow-float"
            >
              <PageView page={page} priority={i === 0} />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom status */}
      <footer className="relative z-10 flex items-center justify-center gap-4 px-6 pt-2 pb-6">
        <p aria-live="polite" className="font-display text-sm text-paper/70">
          {currentLabel}
        </p>
      </footer>

      {/* TOC dialog */}
      <Dialog open={tocOpen} onOpenChange={setTocOpen}>
        <DialogContent title="Contents">
          <ol className="space-y-1">
            <li>
              <button
                type="button"
                onClick={() => jumpToPage(0)}
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-leaf-300/30"
              >
                Cover
              </button>
            </li>
            {chapters.map((page, i) => (
              <li key={`${page.id}-${page.number}`}>
                <button
                  type="button"
                  onClick={() => jumpToPage(page.number - 1)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-leaf-300/30"
                >
                  <span className="font-display text-xs font-semibold text-leaf-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium text-ink">{page.chapter}</span>
                  <span className="ml-auto text-xs text-ink-faint">p. {page.number}</span>
                </button>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>

      {/* Thumbnails dialog */}
      <Dialog open={thumbsOpen} onOpenChange={setThumbsOpen}>
        <DialogContent title="Pages" className="max-w-3xl">
          <div data-lenis-prevent className="grid max-h-[60dvh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5">
            {pages.map((page, i) => (
              <button
                key={`${page.id}-${i}`}
                type="button"
                onClick={() => jumpToPage(i)}
                className={cn(
                  "group relative aspect-[3/4.1] overflow-hidden rounded-lg border-2 transition-all",
                  rightPage === i || rightPage - 1 === i
                    ? "border-leaf-600 shadow-card"
                    : "border-transparent opacity-80 hover:opacity-100",
                )}
                aria-label={`Go to page ${i + 1}`}
              >
                <span inert className="pointer-events-none absolute inset-0">
                  {thumbsOpen && <PageView page={page} thumbnail />}
                </span>
                <span className="absolute right-1 bottom-1 rounded bg-humus-950/70 px-1 text-[8px] text-paper">
                  {i + 1}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Downloads */}
      {downloads && (
        <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
          <DialogContent
            title="Download the catalogue"
            description="Every page as it appears here, to keep, print or pass on."
          >
            <div className="mt-4 grid gap-3">
              <DownloadOption
                href={downloads.pdf}
                icon={<FileText className="size-5" />}
                label="PDF"
                detail="For printing, email and WhatsApp. Links and the contents stay clickable."
                onClick={() =>
                  trackClient("PDF_DOWNLOAD", { entityType: "catalogue", meta: { format: "pdf" } })
                }
              />
              <DownloadOption
                href={downloads.html}
                icon={<FileCode2 className="size-5" />}
                label="Web page (HTML)"
                detail="One file that opens in any browser, even offline — the same page-turning book."
                onClick={() =>
                  trackClient("PDF_DOWNLOAD", { entityType: "catalogue", meta: { format: "html" } })
                }
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DownloadOption({
  href,
  icon,
  label,
  detail,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <a
      href={href}
      download
      onClick={onClick}
      className="flex items-start gap-4 rounded-2xl border border-line bg-paper px-4 py-3.5 transition-colors hover:border-leaf-600"
    >
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-humus-900 text-paper">
        {icon}
      </span>
      <span>
        <span className="block font-display font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-sm text-ink-faint">{detail}</span>
      </span>
    </a>
  );
}

function ToolButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-10 items-center justify-center rounded-full border border-paper/20 text-paper/85 transition-colors hover:border-paper/50",
        className,
      )}
    >
      {children}
    </button>
  );
}
