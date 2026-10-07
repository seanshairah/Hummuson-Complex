/**
 * The flipbook design: every page of the catalogue as freely placed blocks.
 *
 * A design is plain JSON, stored on the Catalogue row (published and draft
 * copies) and rendered three ways from the one description — the web
 * flipbook, the PDF download and the standalone HTML download — so whatever
 * the owner lays out in the dashboard designer is exactly what all three show.
 *
 * Geometry is in design units on a fixed page of PAGE_W × PAGE_H (the
 * flipbook's 3 : 4.1 page). Renderers scale a unit to whatever the page is
 * drawn at: a CSS length on the web, points in the PDF.
 *
 * Nothing here imports server code: the designer runs this in the browser.
 */

export const PAGE_W = 600;
export const PAGE_H = 820;
export const DESIGN_VERSION = 1;

export const LIMITS = {
  pages: 200,
  blocksPerPage: 120,
  text: 4000,
  label: 120,
  name: 80,
} as const;

export type FontKey = "display" | "sans" | "serif";
export type TextAlign = "left" | "center" | "right" | "justify";
export type VerticalAlign = "top" | "middle" | "bottom";
export type TextCase = "none" | "upper" | "lower" | "title";
export type ImageFit = "cover" | "contain";

export const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;

export const FONT_LABELS: Record<FontKey, string> = {
  display: "Space Grotesk (display)",
  sans: "Inter (body)",
  serif: "Fraunces (editorial serif)",
};

/** A two-stop linear gradient; `angle` in degrees, CSS convention (0 = to top). */
export interface Gradient {
  from: string;
  to: string;
  angle: number;
}

/**
 * Where an image comes from.
 *
 * `media` is a file in the media library (uploaded, or one of the product
 * photographs the import registered). `product` follows the block's product
 * binding: `catalogue` is the product's dedicated catalogue plate when it has
 * one (the product photo otherwise), `primary` its main product photo.
 */
export type ImageSource =
  | { kind: "media"; mediaId: string | null; url: string; alt: string | null }
  | { kind: "product"; which: "catalogue" | "primary" };

/**
 * What a block does when tapped. `product` opens the bound product's page on
 * the site; `page` turns the flipbook to a page (1-based, as printed).
 */
export type LinkTarget =
  | { kind: "none" }
  | { kind: "product" }
  | { kind: "url"; href: string }
  | { kind: "page"; page: number };

export interface BlockBase {
  id: string;
  /** Layer name in the designer; defaults to a description of the block. */
  name: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise, about the block's centre. */
  rotate: number;
  /** 0 – 1. */
  opacity: number;
  locked: boolean;
  hidden: boolean;
  /** Product this block shows; null follows the page's product. */
  productId: string | null;
  link: LinkTarget;
}

export interface TextBlock extends BlockBase {
  type: "text";
  /**
   * The words. `**double asterisks**` set a run in bold and `{{tokens}}` are
   * filled in when the page is drawn — see TOKENS.
   */
  text: string;
  font: FontKey;
  size: number;
  weight: number;
  italic: boolean;
  color: string;
  align: TextAlign;
  valign: VerticalAlign;
  /** Multiple of the font size. */
  lineHeight: number;
  /** In em. */
  letterSpacing: number;
  textCase: TextCase;
  background: string | null;
  padding: number;
  radius: number;
  /** Clamp to this many lines with an ellipsis; 0 for no limit. */
  maxLines: number;
  /** Hide the block when every token in it comes out empty. */
  hideIfEmpty: boolean;
}

export interface ImageBlock extends BlockBase {
  type: "image";
  src: ImageSource;
  fit: ImageFit;
  /** Focal point, 0 – 100 across and down; what `cover` keeps in view. */
  focusX: number;
  focusY: number;
  radius: number;
  borderWidth: number;
  borderColor: string;
  /** Fill behind the picture — shows while it loads and around `contain`. */
  background: string | null;
  gradient: Gradient | null;
}

export interface ShapeBlock extends BlockBase {
  type: "shape";
  shape: "rect" | "ellipse" | "line";
  fill: string | null;
  gradient: Gradient | null;
  stroke: string | null;
  strokeWidth: number;
  radius: number;
}

export interface ButtonBlock extends BlockBase {
  type: "button";
  label: string;
  font: FontKey;
  size: number;
  weight: number;
  color: string;
  background: string;
  borderColor: string | null;
  radius: number;
  arrow: boolean;
}

/** The table of contents, built from every page that starts a chapter. */
export interface ContentsBlock extends BlockBase {
  type: "contents";
  font: FontKey;
  size: number;
  color: string;
  accent: string;
  muted: string;
  /** Space between entries, in design units. */
  gap: number;
  numbered: boolean;
  leader: boolean;
}

/** A QR code for the block's link — the way into the site from paper. */
export interface QrBlock extends BlockBase {
  type: "qr";
  color: string;
  background: string | null;
}

export type Block = TextBlock | ImageBlock | ShapeBlock | ButtonBlock | ContentsBlock | QrBlock;
export type BlockType = Block["type"];

export interface PageBackground {
  color: string;
  gradient: Gradient | null;
  image: ImageSource | null;
  imageFit: ImageFit;
  imageOpacity: number;
  focusX: number;
  focusY: number;
  /** Colour laid over the picture, usually translucent. */
  overlay: string | null;
  /** The site's fine film grain. */
  grain: boolean;
  /** The soft leaf-green glow of the site's dark sections. */
  glow: boolean;
}

export interface DesignPage {
  id: string;
  /** What the page is called in the designer. */
  name: string;
  /**
   * Set on the page that opens a chapter: it is listed in the contents under
   * this title, and `{{chapter}}` reads it on this and the following pages.
   */
  chapter: string | null;
  /** The product this page presents; blocks follow it unless they name their own. */
  productId: string | null;
  /** Left out of the flipbook and the downloads, kept in the design. */
  hidden: boolean;
  background: PageBackground;
  blocks: Block[];
}

export interface FlipbookDesign {
  version: typeof DESIGN_VERSION;
  pages: DesignPage[];
}

/** Tokens a text block (or a button label) can carry. */
export const TOKENS: { token: string; label: string; needsProduct?: boolean }[] = [
  { token: "{{name}}", label: "Product name", needsProduct: true },
  { token: "{{description}}", label: "Product short description", needsProduct: true },
  { token: "{{tagline}}", label: "Product tagline", needsProduct: true },
  { token: "{{brand}}", label: "Supplier brand", needsProduct: true },
  { token: "{{crops}}", label: "Crops the product is for", needsProduct: true },
  { token: "{{packs}}", label: "Pack sizes", needsProduct: true },
  { token: "{{price}}", label: "Price (USD)", needsProduct: true },
  { token: "{{ranges}}", label: "Ranges the product is in", needsProduct: true },
  { token: "{{link}}", label: "Product web address", needsProduct: true },
  { token: "{{chapter}}", label: "Current chapter title" },
  { token: "{{chapterNumber}}", label: "Current chapter number (01, 02 …)" },
  { token: "{{chapterProducts}}", label: "Products in this chapter (“9 products”)" },
  { token: "{{page}}", label: "Page number" },
  { token: "{{pages}}", label: "Number of pages" },
  { token: "{{title}}", label: "Catalogue title" },
  { token: "{{year}}", label: "Catalogue year" },
  { token: "{{intro}}", label: "Catalogue introduction" },
  { token: "{{website}}", label: "Website address" },
  { token: "{{whatsapp}}", label: "WhatsApp number" },
  { token: "{{phone}}", label: "First phone number" },
  { token: "{{email}}", label: "First email address" },
];

/* ── Brand palette ─────────────────────────────────────────────────────────
 * Mirrors the tokens in globals.css so a design can use the site's colours by
 * name; a unit test holds the two together. */

export const PALETTE: { name: string; value: string }[] = [
  { name: "Humus 950", value: "#08110b" },
  { name: "Humus 900", value: "#0c1810" },
  { name: "Humus 800", value: "#122418" },
  { name: "Humus 700", value: "#1a3322" },
  { name: "Humus 500", value: "#2f583b" },
  { name: "Brand green", value: "#005820" },
  { name: "Canopy", value: "#12351f" },
  { name: "Leaf 800", value: "#3c6518" },
  { name: "Leaf 700", value: "#4d831c" },
  { name: "Leaf 600", value: "#65a824" },
  { name: "Leaf 400", value: "#a5e05f" },
  { name: "Leaf 300", value: "#c4ee8e" },
  { name: "Leaf 200", value: "#ddf6b8" },
  { name: "Soil 700", value: "#523a24" },
  { name: "Soil 600", value: "#6f5031" },
  { name: "Soil 300", value: "#c9a678" },
  { name: "Soil paper", value: "#efe9d8" },
  { name: "Paper", value: "#f6f4ec" },
  { name: "Paper dim", value: "#eeeadd" },
  { name: "Paper deep", value: "#e4dfcd" },
  { name: "Cream", value: "#fbfaf5" },
  { name: "Line", value: "#d9d4c2" },
  { name: "Ink", value: "#131a12" },
  { name: "Ink soft", value: "#3d4539" },
  { name: "Ink faint", value: "#6b7264" },
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
];

export const COLORS = {
  humus950: "#08110b",
  humus900: "#0c1810",
  humus700: "#1a3322",
  canopy: "#12351f",
  leaf200: "#ddf6b8",
  leaf300: "#c4ee8e",
  leaf400: "#a5e05f",
  leaf700: "#4d831c",
  leaf800: "#3c6518",
  soilPaper: "#efe9d8",
  soil600: "#6f5031",
  paper: "#f6f4ec",
  paperDim: "#eeeadd",
  paperDeep: "#e4dfcd",
  cream: "#fbfaf5",
  line: "#d9d4c2",
  ink: "#131a12",
  inkSoft: "#3d4539",
  inkFaint: "#6b7264",
} as const;

/* ── Helpers ────────────────────────────────────────────────────────────── */

/** Short random id, unique enough within one design. */
export function newId(prefix = ""): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  for (const byte of bytes) id += alphabet[byte % alphabet.length];
  return prefix ? `${prefix}_${id}` : id;
}

export const NO_LINK: LinkTarget = { kind: "none" };

export function defaultBackground(color: string = COLORS.cream): PageBackground {
  return {
    color,
    gradient: null,
    image: null,
    imageFit: "cover",
    imageOpacity: 1,
    focusX: 50,
    focusY: 50,
    overlay: null,
    grain: false,
    glow: false,
  };
}

function base(partial: Partial<BlockBase>): BlockBase {
  return {
    id: partial.id ?? newId("b"),
    name: partial.name ?? null,
    x: partial.x ?? 60,
    y: partial.y ?? 60,
    w: partial.w ?? 300,
    h: partial.h ?? 80,
    rotate: partial.rotate ?? 0,
    opacity: partial.opacity ?? 1,
    locked: partial.locked ?? false,
    hidden: partial.hidden ?? false,
    productId: partial.productId ?? null,
    link: partial.link ?? NO_LINK,
  };
}

export function textBlock(partial: Partial<TextBlock> = {}): TextBlock {
  return {
    ...base(partial),
    type: "text",
    text: partial.text ?? "Text",
    font: partial.font ?? "sans",
    size: partial.size ?? 16,
    weight: partial.weight ?? 400,
    italic: partial.italic ?? false,
    color: partial.color ?? COLORS.ink,
    align: partial.align ?? "left",
    valign: partial.valign ?? "top",
    lineHeight: partial.lineHeight ?? 1.4,
    letterSpacing: partial.letterSpacing ?? 0,
    textCase: partial.textCase ?? "none",
    background: partial.background ?? null,
    padding: partial.padding ?? 0,
    radius: partial.radius ?? 0,
    maxLines: partial.maxLines ?? 0,
    hideIfEmpty: partial.hideIfEmpty ?? false,
  };
}

export function imageBlock(partial: Partial<ImageBlock> = {}): ImageBlock {
  return {
    ...base({ w: 300, h: 220, ...partial }),
    type: "image",
    src: partial.src ?? { kind: "media", mediaId: null, url: "", alt: null },
    fit: partial.fit ?? "cover",
    focusX: partial.focusX ?? 50,
    focusY: partial.focusY ?? 50,
    radius: partial.radius ?? 0,
    borderWidth: partial.borderWidth ?? 0,
    borderColor: partial.borderColor ?? COLORS.line,
    background: partial.background ?? null,
    gradient: partial.gradient ?? null,
  };
}

export function shapeBlock(partial: Partial<ShapeBlock> = {}): ShapeBlock {
  return {
    ...base({ w: 200, h: 200, ...partial }),
    type: "shape",
    shape: partial.shape ?? "rect",
    fill: partial.fill === undefined ? COLORS.leaf300 : partial.fill,
    gradient: partial.gradient ?? null,
    stroke: partial.stroke ?? null,
    strokeWidth: partial.strokeWidth ?? 0,
    radius: partial.radius ?? 0,
  };
}

export function buttonBlock(partial: Partial<ButtonBlock> = {}): ButtonBlock {
  return {
    ...base({ w: 200, h: 44, ...partial }),
    type: "button",
    label: partial.label ?? "View product",
    font: partial.font ?? "display",
    size: partial.size ?? 13,
    weight: partial.weight ?? 500,
    color: partial.color ?? COLORS.paper,
    background: partial.background ?? COLORS.humus900,
    borderColor: partial.borderColor ?? null,
    radius: partial.radius ?? 999,
    arrow: partial.arrow ?? true,
  };
}

export function contentsBlock(partial: Partial<ContentsBlock> = {}): ContentsBlock {
  return {
    ...base({ w: 516, h: 520, ...partial }),
    type: "contents",
    font: partial.font ?? "display",
    size: partial.size ?? 20,
    color: partial.color ?? COLORS.ink,
    accent: partial.accent ?? COLORS.leaf700,
    muted: partial.muted ?? COLORS.inkFaint,
    gap: partial.gap ?? 18,
    numbered: partial.numbered ?? true,
    leader: partial.leader ?? true,
  };
}

export function qrBlock(partial: Partial<QrBlock> = {}): QrBlock {
  return {
    ...base({ w: 110, h: 110, link: { kind: "product" }, ...partial }),
    type: "qr",
    color: partial.color ?? COLORS.ink,
    background: partial.background === undefined ? "#ffffff" : partial.background,
  };
}

export function blankPage(partial: Partial<DesignPage> = {}): DesignPage {
  return {
    id: partial.id ?? newId("p"),
    name: partial.name ?? "Page",
    chapter: partial.chapter ?? null,
    productId: partial.productId ?? null,
    hidden: partial.hidden ?? false,
    background: partial.background ?? defaultBackground(),
    blocks: partial.blocks ?? [],
  };
}

/** Human description of a block for the layers list. */
export function describeBlock(block: Block): string {
  if (block.name) return block.name;
  switch (block.type) {
    case "text": {
      const words = block.text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
      return words ? (words.length > 32 ? `${words.slice(0, 31)}…` : words) : "Text";
    }
    case "image":
      return block.src.kind === "product" ? "Product picture" : "Picture";
    case "shape":
      return block.shape === "ellipse" ? "Ellipse" : block.shape === "line" ? "Line" : "Rectangle";
    case "button":
      return `Button · ${block.label}`;
    case "contents":
      return "Contents";
    case "qr":
      return "QR code";
  }
}

/** Whether a colour is dark enough that text on it should be light. */
export function isDarkColor(color: string): boolean {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(color);
  if (!match) return false;
  const [r, g, b] = match.slice(1, 4).map((hex) => {
    const c = parseInt(hex, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18;
}

/** Snap a weight to one the fonts ship in. */
export function snapWeight(weight: number): number {
  let best: number = FONT_WEIGHTS[0];
  for (const candidate of FONT_WEIGHTS) {
    if (Math.abs(candidate - weight) < Math.abs(best - weight)) best = candidate;
  }
  return best;
}
