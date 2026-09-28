import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DESIGN_VERSION,
  PALETTE,
  blankPage,
  buttonBlock,
  contentsBlock,
  imageBlock,
  isDarkColor,
  qrBlock,
  textBlock,
  type Block,
  type FlipbookDesign,
} from "@/lib/flipbook/model";
import { parseDesign, safeHref, safeImageUrl } from "@/lib/flipbook/schema";
import {
  parseRuns,
  resolveDesign,
  type FlipbookContext,
  type FlipbookProduct,
  type ResolvedText,
} from "@/lib/flipbook/resolve";
import { generateDesign } from "@/lib/flipbook/generate";
import { TEMPLATES, estimateLines } from "@/lib/flipbook/templates";
import { pageTree } from "@/lib/flipbook/tree";
import { escapeHtml, treeToHtml } from "@/lib/flipbook/html";

const product = (id: string, extra: Partial<FlipbookProduct> = {}): FlipbookProduct => ({
  id,
  slug: id.toLowerCase(),
  name: id,
  brand: null,
  tagline: null,
  description: `${id} feeds the soil.`,
  crops: ["maize", "wheat"],
  packs: ["1 L", "5 L"],
  priceUsd: 12,
  pricedPackCount: 2,
  ranges: ["Organic"],
  image: { url: `/images/products/${id}/1.jpg`, alt: null, width: 800, height: 800, blurDataUrl: null },
  plate: null,
  ...extra,
});

const context: FlipbookContext = {
  title: "Humuson Product Guide 2026",
  year: 2026,
  intro: "The whole range.",
  siteUrl: "https://humusoncomplex.com",
  whatsapp: "+263 77 665 6433",
  phone: "+263 77 665 6433",
  email: "info@humusoncomplex.com",
  products: { Azofix: product("Azofix"), Fosfix: product("Fosfix", { packs: [], crops: [] }) },
};

const design = (pages: FlipbookDesign["pages"]): FlipbookDesign => ({ version: DESIGN_VERSION, pages });
const text = (page: ReturnType<typeof resolveDesign>[number], id: string) =>
  (page.blocks.find((b) => b.id === id) as ResolvedText | undefined)?.runs.map((r) => r.text).join("") ?? null;

describe("safe addresses", () => {
  it("accepts ordinary links", () => {
    expect(safeHref("https://humusoncomplex.com/products")).toBe("https://humusoncomplex.com/products");
    expect(safeHref("/products/in5")).toBe("/products/in5");
    expect(safeHref("mailto:info@humusoncomplex.com")).toBe("mailto:info@humusoncomplex.com");
    expect(safeHref("tel:+263776656433")).toBe("tel:+263776656433");
  });

  it("refuses script, data, protocol-relative and credentialed links", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      " javascript:alert(1)",
      "data:text/html,<script>1</script>",
      "//evil.example/x",
      "https://user:pass@evil.example/",
      "java\nscript:alert(1)",
      "/\\evil.example",
      "vbscript:x",
    ]) {
      expect(safeHref(bad), bad).toBeNull();
    }
  });

  it("keeps pictures on this site or the allowed image hosts", () => {
    expect(safeImageUrl("/images/products/in5/1.jpg")).toBe("/images/products/in5/1.jpg");
    expect(safeImageUrl("/media-files/abc123/leaf.webp")).toBe("/media-files/abc123/leaf.webp");
    expect(safeImageUrl("https://res.cloudinary.com/x/image.jpg")).toBe("https://res.cloudinary.com/x/image.jpg");
    for (const bad of [
      "/images/../../.env",
      "/images/%2e%2e/x",
      "//evil.example/x.jpg",
      "https://evil.example/x.jpg",
      "http://humusoncomplex.com/x.jpg",
      "javascript:alert(1)",
      "/images/a b.jpg",
    ]) {
      expect(safeImageUrl(bad), bad).toBeNull();
    }
  });
});

describe("parseDesign", () => {
  it("is null for anything that is not a design", () => {
    expect(parseDesign(null)).toBeNull();
    expect(parseDesign("design")).toBeNull();
    expect(parseDesign({ pages: "nope" })).toBeNull();
  });

  it("clamps, defaults and neutralises instead of failing", () => {
    const parsed = parseDesign({
      version: 7,
      pages: [
        {
          id: "p1",
          name: "Page",
          background: { color: "red" },
          blocks: [
            { type: "text", id: "t1", text: "Hi\u0000 there", size: 9000, color: "url(x)", link: { kind: "url", href: "javascript:alert(1)" } },
            { type: "marquee", id: "m1" },
            { type: "image", id: "i1", src: { kind: "media", mediaId: "m", url: "https://evil.example/x.jpg" } },
            { type: "button", id: "b1", label: "Go", link: { kind: "page", page: 99999 } },
          ],
        },
        "not a page",
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.version).toBe(DESIGN_VERSION);
    expect(parsed!.pages).toHaveLength(1);
    const [page] = parsed!.pages;
    expect(page!.background.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(page!.blocks.map((b) => b.type)).toEqual(["text", "image", "button"]);
    const [t, img, button] = page!.blocks as [Block, Block, Block];
    expect(t.type === "text" && t.text).toBe("Hi there");
    expect(t.type === "text" && t.size).toBe(200);
    expect(t.type === "text" && t.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(t.link).toEqual({ kind: "none" });
    expect(img.type === "image" && img.src).toEqual({ kind: "media", mediaId: null, url: "", alt: null });
    expect(button.link).toEqual({ kind: "none" });
  });

  it("makes duplicate ids unique", () => {
    const parsed = parseDesign(
      design([
        blankPage({ id: "same", blocks: [textBlock({ id: "b" }), textBlock({ id: "b" })] }),
        blankPage({ id: "same" }),
      ]),
    );
    expect(new Set(parsed!.pages.map((p) => p.id)).size).toBe(2);
    expect(new Set(parsed!.pages[0]!.blocks.map((b) => b.id)).size).toBe(2);
  });

  it("leaves a valid design as it was", () => {
    for (const template of TEMPLATES) {
      const d = design([template.build(["Azofix", "Fosfix", null, null])]);
      expect(parseDesign(JSON.parse(JSON.stringify(d))), template.key).toEqual(d);
    }
  });
});

describe("resolveDesign", () => {
  const cover = blankPage({ id: "cover", blocks: [textBlock({ id: "title", text: "{{title}} · {{year}}" })] });
  const chapter = blankPage({ id: "chapter", chapter: "Organic", blocks: [textBlock({ id: "count", text: "{{chapterProducts}}" })] });
  const azofix = blankPage({
    id: "azofix",
    productId: "Azofix",
    blocks: [
      textBlock({ id: "name", text: "**{{name}}** — {{price}}" }),
      textBlock({ id: "packs", text: "Packs: {{packs}}", hideIfEmpty: true }),
      textBlock({ id: "where", text: "{{chapter}} {{chapterNumber}} p{{page}}/{{pages}}" }),
      buttonBlock({ id: "go", link: { kind: "product" } }),
      buttonBlock({ id: "far", link: { kind: "page", page: 40 } }),
    ],
  });
  const fosfix = blankPage({
    id: "fosfix",
    productId: "Fosfix",
    blocks: [textBlock({ id: "packs", text: "Packs: {{packs}}", hideIfEmpty: true })],
  });
  const gone = blankPage({ id: "gone", productId: "Deleted", blocks: [textBlock({ id: "n", text: "{{name}}" })] });
  const hidden = blankPage({ id: "hidden", hidden: true });
  const contents = blankPage({ id: "contents", blocks: [contentsBlock({ id: "toc" })] });
  const back = blankPage({ id: "back" });
  const d = design([cover, contents, chapter, azofix, fosfix, gone, hidden, back]);

  it("fills tokens from the product, the chapter and the catalogue", () => {
    const pages = resolveDesign(d, context);
    const az = pages.find((p) => p.id === "azofix")!;
    expect(text(az, "name")).toBe("Azofix — from $12");
    expect((az.blocks.find((b) => b.id === "name") as ResolvedText).runs[0]).toEqual({ text: "Azofix", bold: true });
    expect(text(az, "packs")).toBe("Packs: 1 L · 5 L");
    expect(text(az, "where")).toBe(`Organic 01 p4/${pages.length}`);
    expect(text(pages[0]!, "title")).toBe("Humuson Product Guide 2026 · 2026");
    expect(text(pages.find((p) => p.id === "chapter")!, "count")).toBe("2 products");
  });

  it("hides empty fields, gone products and hidden pages from readers", () => {
    const pages = resolveDesign(d, context);
    expect(pages.map((p) => p.id)).toEqual(["cover", "contents", "chapter", "azofix", "fosfix", "back"]);
    expect(pages.find((p) => p.id === "fosfix")!.blocks).toHaveLength(0);
  });

  it("keeps them, flagged, for the designer", () => {
    const pages = resolveDesign(d, context, { designer: true });
    expect(pages).toHaveLength(d.pages.length);
    expect(pages.find((p) => p.id === "gone")!.missing).toBe(true);
    expect(text(pages.find((p) => p.id === "gone")!, "n")).toBe("{{name}}");
  });

  it("numbers the contents from the pages that start chapters", () => {
    const pages = resolveDesign(d, context);
    const toc = pages[1]!.blocks[0]!;
    expect(toc.type === "contents" && toc.entries).toEqual([{ number: 1, title: "Organic", page: 3 }]);
  });

  it("pads an odd book with a blank page before the back cover", () => {
    const odd = design([cover, chapter, azofix, back]).pages.slice(0, 3);
    const pages = resolveDesign(design([...odd]), context, { pad: true });
    expect(pages).toHaveLength(4);
    expect(pages[2]!.id).toBe("pad");
    expect(pages[3]!.id).toBe("azofix");
    expect(resolveDesign(design(odd), context).length).toBe(3);
  });

  it("links products on the site, and in full for the downloads", () => {
    const relative = resolveDesign(d, context).find((p) => p.id === "azofix")!;
    const absolute = resolveDesign(d, context, { absoluteLinks: true }).find((p) => p.id === "azofix")!;
    expect(relative.blocks.find((b) => b.id === "go")!.href).toEqual({ kind: "href", href: "/products/azofix", external: false });
    expect(absolute.blocks.find((b) => b.id === "go")!.href).toEqual({
      kind: "href",
      href: "https://humusoncomplex.com/products/azofix",
      external: false,
    });
    // A page that does not exist is no link at all.
    expect(relative.blocks.find((b) => b.id === "far")!.href).toBeNull();
  });

  it("points download links at the site they came from, and still prints the brand domain", () => {
    const page = blankPage({
      productId: "Azofix",
      blocks: [buttonBlock({ id: "go", link: { kind: "product" } }), textBlock({ id: "site", text: "{{website}}" })],
    });
    const [resolved] = resolveDesign(design([page]), context, {
      absoluteLinks: true,
      linkBase: "https://hummuson-complex.vercel.app/",
    });
    expect(resolved!.blocks.find((b) => b.id === "go")!.href).toEqual({
      kind: "href",
      href: "https://hummuson-complex.vercel.app/products/azofix",
      external: false,
    });
    expect(text(resolved!, "site")).toBe("humusoncomplex.com");
  });

  it("draws a QR code for the link", () => {
    const qr = resolveDesign(design([blankPage({ productId: "Azofix", blocks: [qrBlock({ id: "q" })] })]), context)[0]!.blocks[0]!;
    expect(qr.type === "qr" && qr.qr?.size).toBeGreaterThan(20);
    expect(qr.type === "qr" && qr.qr?.path).toMatch(/^M\d/);
  });
});

describe("parseRuns", () => {
  it("splits bold runs and keeps an unpaired marker", () => {
    expect(parseRuns("a **b** c")).toEqual([
      { text: "a ", bold: false },
      { text: "b", bold: true },
      { text: " c", bold: false },
    ]);
    expect(parseRuns("5 ** 2")).toEqual([{ text: "5 ** 2", bold: false }]);
  });
});

describe("generateDesign", () => {
  const input = {
    year: 2026,
    sections: [
      { title: "Organic", slug: "organic", intro: "Soil first.", theme: "soil", image: null, products: [
        { id: "Azofix", slug: "azofix", name: "Azofix" },
        { id: "Fosfix", slug: "fosfix", name: "Fosfix" },
      ] },
      { title: "Crop Nutrition", slug: "crop-nutrition", intro: null, theme: "nutrition", image: null, products: [
        { id: "Azofix", slug: "azofix", name: "Azofix" },
      ] },
      { title: "Empty", slug: "empty", intro: null, theme: "soil", image: null, products: [] },
    ],
  };

  it("lays out cover, contents, a chapter per range with its products, and the back", () => {
    const generated = generateDesign(input);
    expect(generated.pages.map((p) => p.name)).toEqual([
      "Cover",
      "Contents",
      "Chapter · Organic",
      "Azofix",
      "Fosfix",
      "Chapter · Crop Nutrition",
      "Azofix",
      "Back cover",
    ]);
    expect(generated.pages.filter((p) => p.chapter).map((p) => p.chapter)).toEqual(["Organic", "Crop Nutrition"]);
  });

  it("is stable: the same ranges give the same ids", () => {
    expect(generateDesign(input)).toEqual(generateDesign(input));
    const ids = generateDesign(input).pages.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is a valid design", () => {
    const generated = generateDesign(input);
    expect(parseDesign(JSON.parse(JSON.stringify(generated)))).toEqual(generated);
  });
});

describe("html", () => {
  it("escapes the owner's words and never lets them become markup", () => {
    const page = resolveDesign(
      design([
        blankPage({
          blocks: [
            textBlock({ text: '<script>alert("x")</script> & **"bold"**' }),
            imageBlock({ src: { kind: "media", mediaId: null, url: "/images/a.jpg", alt: '"><img src=x onerror=alert(1)>' } }),
          ],
        }),
      ]),
      context,
    )[0]!;
    const html = treeToHtml(pageTree(page), () => "/images/a.jpg");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;");
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});

describe("helpers", () => {
  it("estimates lines on the long side", () => {
    expect(estimateLines("Kalisto", 28, 528)).toBe(1);
    expect(estimateLines("A very long product name that will surely wrap", 28, 300)).toBeGreaterThan(1);
    expect(estimateLines("one\ntwo", 12, 500)).toBe(2);
  });

  it("knows dark grounds from light", () => {
    expect(isDarkColor("#08110b")).toBe(true);
    expect(isDarkColor("#12351f")).toBe(true);
    expect(isDarkColor("#fbfaf5")).toBe(false);
    expect(isDarkColor("#ddf6b8")).toBe(false);
  });

  it("offers the site's own colours", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8").toLowerCase();
    // Colours the palette adds beyond the theme tokens, each on purpose.
    const extras = new Set(["#efe9d8", "#12351f", "#ffffff", "#000000"]);
    for (const swatch of PALETTE) {
      if (extras.has(swatch.value)) continue;
      expect(css, `${swatch.name} ${swatch.value}`).toContain(swatch.value);
    }
  });
});
