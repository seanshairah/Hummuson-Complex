import { z } from "zod";
import {
  DESIGN_VERSION,
  LIMITS,
  PAGE_H,
  PAGE_W,
  COLORS,
  newId,
  snapWeight,
  type Block,
  type DesignPage,
  type FlipbookDesign,
  type ImageSource,
  type LinkTarget,
} from "./model";

/**
 * Validation for designs coming in from the designer and out of the database.
 *
 * It never throws on a bad value: a number out of range is clamped, a missing
 * field takes its default, and anything that could carry script — a link, a
 * picture address, a colour — is dropped back to a safe default unless it
 * matches exactly what the renderers expect. The designer only ever sends
 * valid designs, so these paths exist for crafted requests and for designs
 * saved by an older version of this code.
 */

/** Hosts a design may show pictures from; the same list the site's CSP allows. */
export const IMAGE_HOSTS = ["humusoncomplex.com", "res.cloudinary.com", "img.youtube.com", "i.ytimg.com"];

const HEX = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
// Control characters other than tab and newline.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const round = (n: number) => Math.round(n * 1e4) / 1e4;

const num = (min: number, max: number, fallback: number) =>
  z
    .number()
    .finite()
    .transform((n) => round(Math.min(max, Math.max(min, n))))
    .catch(fallback);

const int = (min: number, max: number, fallback: number) =>
  z
    .number()
    .finite()
    .transform((n) => Math.round(Math.min(max, Math.max(min, n))))
    .catch(fallback);

const color = (fallback: string) =>
  z
    .string()
    .regex(HEX)
    .transform((s) => s.toLowerCase())
    .catch(fallback);

const optionalColor = z
  .string()
  .regex(HEX)
  .transform((s) => s.toLowerCase())
  .nullable()
  .catch(null);

const text = (max: number, fallback = "") =>
  z
    .string()
    .transform((s) => s.replace(CONTROL, "").slice(0, max))
    .catch(fallback);

const optionalText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL, "").trim().slice(0, max) || null)
    .nullable()
    .catch(null);

const id = (prefix: string) => z.string().regex(ID).catch(() => newId(prefix));
const optionalId = z.string().regex(ID).nullable().catch(null);
const bool = (fallback: boolean) => z.boolean().catch(fallback);
const oneOf = <T extends string>(values: readonly [T, ...T[]], fallback: T) =>
  z.enum(values).catch(fallback);

/**
 * A link a reader can follow: an http(s) address, mailto:, tel:, or a path
 * on this site. Returns the cleaned value, or null for anything else —
 * `javascript:` and `data:` included.
 */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href || href.length > 500 || /[\s\u0000-\u001F\u007F\\]/.test(href)) return null;
  if (href.startsWith("/")) return href.startsWith("//") ? null : href;
  // Domain labels exclude the dot that separates them: one way to match, so
  // no backtracking however the address is crafted.
  if (/^mailto:[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/i.test(href)) return href;
  if (/^tel:\+?[0-9()-]{3,24}$/i.test(href)) return href;
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * A picture address: a path on this site with no `..` in it, or https on one
 * of IMAGE_HOSTS. The PDF and HTML builders read these server-side, so this is
 * also what keeps them from being pointed anywhere else.
 */
export function safeImageUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url || url.length > 500) return null;
  if (url.startsWith("/")) {
    if (url.startsWith("//") || !/^\/[A-Za-z0-9._~\-/%()+,]*$/.test(url)) return null;
    // Dot segments, literal or percent-encoded (a URL parser reads %2e as a
    // dot), and encoded slashes, which could smuggle one in.
    if (/%2e|%2f|%5c/i.test(url)) return null;
    if (url.split("/").some((segment) => segment === ".." || segment === ".")) return null;
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    if (!IMAGE_HOSTS.includes(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

const gradient = z
  .object({
    from: color(COLORS.paperDim),
    to: color(COLORS.paperDeep),
    angle: num(-360, 360, 135),
  })
  .nullable()
  .catch(null);

const imageSource = z
  .unknown()
  .transform((value): ImageSource | null => {
    if (!value || typeof value !== "object") return null;
    const v = value as Record<string, unknown>;
    if (v.kind === "product") {
      return { kind: "product", which: v.which === "primary" ? "primary" : "catalogue" };
    }
    if (v.kind === "media") {
      const url = typeof v.url === "string" ? safeImageUrl(v.url) : null;
      const mediaId = typeof v.mediaId === "string" && ID.test(v.mediaId) ? v.mediaId : null;
      const alt =
        typeof v.alt === "string" ? v.alt.replace(CONTROL, "").trim().slice(0, 300) || null : null;
      // An empty picture is a placeholder the designer shows until one is chosen.
      return { kind: "media", mediaId: url ? mediaId : null, url: url ?? "", alt };
    }
    return null;
  });

const link = z
  .unknown()
  .transform((value): LinkTarget => {
    if (!value || typeof value !== "object") return { kind: "none" };
    const v = value as Record<string, unknown>;
    if (v.kind === "product") return { kind: "product" };
    if (v.kind === "page") {
      const page = typeof v.page === "number" && Number.isFinite(v.page) ? Math.round(v.page) : 0;
      return page >= 1 && page <= LIMITS.pages + 1 ? { kind: "page", page } : { kind: "none" };
    }
    if (v.kind === "url" && typeof v.href === "string") {
      const href = safeHref(v.href);
      return href ? { kind: "url", href } : { kind: "none" };
    }
    return { kind: "none" };
  });

const FONTS = ["display", "sans", "serif"] as const;

const baseShape = {
  id: id("b"),
  name: optionalText(LIMITS.name),
  x: num(-PAGE_W, PAGE_W * 2, 60),
  y: num(-PAGE_H, PAGE_H * 2, 60),
  w: num(1, PAGE_W * 3, 200),
  h: num(1, PAGE_H * 3, 80),
  rotate: num(-360, 360, 0),
  opacity: num(0, 1, 1),
  locked: bool(false),
  hidden: bool(false),
  productId: optionalId,
  link,
};

const weight = int(100, 900, 400).transform(snapWeight);

const textSchema = z.object({
  ...baseShape,
  type: z.literal("text"),
  text: text(LIMITS.text, "Text"),
  font: oneOf(FONTS, "sans"),
  size: num(4, 200, 16),
  weight,
  italic: bool(false),
  color: color(COLORS.ink),
  align: oneOf(["left", "center", "right", "justify"], "left"),
  valign: oneOf(["top", "middle", "bottom"], "top"),
  lineHeight: num(0.7, 3, 1.4),
  letterSpacing: num(-0.2, 1, 0),
  textCase: oneOf(["none", "upper", "lower", "title"], "none"),
  background: optionalColor,
  padding: num(0, 200, 0),
  radius: num(0, 999, 0),
  maxLines: int(0, 60, 0),
  hideIfEmpty: bool(false),
});

const imageSchema = z.object({
  ...baseShape,
  type: z.literal("image"),
  src: imageSource.transform(
    (src): ImageSource => src ?? { kind: "media", mediaId: null, url: "", alt: null },
  ),
  fit: oneOf(["cover", "contain"], "cover"),
  focusX: num(0, 100, 50),
  focusY: num(0, 100, 50),
  radius: num(0, 999, 0),
  borderWidth: num(0, 60, 0),
  borderColor: color(COLORS.line),
  background: optionalColor,
  gradient,
});

const shapeSchema = z.object({
  ...baseShape,
  type: z.literal("shape"),
  shape: oneOf(["rect", "ellipse", "line"], "rect"),
  fill: optionalColor,
  gradient,
  stroke: optionalColor,
  strokeWidth: num(0, 60, 0),
  radius: num(0, 999, 0),
});

const buttonSchema = z.object({
  ...baseShape,
  type: z.literal("button"),
  label: text(LIMITS.label, "View product"),
  font: oneOf(FONTS, "display"),
  size: num(4, 120, 13),
  weight,
  color: color(COLORS.paper),
  background: color(COLORS.humus900),
  borderColor: optionalColor,
  radius: num(0, 999, 999),
  arrow: bool(true),
});

const contentsSchema = z.object({
  ...baseShape,
  type: z.literal("contents"),
  font: oneOf(FONTS, "display"),
  size: num(4, 120, 20),
  color: color(COLORS.ink),
  accent: color(COLORS.leaf700),
  muted: color(COLORS.inkFaint),
  gap: num(0, 200, 18),
  numbered: bool(true),
  leader: bool(true),
});

const qrSchema = z.object({
  ...baseShape,
  type: z.literal("qr"),
  color: color(COLORS.ink),
  background: optionalColor,
});

const BLOCK_SCHEMAS: Record<string, z.ZodTypeAny> = {
  text: textSchema,
  image: imageSchema,
  shape: shapeSchema,
  button: buttonSchema,
  contents: contentsSchema,
  qr: qrSchema,
};

const block = z.unknown().transform((value): Block | null => {
  if (!value || typeof value !== "object") return null;
  const schema = BLOCK_SCHEMAS[(value as { type?: unknown }).type as string];
  if (!schema) return null;
  const parsed = schema.safeParse(value);
  return parsed.success ? (parsed.data as Block) : null;
});

const background = z
  .object({
    color: color(COLORS.cream),
    gradient,
    image: imageSource,
    imageFit: oneOf(["cover", "contain"], "cover"),
    imageOpacity: num(0, 1, 1),
    focusX: num(0, 100, 50),
    focusY: num(0, 100, 50),
    overlay: optionalColor,
    grain: bool(false),
    glow: bool(false),
  })
  .catch({
    color: COLORS.cream,
    gradient: null,
    image: null,
    imageFit: "cover",
    imageOpacity: 1,
    focusX: 50,
    focusY: 50,
    overlay: null,
    grain: false,
    glow: false,
  });

const page = z.object({
  id: id("p"),
  name: text(LIMITS.name, "Page").transform((s) => s.trim() || "Page"),
  chapter: optionalText(LIMITS.label),
  productId: optionalId,
  hidden: bool(false),
  background,
  blocks: z
    .array(block)
    .catch([])
    .transform((blocks) =>
      blocks.filter((b): b is Block => b !== null).slice(0, LIMITS.blocksPerPage),
    ),
});

const pageOrNull = z.unknown().transform((value): DesignPage | null => {
  const parsed = page.safeParse(value);
  return parsed.success ? (parsed.data as DesignPage) : null;
});

const designSchema = z.object({
  version: z.literal(DESIGN_VERSION).catch(DESIGN_VERSION),
  pages: z
    .array(pageOrNull)
    .transform((pages) =>
      pages.filter((p): p is DesignPage => p !== null).slice(0, LIMITS.pages),
    ),
});

/**
 * A clean design from untrusted JSON, or null when it is not a design at all.
 * Ids are made unique on the way through, since the designer and the
 * flipbook both key on them.
 */
export function parseDesign(value: unknown): FlipbookDesign | null {
  const parsed = designSchema.safeParse(value);
  if (!parsed.success) return null;
  const design = parsed.data as FlipbookDesign;
  const seenPages = new Set<string>();
  const seenBlocks = new Set<string>();
  for (const p of design.pages) {
    if (seenPages.has(p.id)) p.id = newId("p");
    seenPages.add(p.id);
    for (const b of p.blocks) {
      if (seenBlocks.has(b.id)) b.id = newId("b");
      seenBlocks.add(b.id);
    }
  }
  return design;
}
