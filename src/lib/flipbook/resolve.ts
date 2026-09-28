import QRCode from "qrcode";
import type {
  Block,
  ButtonBlock,
  ContentsBlock,
  DesignPage,
  FlipbookDesign,
  ImageBlock,
  ImageSource,
  LinkTarget,
  PageBackground,
  QrBlock,
  ShapeBlock,
  TextBlock,
} from "./model";

/**
 * Turns a design into the exact pages a reader sees: tokens filled in from
 * the product and catalogue data, pictures and links looked up, hidden pages
 * dropped, the contents numbered, and a blank page slipped in before the back
 * cover when the count is odd (a book needs both sides of every sheet).
 *
 * Every renderer — the web flipbook, the designer canvas, the PDF and the
 * standalone HTML — draws from this output, which is why they agree.
 */

export interface FlipbookImage {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

export interface FlipbookProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  tagline: string | null;
  description: string | null;
  crops: string[];
  packs: string[];
  priceUsd: number | null;
  pricedPackCount: number;
  ranges: string[];
  /** The product photograph. */
  image: FlipbookImage | null;
  /** The dedicated catalogue plate, when the product has one. */
  plate: FlipbookImage | null;
}

export interface FlipbookContext {
  title: string;
  year: number | null;
  intro: string | null;
  /** https://… without a trailing slash; prefixes site paths in the downloads. */
  siteUrl: string;
  whatsapp: string;
  phone: string;
  email: string;
  products: Record<string, FlipbookProduct>;
}

export interface Run {
  text: string;
  bold: boolean;
}

export type ResolvedLink =
  | { kind: "href"; href: string; external: boolean }
  | { kind: "page"; page: number };

export interface ContentsEntry {
  number: number;
  title: string;
  page: number;
}

export interface QrMatrix {
  /** Modules across, quiet zone included. */
  size: number;
  /** SVG path of the dark modules in a `0 0 size size` box. */
  path: string;
}

interface Resolution {
  href: ResolvedLink | null;
  /** Bound to a product that no longer exists (shown in the designer only). */
  missing: boolean;
}

export type ResolvedText = TextBlock & Resolution & { runs: Run[] };
export type ResolvedImage = ImageBlock & Resolution & { image: FlipbookImage | null; alt: string };
export type ResolvedShape = ShapeBlock & Resolution;
export type ResolvedButton = ButtonBlock & Resolution & { labelText: string };
export type ResolvedContents = ContentsBlock & Resolution & { entries: ContentsEntry[] };
export type ResolvedQr = QrBlock & Resolution & { qr: QrMatrix | null };

export type ResolvedBlock =
  | ResolvedText
  | ResolvedImage
  | ResolvedShape
  | ResolvedButton
  | ResolvedContents
  | ResolvedQr;

export interface ResolvedBackground extends Omit<PageBackground, "image"> {
  image: FlipbookImage | null;
}

export interface ResolvedPage {
  /** Design page id; padding pages get `pad`. */
  id: string;
  /** 1-based, as printed. */
  number: number;
  name: string;
  /** Title when this page opens a chapter. */
  chapter: string | null;
  background: ResolvedBackground;
  blocks: ResolvedBlock[];
  /** Bound to a product that no longer exists (shown in the designer only). */
  missing: boolean;
}

export interface ResolveOptions {
  /**
   * Keep pages and blocks whose product is gone, flagged `missing`, and show
   * unfilled tokens — the designer's view. Readers never see these.
   */
  designer?: boolean;
  /** Add the blank page an odd count needs (the book and the downloads). */
  pad?: boolean;
  /** Write site links as full addresses (the downloads leave the site). */
  absoluteLinks?: boolean;
  /**
   * The address those links and QR codes start with; the context's siteUrl
   * when unset. `{{website}}` and `{{link}}` always print siteUrl, the name
   * on the cover — this is only where a tap or a scan lands.
   */
  linkBase?: string;
}

const TOKEN = /\{\{\s*([A-Za-z]+)\s*\}\}/g;

function formatPrice(product: FlipbookProduct): string {
  if (product.priceUsd === null) return "";
  const amount = Number.isInteger(product.priceUsd)
    ? String(product.priceUsd)
    : product.priceUsd.toFixed(2);
  return `${product.pricedPackCount > 1 ? "from " : ""}$${amount}`;
}

function displayHost(siteUrl: string): string {
  try {
    return new URL(siteUrl).host.replace(/^www\./, "");
  } catch {
    return siteUrl;
  }
}

/** Splits `**bold**` runs; an unmatched `**` is kept as written. */
export function parseRuns(text: string): Run[] {
  const runs: Run[] = [];
  const parts = text.split("**");
  // An even number of parts means an unpaired marker: glue the last back on.
  if (parts.length % 2 === 0) {
    const tail = parts.pop()!;
    parts[parts.length - 1] += `**${tail}`;
  }
  parts.forEach((part, i) => {
    if (part) runs.push({ text: part, bold: i % 2 === 1 });
  });
  return runs;
}

export function qrMatrix(value: string): QrMatrix | null {
  if (!value) return null;
  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const quiet = 2;
    let path = "";
    for (let row = 0; row < n; row += 1) {
      let col = 0;
      while (col < n) {
        if (!qr.modules.get(row, col)) {
          col += 1;
          continue;
        }
        let run = 1;
        while (col + run < n && qr.modules.get(row, col + run)) run += 1;
        path += `M${col + quiet} ${row + quiet}h${run}v1h-${run}z`;
        col += run;
      }
    }
    return { size: n + quiet * 2, path };
  } catch {
    return null;
  }
}

interface PageState {
  number: number;
  total: number;
  chapter: string | null;
  chapterNumber: number;
  chapterProducts: number;
}

export function resolveDesign(
  design: FlipbookDesign,
  ctx: FlipbookContext,
  options: ResolveOptions = {},
): ResolvedPage[] {
  const designer = options.designer ?? false;
  const productFor = (id: string | null) => (id ? (ctx.products[id] ?? null) : null);

  // Which pages a reader gets: not hidden, and not presenting a product that
  // has since been deleted or unpublished.
  const visible = design.pages.filter((page) => {
    if (page.hidden && !designer) return false;
    if (!designer && page.productId && !productFor(page.productId)) return false;
    return true;
  });

  // The padding page goes before the back cover and copies its ground, which
  // is what a printed book's inside back cover looks like.
  const sequence: (DesignPage | "pad")[] = [...visible];
  if (options.pad && sequence.length >= 2 && sequence.length % 2 === 1) {
    sequence.splice(sequence.length - 1, 0, "pad");
  }
  const total = sequence.length;

  // Chapters, their numbers and how many product pages each holds.
  const contents: ContentsEntry[] = [];
  const chapterAt: { title: string | null; number: number }[] = [];
  const productsInChapter = new Map<number, number>();
  let current: { title: string | null; number: number } = { title: null, number: 0 };
  sequence.forEach((page, index) => {
    if (page !== "pad" && page.chapter) {
      current = { title: page.chapter, number: contents.length + 1 };
      contents.push({ number: current.number, title: page.chapter, page: index + 1 });
    }
    chapterAt.push(current);
    if (page !== "pad" && page.productId && productFor(page.productId) && current.number > 0) {
      productsInChapter.set(current.number, (productsInChapter.get(current.number) ?? 0) + 1);
    }
  });

  const linkBase = (options.linkBase ?? ctx.siteUrl).replace(/\/$/, "");
  const siteLink = (path: string) => (options.absoluteLinks ? `${linkBase}${path}` : path);

  const resolveLink = (link: LinkTarget, product: FlipbookProduct | null): ResolvedLink | null => {
    switch (link.kind) {
      case "none":
        return null;
      case "product":
        return product
          ? { kind: "href", href: siteLink(`/products/${product.slug}`), external: false }
          : null;
      case "url":
        return link.href.startsWith("/")
          ? { kind: "href", href: siteLink(link.href), external: false }
          : { kind: "href", href: link.href, external: true };
      case "page":
        return link.page <= total ? { kind: "page", page: link.page } : null;
    }
  };

  const resolveImage = (
    src: ImageSource | null,
    product: FlipbookProduct | null,
  ): FlipbookImage | null => {
    if (!src) return null;
    if (src.kind === "media") {
      return src.url
        ? { url: src.url, alt: src.alt, width: null, height: null, blurDataUrl: null }
        : null;
    }
    if (!product) return null;
    return src.which === "primary"
      ? (product.image ?? product.plate)
      : (product.plate ?? product.image);
  };

  const fill = (
    text: string,
    product: FlipbookProduct | null,
    state: PageState,
  ): { text: string; tokens: number; empty: number } => {
    let tokens = 0;
    let empty = 0;
    const value = (name: string): string | null | undefined => {
      switch (name) {
        case "name":
          return product ? product.name : null;
        case "description":
          return product ? (product.description ?? "") : null;
        case "tagline":
          return product ? (product.tagline ?? "") : null;
        case "brand":
          return product ? (product.brand ?? "") : null;
        case "crops":
          return product ? product.crops.join(", ") : null;
        case "packs":
          return product ? product.packs.join(" · ") : null;
        case "price":
          return product ? formatPrice(product) : null;
        case "ranges":
          return product ? product.ranges.join(" · ") : null;
        case "link":
          return product ? `${displayHost(ctx.siteUrl)}/products/${product.slug}` : null;
        case "chapter":
          return state.chapter ?? "";
        case "chapterNumber":
          return state.chapterNumber ? String(state.chapterNumber).padStart(2, "0") : "";
        case "chapterProducts":
          return state.chapterNumber
            ? `${state.chapterProducts} product${state.chapterProducts === 1 ? "" : "s"}`
            : "";
        case "page":
          return String(state.number);
        case "pages":
          return String(state.total);
        case "title":
          return ctx.title;
        case "year":
          return ctx.year ? String(ctx.year) : "";
        case "intro":
          return ctx.intro ?? "";
        case "website":
          return displayHost(ctx.siteUrl);
        case "whatsapp":
          return ctx.whatsapp;
        case "phone":
          return ctx.phone;
        case "email":
          return ctx.email;
        default:
          return undefined;
      }
    };
    const out = text.replace(TOKEN, (match, name: string) => {
      const resolved = value(name);
      if (resolved === undefined) return match; // not a token we know: leave it be
      tokens += 1;
      if (resolved === null) {
        // A product token with no product: the designer shows the token itself.
        empty += 1;
        return designer ? match : "";
      }
      if (!resolved.trim()) empty += 1;
      return resolved;
    });
    return { text: out, tokens, empty };
  };

  const resolveBlock = (
    block: Block,
    pageProduct: FlipbookProduct | null,
    state: PageState,
  ): ResolvedBlock | null => {
    if (block.hidden && !designer) return null;
    const product = block.productId ? productFor(block.productId) : pageProduct;
    const missing = Boolean(block.productId && !product);
    if (missing && !designer) return null;
    const base = { href: resolveLink(block.link, product), missing };

    switch (block.type) {
      case "text": {
        const filled = fill(block.text, product, state);
        if (!designer) {
          if (!filled.text.replace(/\*\*/g, "").trim()) return null;
          if (block.hideIfEmpty && filled.tokens > 0 && filled.empty === filled.tokens) return null;
        }
        return { ...block, ...base, runs: parseRuns(filled.text) };
      }
      case "image": {
        const image = resolveImage(block.src, product);
        const alt =
          (block.src.kind === "media" ? block.src.alt : null) ??
          image?.alt ??
          (product ? `${product.name} pack` : "");
        return { ...block, ...base, image, alt };
      }
      case "shape":
        return { ...block, ...base };
      case "button": {
        const labelText = fill(block.label, product, state).text;
        return { ...block, ...base, labelText };
      }
      case "contents":
        return { ...block, ...base, href: null, entries: contents };
      case "qr": {
        const target = base.href;
        const value =
          target?.kind === "href"
            ? target.href.startsWith("/")
              ? `${linkBase}${target.href}`
              : target.href
            : "";
        const qr = qrMatrix(value);
        if (!designer && !qr) return null;
        return { ...block, ...base, qr };
      }
    }
  };

  return sequence.map((page, index): ResolvedPage => {
    const chapter = chapterAt[index]!;
    const state: PageState = {
      number: index + 1,
      total,
      chapter: chapter.title,
      chapterNumber: chapter.number,
      chapterProducts: productsInChapter.get(chapter.number) ?? 0,
    };

    if (page === "pad") {
      const last = sequence[sequence.length - 1] as DesignPage;
      const ground = last.background;
      return {
        id: "pad",
        number: index + 1,
        name: "Blank",
        chapter: null,
        background: { ...ground, image: resolveImage(ground.image, productFor(last.productId)) },
        blocks: [],
        missing: false,
      };
    }

    const pageProduct = productFor(page.productId);
    return {
      id: page.id,
      number: index + 1,
      name: page.name,
      chapter: page.chapter,
      background: { ...page.background, image: resolveImage(page.background.image, pageProduct) },
      blocks: page.blocks
        .map((block) => resolveBlock(block, pageProduct, state))
        .filter((block): block is ResolvedBlock => block !== null),
      missing: Boolean(page.productId && !pageProduct),
    };
  });
}
