import {
  COLORS,
  PAGE_H,
  PAGE_W,
  blankPage,
  buttonBlock,
  contentsBlock,
  defaultBackground,
  imageBlock,
  newId,
  qrBlock,
  shapeBlock,
  textBlock,
  type Block,
  type DesignPage,
  type TextBlock,
} from "./model";

/**
 * Page layouts: what "Rebuild from the ranges" lays the catalogue out with,
 * and the starting points the designer offers when adding a page. They are
 * ordinary pages once placed — every block can be moved, restyled or deleted.
 *
 * Sizes are the old fixed flipbook's, converted to design units (its body
 * type was 1/28.8 of the page width), so a rebuilt catalogue reads as before.
 */

const PAD = 42;
const INNER = PAGE_W - PAD * 2;

/** Chapter grounds, by the section theme the importer assigns. */
export const CHAPTER_THEMES: Record<string, { color: string; dark: boolean; label: string }> = {
  soil: { color: COLORS.soilPaper, dark: false, label: "Soil" },
  biology: { color: COLORS.humus900, dark: true, label: "Biology" },
  vitality: { color: COLORS.leaf200, dark: false, label: "Vitality" },
  nutrition: { color: COLORS.paperDeep, dark: false, label: "Nutrition" },
  canopy: { color: COLORS.canopy, dark: true, label: "Canopy" },
};

/** Paper colour at an opacity, as #rrggbbaa. */
const paperAt = (alpha: number) =>
  `${COLORS.paper}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

const eyebrow = (partial: Partial<TextBlock>): TextBlock =>
  textBlock({
    font: "display",
    weight: 500,
    size: 12.5,
    lineHeight: 1.2,
    letterSpacing: 0.22,
    textCase: "upper",
    h: 18,
    ...partial,
  });

/**
 * Rough number of lines `text` needs — used to stack generated blocks, never
 * to clip anything. It errs on the long side: a guess one line too many
 * leaves a little air, one too few would overlap.
 */
export function estimateLines(text: string, size: number, width: number, charEm = 0.56): number {
  const perLine = Math.max(1, Math.floor(width / (size * charEm)));
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = 0;
    let count = 1;
    for (const word of words) {
      const length = word.length;
      if (current === 0) current = length;
      else if (current + 1 + length <= perLine) current += 1 + length;
      else {
        count += 1;
        current = length;
      }
    }
    lines += count;
  }
  return Math.max(1, lines);
}

/** A short, stable id from a string, so a rebuilt design keeps its ids. */
export function stableId(prefix: string, key: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

type Ids = (role: string) => string;
const idsFor = (pageId: string): Ids => (role) => `${pageId}-${role}`.slice(0, 40);
const randomIds: Ids = () => newId("b");

export function coverPage(options: { id?: string; year?: boolean } = {}): DesignPage {
  const id = options.id ?? newId("p");
  const ids = options.id ? idsFor(id) : randomIds;
  const background = { ...defaultBackground(COLORS.humus950), grain: true, glow: true };
  return blankPage({
    id,
    name: "Cover",
    background,
    blocks: [
      eyebrow({
        id: ids("eyebrow"),
        text: options.year === false ? "Humuson Complex" : "Humuson Complex · {{year}}",
        color: COLORS.leaf400,
        x: PAD,
        y: PAD,
        w: INNER,
      }),
      textBlock({
        id: ids("title"),
        text: "Product\nGuide",
        font: "display",
        weight: 600,
        size: 54,
        lineHeight: 1.02,
        letterSpacing: -0.025,
        color: COLORS.paper,
        valign: "bottom",
        x: PAD,
        y: 262,
        w: INNER,
        h: 150,
      }),
      textBlock({
        id: ids("intro"),
        text: "{{intro}}",
        size: 15,
        lineHeight: 1.625,
        color: paperAt(0.65),
        x: PAD,
        y: 427,
        w: INNER,
        h: 130,
        hideIfEmpty: true,
      }),
      eyebrow({
        id: ids("footer"),
        text: "Home of healthy soil & healthy crop",
        size: 11.4,
        color: paperAt(0.4),
        x: PAD,
        y: PAGE_H - PAD - 16,
        w: INNER,
        h: 16,
      }),
    ],
  });
}

export function contentsPage(options: { id?: string } = {}): DesignPage {
  const id = options.id ?? newId("p");
  const ids = options.id ? idsFor(id) : randomIds;
  return blankPage({
    id,
    name: "Contents",
    background: defaultBackground(COLORS.cream),
    blocks: [
      eyebrow({ id: ids("eyebrow"), text: "Contents", color: COLORS.leaf700, x: PAD, y: PAD, w: INNER }),
      contentsBlock({ id: ids("list"), x: PAD, y: 92, w: INNER, h: 560 }),
      textBlock({
        id: ids("note"),
        text: "Tap any product page to open its full details, rates and crop guidance.",
        size: 12.9,
        lineHeight: 1.625,
        color: COLORS.inkFaint,
        valign: "bottom",
        x: PAD,
        y: PAGE_H - PAD - 60,
        w: INNER,
        h: 60,
      }),
    ],
  });
}

export function chapterPage(options: {
  id?: string;
  title: string;
  intro?: string | null;
  theme?: string;
  image?: { url: string; alt: string | null } | null;
}): DesignPage {
  const id = options.id ?? newId("p");
  const ids = options.id ? idsFor(id) : randomIds;
  const theme = CHAPTER_THEMES[options.theme ?? "soil"] ?? {
    color: COLORS.paperDim,
    dark: false,
    label: "",
  };
  const dark = theme.dark;
  const background = {
    ...defaultBackground(theme.color),
    image: options.image
      ? { kind: "media" as const, mediaId: null, url: options.image.url, alt: options.image.alt }
      : null,
    imageOpacity: 0.25,
  };

  // Stacked from the foot of the page up, as the old chapter page was.
  const bottom = PAGE_H - PAD;
  const countH = 20;
  const countY = bottom - countH;
  const intro = options.intro?.trim() ?? "";
  const introLines = intro ? estimateLines(intro, 15, INNER, 0.52) : 0;
  const introH = introLines ? Math.ceil(introLines * 15 * 1.625) + 4 : 0;
  const introY = countY - 13 - introH;
  const titleLines = estimateLines(options.title, 43.7, INNER, 0.6);
  const titleH = Math.ceil(titleLines * 43.7 * 1.05) + 6;
  const titleY = (intro ? introY - 12 : countY - 14) - titleH;

  const blocks = [
    eyebrow({
      id: ids("eyebrow"),
      text: "Chapter {{chapterNumber}}",
      color: dark ? COLORS.leaf400 : COLORS.leaf800,
      x: PAD,
      y: titleY - 8 - 18,
      w: INNER,
    }),
    textBlock({
      id: ids("title"),
      text: "{{chapter}}",
      font: "display",
      weight: 600,
      size: 43.7,
      lineHeight: 1.05,
      letterSpacing: -0.025,
      color: dark ? COLORS.paper : COLORS.ink,
      valign: "bottom",
      x: PAD,
      y: titleY,
      w: INNER,
      h: titleH,
    }),
  ];
  if (intro) {
    blocks.push(
      textBlock({
        id: ids("intro"),
        text: intro,
        size: 15,
        lineHeight: 1.625,
        color: dark ? paperAt(0.7) : COLORS.inkSoft,
        valign: "bottom",
        x: PAD,
        y: introY,
        w: INNER,
        h: introH,
      }),
    );
  }
  blocks.push(
    textBlock({
      id: ids("count"),
      text: "{{chapterProducts}}",
      size: 12.9,
      lineHeight: 1.5,
      color: dark ? paperAt(0.5) : COLORS.inkFaint,
      x: PAD,
      y: countY,
      w: INNER,
      h: countH,
      hideIfEmpty: true,
    }),
  );

  return blankPage({
    id,
    name: `Chapter · ${options.title}`,
    chapter: options.title,
    background,
    blocks,
  });
}

export function productPage(options: {
  id?: string;
  productId: string | null;
  name?: string;
}): DesignPage {
  const id = options.id ?? newId("p");
  const ids = options.id ? idsFor(id) : randomIds;
  const imageH = 426;
  const textX = 36;
  const textW = PAGE_W - textX * 2;
  const nameLines = options.name ? estimateLines(options.name, 28, textW, 0.6) : 2;
  const nameY = imageH + 36;
  const nameH = Math.ceil(Math.min(3, nameLines) * 28 * 1.25) + 4;
  const descY = nameY + nameH + 4;

  return blankPage({
    id,
    name: options.name ?? "Product",
    productId: options.productId,
    background: defaultBackground(COLORS.cream),
    blocks: [
      imageBlock({
        id: ids("plate"),
        src: { kind: "product", which: "catalogue" },
        gradient: { from: COLORS.paperDim, to: COLORS.paperDeep, angle: 135 },
        x: 0,
        y: 0,
        w: PAGE_W,
        h: imageH,
      }),
      eyebrow({
        id: ids("chapter"),
        text: "{{chapter}}",
        size: 10.4,
        color: COLORS.inkFaint,
        x: textX,
        y: 17,
        w: 420,
        h: 16,
        hideIfEmpty: true,
      }),
      textBlock({
        id: ids("name"),
        text: "{{name}}",
        font: "display",
        weight: 600,
        size: 28,
        lineHeight: 1.25,
        color: COLORS.ink,
        x: textX,
        y: nameY,
        w: textW,
        h: nameH,
      }),
      textBlock({
        id: ids("description"),
        text: "{{description}}",
        size: 14.2,
        lineHeight: 1.625,
        color: COLORS.inkSoft,
        maxLines: 3,
        hideIfEmpty: true,
        x: textX,
        y: descY,
        w: textW,
        h: 74,
      }),
      textBlock({
        id: ids("crops"),
        text: "**Crops:** {{crops}}",
        size: 12.5,
        lineHeight: 1.5,
        color: COLORS.inkFaint,
        textCase: "title",
        maxLines: 1,
        hideIfEmpty: true,
        x: textX,
        y: 690,
        w: textW,
        h: 20,
      }),
      textBlock({
        id: ids("packs"),
        text: "**Packs:** {{packs}}",
        size: 12.5,
        lineHeight: 1.5,
        color: COLORS.inkFaint,
        valign: "middle",
        maxLines: 1,
        hideIfEmpty: true,
        x: textX,
        y: 714,
        w: 356,
        h: 30,
      }),
      buttonBlock({
        id: ids("button"),
        label: "View product",
        size: 12.5,
        link: { kind: "product" },
        x: PAGE_W - textX - 146,
        y: 714,
        w: 146,
        h: 30,
      }),
      textBlock({
        id: ids("number"),
        text: "{{page}}",
        size: 10.4,
        align: "center",
        color: `${COLORS.inkFaint}99`,
        x: 250,
        y: PAGE_H - 25 - 16,
        w: 100,
        h: 16,
      }),
    ],
  });
}

export function backPage(options: { id?: string } = {}): DesignPage {
  const id = options.id ?? newId("p");
  const ids = options.id ? idsFor(id) : randomIds;
  return blankPage({
    id,
    name: "Back cover",
    background: { ...defaultBackground(COLORS.humus950), grain: true },
    blocks: [
      imageBlock({
        id: ids("logo"),
        name: "Logo",
        src: { kind: "media", mediaId: null, url: "/images/brand/logo-white.png", alt: "Humuson Complex" },
        fit: "contain",
        x: 170,
        y: 300,
        w: 260,
        h: 94,
      }),
      textBlock({
        id: ids("title"),
        text: "{{title}}",
        font: "display",
        weight: 600,
        size: 22.9,
        lineHeight: 1.25,
        align: "center",
        color: COLORS.paper,
        x: PAD,
        y: 420,
        w: INNER,
        h: 32,
      }),
      textBlock({
        id: ids("contact"),
        text: "{{website}} · WhatsApp {{whatsapp}}",
        size: 13.5,
        lineHeight: 1.5,
        align: "center",
        color: paperAt(0.6),
        x: PAD,
        y: 462,
        w: INNER,
        h: 22,
      }),
    ],
  });
}

/* ── Extra starting points for the designer ─────────────────────────────── */

/** Two products on one page, each half bound to its own product. */
export function twoProductsPage(productIds: [string | null, string | null]): DesignPage {
  const blocks: Block[] = productIds.flatMap((productId, i): Block[] => {
    const y = i === 0 ? 0 : PAGE_H / 2;
    return [
      imageBlock({
        productId,
        src: { kind: "product", which: "catalogue" },
        gradient: { from: COLORS.paperDim, to: COLORS.paperDeep, angle: 135 },
        x: 0,
        y,
        w: 260,
        h: PAGE_H / 2,
      }),
      textBlock({
        productId,
        text: "{{name}}",
        font: "display",
        weight: 600,
        size: 24,
        lineHeight: 1.2,
        x: 290,
        y: y + 40,
        w: 270,
        h: 62,
        valign: "bottom",
      }),
      textBlock({
        productId,
        text: "{{description}}",
        size: 13,
        lineHeight: 1.55,
        color: COLORS.inkSoft,
        maxLines: 6,
        hideIfEmpty: true,
        x: 290,
        y: y + 112,
        w: 270,
        h: 125,
      }),
      textBlock({
        productId,
        text: "**Packs:** {{packs}}",
        size: 11.5,
        color: COLORS.inkFaint,
        maxLines: 2,
        hideIfEmpty: true,
        x: 290,
        y: y + 250,
        w: 270,
        h: 36,
      }),
      buttonBlock({
        productId,
        link: { kind: "product" },
        size: 12,
        x: 290,
        y: y + 330,
        w: 150,
        h: 30,
      }),
    ];
  });
  blocks.push(
    shapeBlock({ shape: "line", stroke: COLORS.line, strokeWidth: 1.5, x: 0, y: PAGE_H / 2 - 1, w: PAGE_W, h: 2 }),
  );
  return blankPage({ name: "Two products", background: defaultBackground(COLORS.cream), blocks });
}

/** A four-up grid of products. */
export function productGridPage(productIds: (string | null)[]): DesignPage {
  const cellW = (PAGE_W - PAD * 2 - 24) / 2;
  const cellH = (PAGE_H - PAD * 2 - 60 - 24) / 2;
  const blocks = [
    eyebrow({ text: "{{chapter}}", color: COLORS.leaf700, x: PAD, y: PAD, w: INNER, hideIfEmpty: true }),
    ...productIds.slice(0, 4).flatMap((productId, i) => {
      const x = PAD + (i % 2) * (cellW + 24);
      const y = PAD + 60 + Math.floor(i / 2) * (cellH + 24);
      return [
        imageBlock({
          productId,
          src: { kind: "product", which: "catalogue" },
          gradient: { from: COLORS.paperDim, to: COLORS.paperDeep, angle: 135 },
          radius: 14,
          link: { kind: "product" },
          x,
          y,
          w: cellW,
          h: cellH - 78,
        }),
        textBlock({
          productId,
          text: "{{name}}",
          font: "display",
          weight: 600,
          size: 17,
          lineHeight: 1.2,
          maxLines: 2,
          x,
          y: y + cellH - 70,
          w: cellW,
          h: 42,
        }),
        textBlock({
          productId,
          text: "{{packs}}",
          size: 11,
          color: COLORS.inkFaint,
          maxLines: 1,
          hideIfEmpty: true,
          x,
          y: y + cellH - 24,
          w: cellW,
          h: 18,
        }),
      ];
    }),
  ];
  return blankPage({ name: "Product grid", background: defaultBackground(COLORS.cream), blocks });
}

export function photoPage(): DesignPage {
  return blankPage({
    name: "Photograph",
    background: {
      ...defaultBackground(COLORS.humus900),
      overlay: "#08110b59",
    },
    blocks: [
      textBlock({
        text: "A caption for the photograph",
        font: "serif",
        italic: true,
        size: 30,
        lineHeight: 1.2,
        color: COLORS.paper,
        valign: "bottom",
        x: PAD,
        y: PAGE_H - PAD - 140,
        w: INNER,
        h: 140,
      }),
    ],
  });
}

export function textPage(): DesignPage {
  return blankPage({
    name: "Text",
    background: defaultBackground(COLORS.paper),
    blocks: [
      eyebrow({ text: "Section", color: COLORS.leaf700, x: PAD, y: PAD, w: INNER }),
      textBlock({
        text: "A heading",
        font: "display",
        weight: 600,
        size: 40,
        lineHeight: 1.08,
        letterSpacing: -0.02,
        x: PAD,
        y: 80,
        w: INNER,
        h: 100,
      }),
      textBlock({
        text: "Write the body text here. **Double asterisks** set words in bold.",
        size: 15,
        lineHeight: 1.65,
        color: COLORS.inkSoft,
        x: PAD,
        y: 200,
        w: INNER,
        h: 540,
      }),
    ],
  });
}

export function qrPage(productId: string | null): DesignPage {
  const page = productPage({ productId });
  page.name = "Product with QR code";
  page.blocks = page.blocks.filter((block) => block.type !== "button");
  page.blocks.push(qrBlock({ x: PAGE_W - 36 - 92, y: 650, w: 92, h: 92 }));
  return page;
}

export const TEMPLATES: { key: string; label: string; needsProduct?: number; build: (products: (string | null)[]) => DesignPage }[] = [
  { key: "blank", label: "Blank page", build: () => blankPage({ name: "Blank" }) },
  { key: "cover", label: "Cover", build: () => coverPage() },
  { key: "contents", label: "Contents", build: () => contentsPage() },
  { key: "chapter", label: "Chapter opener", build: () => chapterPage({ title: "New chapter", intro: "A line or two about this chapter." }) },
  { key: "product", label: "Product page", needsProduct: 1, build: ([p]) => productPage({ productId: p ?? null }) },
  { key: "product-qr", label: "Product page with QR code", needsProduct: 1, build: ([p]) => qrPage(p ?? null) },
  { key: "two", label: "Two products", needsProduct: 2, build: ([a, b]) => twoProductsPage([a ?? null, b ?? null]) },
  { key: "grid", label: "Four-product grid", needsProduct: 4, build: (ids) => productGridPage([0, 1, 2, 3].map((i) => ids[i] ?? null)) },
  { key: "photo", label: "Full-page photograph", build: () => photoPage() },
  { key: "text", label: "Text page", build: () => textPage() },
  { key: "back", label: "Back cover", build: () => backPage() },
];
