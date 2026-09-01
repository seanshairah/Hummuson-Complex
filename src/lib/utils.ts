import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must learn our custom typography utilities, otherwise it
 * mistakes them for text-color classes and drops them when a color class is
 * present in the same cn() call (e.g. "text-display-2 text-ink").
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display-1",
        "text-display-2",
        "text-display-3",
        "text-title",
        "text-eyebrow",
        "text-editorial",
      ],
      // bg-grain paints a noise *image*, not a color — without this, cn()
      // would drop the background color next to it.
      "bg-image": ["bg-grain"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function formatPriceUsd(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length).replace(/\s+\S*$/, "")}…`;
}

/*
 * stripHtml and readingMinutes used to live here. They now sit in
 * src/lib/sanitize.ts, next to the parser they need — this module is imported
 * by client components, and sanitize-html has no business in a browser bundle.
 */

/** Title-cases enum-ish keys: "SEED_TREATMENT" → "Seed treatment". */
export function humanize(value: string): string {
  const lower = value.replace(/[_-]+/g, " ").toLowerCase().trim();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
