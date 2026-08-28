"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Download,
  LayoutGrid,
  Link2,
  List,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MediaImage } from "@/components/shared/media-image";
import { cn } from "@/lib/utils";
import { trackClient } from "@/lib/analytics-client";
import type { CataloguePage } from "@/lib/catalogue-pages";

const THEME_BG: Record<string, string> = {
  soil: "bg-[#efe9d8]",
  biology: "bg-humus-900",
  vitality: "bg-leaf-200",
  nutrition: "bg-paper-deep",
};
const THEME_DARK = new Set(["biology"]);

/* ── Single page face ───────────────────────────────────────────────────── */

export function PageFace({ page, pageNumber }: { page: CataloguePage; pageNumber: number }) {
  if (page.kind === "cover") {
    return (
      <div className="bg-grain flex h-full flex-col justify-between bg-humus-950 p-[7%] text-paper">
        <div className="pointer-events-none absolute inset-0 glow-leaf" aria-hidden />
        <p className="relative text-eyebrow text-[0.6em] text-leaf-400">
          Humuson Complex{page.year ? ` · ${page.year}` : ""}
        </p>
        <div className="relative">
          <h2 className="font-display text-[2.6em] leading-[1.02] font-semibold tracking-tight">
            Product
            <br />
            Guide
          </h2>
          {page.intro && (
            <p className="mt-[1em] text-[0.72em] leading-relaxed text-paper/65">{page.intro}</p>
          )}
        </div>
        <p className="relative text-eyebrow text-[0.55em] text-paper/40">
          Home of healthy soil &amp; healthy crop
        </p>
      </div>
    );
  }

  if (page.kind === "toc") {
    return (
      <div className="flex h-full flex-col bg-cream p-[7%]">
        <p className="text-eyebrow text-[0.6em] text-leaf-700">Contents</p>
        <ol className="mt-[1.4em] space-y-[0.9em]">
          {page.entries.map((entry, i) => (
            <li key={entry.slug} className="flex items-baseline gap-[0.6em] text-ink">
              <span className="font-display text-[0.7em] font-semibold text-leaf-700">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-[0.95em] font-medium">{entry.title}</span>
              <span aria-hidden className="mx-[0.4em] flex-1 border-b border-dotted border-line" />
              <span className="text-[0.7em] text-ink-faint">{entry.page + 1}</span>
            </li>
          ))}
        </ol>
        <p className="mt-auto text-[0.62em] leading-relaxed text-ink-faint">
          Tap any product page to open its full details, rates and crop guidance.
        </p>
      </div>
    );
  }

  if (page.kind === "chapter") {
    const dark = THEME_DARK.has(page.theme);
    return (
      <div
        className={cn(
          "relative flex h-full flex-col justify-end overflow-hidden p-[7%]",
          THEME_BG[page.theme] ?? "bg-paper-dim",
          dark ? "text-paper" : "text-ink",
        )}
      >
        {page.image && (
          <div className="absolute inset-0 opacity-25">
            <MediaImage image={page.image} alt="" fill sizes="420px" quality={55} className="object-cover" />
          </div>
        )}
        <p
          className={cn(
            "relative text-eyebrow text-[0.6em]",
            dark ? "text-leaf-400" : "text-leaf-800",
          )}
        >
          Chapter {String(page.number).padStart(2, "0")}
        </p>
        <h2 className="relative mt-[0.4em] font-display text-[2.1em] leading-[1.05] font-semibold tracking-tight">
          {page.title}
        </h2>
        {page.intro && (
          <p
            className={cn(
              "relative mt-[0.8em] text-[0.72em] leading-relaxed",
              dark ? "text-paper/70" : "text-ink-soft",
            )}
          >
            {page.intro}
          </p>
        )}
        <p
          className={cn(
            "relative mt-[1em] text-[0.62em]",
            dark ? "text-paper/50" : "text-ink-faint",
          )}
        >
          {page.productCount} product{page.productCount === 1 ? "" : "s"}
        </p>
      </div>
    );
  }

  if (page.kind === "product") {
    const { product } = page;
    return (
      <div className="flex h-full flex-col bg-cream">
        <div className="relative h-[52%] shrink-0 overflow-hidden bg-gradient-to-br from-paper-dim via-cream to-paper-deep">
          {product.image && (
            <MediaImage
              image={product.image}
              alt={`${product.name} pack`}
              fill
              sizes="420px"
              quality={60}
              className="object-cover"
            />
          )}
          <span className="absolute top-[4%] left-[6%] text-eyebrow text-[0.5em] text-ink-faint">
            {page.chapterTitle}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-[6%]">
          <h3 className="font-display text-[1.35em] leading-tight font-semibold text-ink">
            {product.name}
          </h3>
          {product.shortDescription && (
            <p className="mt-[0.5em] line-clamp-3 text-[0.68em] leading-relaxed text-ink-soft">
              {product.shortDescription}
            </p>
          )}
          <div className="mt-auto space-y-[0.35em] pt-[0.6em] text-[0.6em] text-ink-faint">
            {product.cropNames.length > 0 && (
              <p className="line-clamp-1 capitalize">
                <strong className="text-ink-soft">Crops:</strong>{" "}
                {product.cropNames.slice(0, 5).join(", ")}
              </p>
            )}
            <div className="flex items-center justify-between gap-[0.5em]">
              <p className="line-clamp-1">
                {product.packSizes.length > 0 && (
                  <>
                    <strong className="text-ink-soft">Packs:</strong>{" "}
                    {product.packSizes.join(" · ")}
                  </>
                )}
              </p>
              <Link
                href={`/products/${product.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto inline-flex shrink-0 items-center gap-[0.4em] rounded-full bg-humus-900 px-[1em] py-[0.5em] font-display font-medium text-paper hover:bg-humus-700"
              >
                View product <ArrowRight className="size-[1em]" />
              </Link>
            </div>
          </div>
        </div>
        <span className="pb-[3%] text-center text-[0.5em] text-ink-faint/60">{pageNumber}</span>
      </div>
    );
  }

  // back
  return (
    <div className="bg-grain flex h-full flex-col items-center justify-center bg-humus-950 p-[8%] text-center text-paper">
      {page.title && (
        <>
          <BookOpen className="size-[2.2em] text-leaf-400" strokeWidth={1.4} />
          <p className="mt-[1em] font-display text-[1.1em] font-semibold">{page.title}</p>
          <p className="mt-[0.6em] text-[0.65em] text-paper/60">
            humusoncomplex.com · WhatsApp +263 77 665 6433
          </p>
        </>
      )}
    </div>
  );
}

/* ── Flipbook ───────────────────────────────────────────────────────────── */

export function Flipbook({ pages, pdfUrl }: { pages: CataloguePage[]; pdfUrl: string | null }) {
  const searchParams = useSearchParams();
  const sheets = useMemo(() => {
    const list: { front: number; back: number }[] = [];
    for (let i = 0; i < pages.length; i += 2) list.push({ front: i, back: i + 1 });
    return list;
  }, [pages]);

  const [flipped, setFlipped] = useState(() => {
    const param = Number(searchParams.get("page") ?? 0);
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
  const [shared, setShared] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
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
      window.history.replaceState(
        null,
        "",
        pageParam > 0 ? `?page=${pageParam}` : window.location.pathname,
      );
      trackClient("CATALOGUE_PAGE_TURN", { meta: { page: pageParam } });
    },
    [flipped, sheets.length, reduce],
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
        await navigator.share({ title: "Humuson Product Guide", url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      // cancelled
    }
  };

  const jumpToPage = (pageIndex: number) => {
    go(Math.ceil(pageIndex / 2));
    setTocOpen(false);
    setThumbsOpen(false);
  };

  const toc = pages.find((page) => page.kind === "toc");

  return (
    <div ref={shellRef} className="bg-grain flex min-h-dvh flex-col bg-humus-950">
      <div aria-hidden className="pointer-events-none fixed inset-0 glow-leaf" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-20 pb-2 md:px-8 md:pt-24">
        <Link
          href="/catalogue"
          className="flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2 text-sm font-medium text-paper/85 transition-colors hover:border-paper/50"
        >
          <ArrowLeft className="size-4" /> Explore mode
        </Link>
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
          {pdfUrl && (
            <a
              href={pdfUrl}
              onClick={() => trackClient("PDF_DOWNLOAD", { entityType: "catalogue" })}
              className="flex size-10 items-center justify-center rounded-full border border-paper/20 text-paper/85 transition-colors hover:border-paper/50"
              aria-label="Download PDF"
              title="Download PDF"
            >
              <Download className="size-4" />
            </a>
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
                    className="absolute inset-0 cursor-pointer overflow-hidden rounded-r-xl text-[clamp(9px,1.05vw,15px)] shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                    style={{ backfaceVisibility: "hidden" }}
                    onClick={() => go(flipped + 1)}
                    role="button"
                    aria-label="Turn page forward"
                  >
                    <PageFace page={pages[sheet.front]!} pageNumber={sheet.front + 1} />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/25 to-transparent"
                    />
                  </div>
                  {/* Back face (left-hand page after flip) */}
                  <div
                    className="absolute inset-0 cursor-pointer overflow-hidden rounded-l-xl text-[clamp(9px,1.05vw,15px)] shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    onClick={() => go(flipped - 1)}
                    role="button"
                    aria-label="Turn page back"
                  >
                    <PageFace page={pages[sheet.back]!} pageNumber={sheet.back + 1} />
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
        <div className="scrollbar-none flex h-full snap-x snap-mandatory gap-4 overflow-x-auto px-6 py-4">
          {pages.map((page, i) => (
            <div
              key={i}
              className="relative aspect-[3/4.1] w-[82vw] shrink-0 snap-center overflow-hidden rounded-xl text-[clamp(10px,3.4vw,15px)] shadow-float"
            >
              <PageFace page={page} pageNumber={i + 1} />
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
            {toc?.kind === "toc" &&
              toc.entries.map((entry, i) => (
                <li key={entry.slug}>
                  <button
                    type="button"
                    onClick={() => jumpToPage(entry.page)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-leaf-300/30"
                  >
                    <span className="font-display text-xs font-semibold text-leaf-700">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-ink">{entry.title}</span>
                    <span className="ml-auto text-xs text-ink-faint">p. {entry.page + 1}</span>
                  </button>
                </li>
              ))}
          </ol>
        </DialogContent>
      </Dialog>

      {/* Thumbnails dialog */}
      <Dialog open={thumbsOpen} onOpenChange={setThumbsOpen}>
        <DialogContent title="Pages" className="max-w-3xl">
          <div className="grid max-h-[60dvh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5">
            {pages.map((page, i) => (
              <button
                key={i}
                type="button"
                onClick={() => jumpToPage(i)}
                className={cn(
                  "group relative aspect-[3/4] overflow-hidden rounded-lg border-2 text-[5px] transition-all",
                  rightPage === i || rightPage - 1 === i
                    ? "border-leaf-600 shadow-card"
                    : "border-transparent opacity-80 hover:opacity-100",
                )}
                aria-label={`Go to page ${i + 1}`}
              >
                <PageFace page={page} pageNumber={i + 1} />
                <span className="absolute right-1 bottom-1 rounded bg-humus-950/70 px-1 text-[8px] text-paper">
                  {i + 1}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
