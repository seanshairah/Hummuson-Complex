"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Package,
  Wheat,
  MessageCircleQuestion,
  Newspaper,
  PlayCircle,
  Images,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ApiResult {
  type: string;
  title: string;
  href: string;
  subtitle?: string;
}

const TYPE_META: Record<string, { label: string; icon: typeof Package }> = {
  product: { label: "Products", icon: Package },
  crop: { label: "Crops", icon: Wheat },
  faq: { label: "Questions", icon: MessageCircleQuestion },
  article: { label: "Articles", icon: Newspaper },
  video: { label: "Videos", icon: PlayCircle },
  project: { label: "Results", icon: Images },
  page: { label: "Pages", icon: ArrowRight },
};

export function SearchLauncher({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search (Ctrl+K)"
        className={cn(
          "flex h-10 items-center gap-2 rounded-full border px-3 transition-colors sm:px-4",
          tone === "light"
            ? "border-paper/20 text-paper hover:bg-paper/10"
            : "border-ink/12 text-ink hover:bg-ink/5",
        )}
      >
        <Search className="size-[1.05rem]" strokeWidth={1.8} />
        <span className="hidden text-sm md:inline">Search</span>
        <kbd
          className={cn(
            "hidden rounded-md border px-1.5 py-0.5 font-sans text-[0.65rem] md:inline",
            tone === "light" ? "border-paper/25 text-paper/70" : "border-ink/15 text-ink-faint",
          )}
        >
          ⌘K
        </kbd>
      </button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (q: string) => {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&prefix=1`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("search failed");
      const data = (await res.json()) as { results: ApiResult[] };
      setResults(data.results);
      setActive(0);
      setSearched(true);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setResults([]);
        setSearched(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(query), 180);
    return () => clearTimeout(t);
  }, [query, run]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Search Humuson"
        hideTitle
        className="top-24 max-w-xl translate-y-0 p-0 data-[state=open]:animate-fade-in"
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search className="size-5 shrink-0 text-ink-faint" strokeWidth={1.8} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                go(results[active].href);
              }
            }}
            placeholder="Search products, crops, questions, articles…"
            aria-label="Search"
            className="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-faint/60"
          />
          {loading && <Spinner className="text-leaf-600" />}
        </div>

        <div className="max-h-[55dvh] overflow-y-auto p-2">
          {!searched && !loading && (
            <div className="px-4 py-8 text-center text-sm text-ink-faint">
              Try <SearchHint onPick={setQuery} q="maize" />, <SearchHint onPick={setQuery} q="root development" />,{" "}
              <SearchHint onPick={setQuery} q="foliar" /> or a product name.
            </div>
          )}
          {searched && results.length === 0 && !loading && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-ink">No results for “{query}”.</p>
              <p className="mt-1 text-sm text-ink-faint">
                Try a crop, a product name or a problem — or ask us directly.
              </p>
              <Link
                href="/contact"
                onClick={() => onOpenChange(false)}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-leaf-700 hover:underline"
              >
                Request advice <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
          {results.map((result, i) => {
            const meta = TYPE_META[result.type] ?? TYPE_META.page!;
            const Icon = meta.icon;
            const prev = results[i - 1];
            const showGroup = !prev || prev.type !== result.type;
            return (
              <div key={`${result.href}-${i}`}>
                {showGroup && (
                  <p className="text-eyebrow px-3 pt-4 pb-1.5 text-[0.62rem] text-ink-faint">
                    {meta.label}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => go(result.href)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    i === active ? "bg-leaf-300/30" : "hover:bg-ink/4",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-paper-dim text-ink-soft">
                    <Icon className="size-4" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{result.title}</span>
                    {result.subtitle && (
                      <span className="block truncate text-xs text-ink-faint">{result.subtitle}</span>
                    )}
                  </span>
                  {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-ink-faint" />}
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchHint({ q, onPick }: { q: string; onPick: (q: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(q)}
      className="font-medium text-leaf-700 hover:underline"
    >
      “{q}”
    </button>
  );
}
