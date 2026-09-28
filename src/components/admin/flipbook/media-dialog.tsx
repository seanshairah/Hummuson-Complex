"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Search, Upload } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface LibraryItem {
  id: string | null;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  kind: string | null;
  label: string;
}

/** Pictures that ship with the site but are not rows in the media library. */
export const BRAND_ITEMS: LibraryItem[] = [
  { id: null, url: "/images/brand/logo-white.png", alt: "Humuson Complex", width: 974, height: 353, kind: "brand", label: "Logo (white)" },
  { id: null, url: "/images/brand/logo-color.png", alt: "Humuson Complex", width: 974, height: 353, kind: "brand", label: "Logo (colour)" },
];

const FILTERS = [
  { value: "all", label: "All" },
  { value: "upload", label: "Uploads" },
  { value: "product", label: "Products" },
  { value: "brand", label: "Brand" },
  { value: "other", label: "Other" },
] as const;

/**
 * Choose a picture from the media library, or upload a new one — it is
 * stored with the site and chosen in the same step.
 */
export function MediaDialog({
  open,
  onOpenChange,
  library,
  onUploaded,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  library: LibraryItem[];
  onUploaded: (item: LibraryItem) => void;
  onChoose: (item: LibraryItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const all = [...library, ...BRAND_ITEMS];
    const q = query.trim().toLowerCase();
    return all.filter((item) => {
      if (filter === "upload" && item.kind !== "upload") return false;
      if (filter === "product" && item.kind !== "product") return false;
      if (filter === "brand" && item.kind !== "brand") return false;
      if (filter === "other" && ["upload", "product", "brand"].includes(item.kind ?? "")) return false;
      if (!q) return true;
      return `${item.label} ${item.alt ?? ""} ${item.url}`.toLowerCase().includes(q);
    });
  }, [library, query, filter]);

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await response.json().catch(() => null)) as
        | { id: string; url: string; width: number | null; height: number | null; alt: string | null; error?: string }
        | null;
      if (!response.ok || !data?.id) throw new Error(data?.error ?? "Upload failed");
      const item: LibraryItem = {
        id: data.id,
        url: data.url,
        alt: data.alt,
        width: data.width,
        height: data.height,
        kind: "upload",
        label: file.name,
      };
      onUploaded(item);
      onChoose(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Choose a picture" className="max-w-4xl">
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              aria-label="Search pictures"
              className="h-10 w-full rounded-full border border-line bg-cream pr-4 pl-9 text-sm outline-none focus:border-leaf-600"
            />
          </label>
          <div className="flex rounded-full border border-line bg-cream p-0.5">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === option.value ? "bg-humus-900 text-paper" : "text-ink-soft hover:text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="hidden"
            onChange={(e) => upload(e.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-humus-900 px-4 text-sm font-medium text-paper transition-colors hover:bg-humus-700 disabled:opacity-50"
          >
            {busy ? <Spinner className="size-4" /> : <Upload className="size-4" />}
            {busy ? "Uploading…" : "Upload a picture"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
        <p className="mt-2 text-xs text-ink-faint">
          JPEG, PNG, WebP, AVIF or GIF up to 8 MB. Uploads are added to the media library.
        </p>
        <div
          data-lenis-prevent
          className="mt-4 grid max-h-[58dvh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5"
        >
          {items.map((item) => (
            <button
              key={`${item.id ?? item.url}`}
              type="button"
              onClick={() => onChoose(item)}
              className="group text-left"
              title={item.label}
            >
              <span
                className={cn(
                  "relative block aspect-square overflow-hidden rounded-xl border border-line transition-all group-hover:border-leaf-600 group-hover:shadow-card",
                  item.kind === "brand" ? "bg-humus-900" : "bg-paper-dim",
                )}
              >
                <Image
                  src={item.url}
                  alt={item.alt ?? ""}
                  fill
                  sizes="160px"
                  className={item.kind === "brand" ? "object-contain p-3" : "object-cover"}
                />
              </span>
              <span className="mt-1 block truncate text-[11px] text-ink-faint">{item.label}</span>
            </button>
          ))}
          {items.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-ink-faint">No pictures match.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
