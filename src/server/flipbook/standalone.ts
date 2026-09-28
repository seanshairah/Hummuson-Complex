import { readFile } from "node:fs/promises";
import path from "node:path";
import { snapWeight, type FontKey } from "@/lib/flipbook/model";
import type { ResolvedPage } from "@/lib/flipbook/resolve";
import { boldWeight, FLIPBOOK_PAGE_CSS, pageTree, type TreeNode } from "@/lib/flipbook/tree";
import { escapeHtml, treeToHtml } from "@/lib/flipbook/html";
import { ENGINE_JS } from "./engine";
import { forHtml, loadPictures } from "./images";

/**
 * The HTML download: one self-contained file — pages, pictures, fonts and
 * the page-turning book — that opens in any browser with no connection.
 * The pages are the very markup the site renders (tree.ts), so the file
 * looks like the flipbook because it is the flipbook.
 */

const FONT_PACKAGE: Record<FontKey, string> = {
  display: "space-grotesk",
  sans: "inter",
  serif: "fraunces",
};
const FONT_FAMILY: Record<FontKey, string> = {
  display: "FbDisplay",
  sans: "FbSans",
  serif: "FbSerif",
};

type Face = `${FontKey}:${number}:${"normal" | "italic"}`;

/** The font files the pages (and the book around them) actually use. */
function facesUsed(pages: ResolvedPage[]): Set<Face> {
  const faces = new Set<Face>([
    "display:500:normal",
    "sans:400:normal",
    "sans:500:normal",
    "sans:600:normal",
  ]);
  const add = (font: FontKey, weight: number, italic = false) => {
    const w = font === "display" ? Math.min(700, snapWeight(weight)) : snapWeight(weight);
    // Space Grotesk has no italic; the browser slants the upright face.
    const style = italic && font !== "display" ? "italic" : "normal";
    faces.add(`${font}:${w}:${style}`);
  };
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.type === "text") {
        add(block.font, block.weight, block.italic);
        if (block.runs.some((run) => run.bold)) add(block.font, boldWeight(block.weight), block.italic);
      } else if (block.type === "button") {
        add(block.font, block.weight);
      } else if (block.type === "contents") {
        add(block.font, 400);
        add(block.font, 500);
        add(block.font, 600);
      }
    }
  }
  return faces;
}

async function fontFaces(faces: Set<Face>): Promise<string> {
  const rules = await Promise.all(
    [...faces].map(async (face) => {
      const [font, weight, style] = face.split(":") as [FontKey, string, string];
      const pkg = FONT_PACKAGE[font];
      const file = path.join(
        process.cwd(),
        "node_modules",
        "@fontsource",
        pkg,
        "files",
        `${pkg}-latin-${weight}-${style}.woff2`,
      );
      try {
        const bytes = await readFile(file);
        return `@font-face{font-family:"${FONT_FAMILY[font]}";font-style:${style};font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2")}`;
      } catch {
        return "";
      }
    }),
  );
  return rules.join("\n");
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

const ICONS: Record<string, string> = {
  "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  "zoom-in": '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>',
  "zoom-out": '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
};

const icon = (name: string, extra = "") =>
  `<svg class="fb-ico${extra ? ` ${extra}` : ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")";

const SHELL_CSS = `
:root{--font-space-grotesk:"FbDisplay";--font-inter:"FbSans";--font-fraunces:"FbSerif";color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{background:#08110b;color:#f6f4ec;font-family:"FbSans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
.fb{position:relative;isolation:isolate;display:flex;flex-direction:column;min-height:100dvh;background:#08110b}
.fb::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.5;background-image:${GRAIN}}
.fb-glow{position:fixed;inset:0;pointer-events:none;background:radial-gradient(42rem 26rem at 78% 12%,rgb(132 204 53 / .14),transparent 60%),radial-gradient(36rem 24rem at 12% 88%,rgb(47 88 59 / .35),transparent 65%)}
.fb-top{position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:1.25rem 1rem .5rem}
.fb-pill{display:flex;flex:none;align-items:center;gap:.5rem;border:1px solid rgb(246 244 236 / .2);border-radius:999px;padding:.5rem .9rem;font-size:.875rem;font-weight:500;color:rgb(246 244 236 / .85);text-decoration:none;white-space:nowrap;transition:border-color .2s}
.fb-pill:hover,.fb-tool:hover{border-color:rgb(246 244 236 / .5)}
.fb-tools{display:flex;align-items:center;gap:.375rem}
.fb-tool{display:flex;width:2.5rem;height:2.5rem;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgb(246 244 236 / .2);color:rgb(246 244 236 / .85);text-decoration:none;transition:border-color .2s}
.fb-ico{width:1rem;height:1rem;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.fb-arrow .fb-ico{width:1.25rem;height:1.25rem}
.fb-on,[data-on] .fb-off{display:none}
[data-on] .fb-on{display:block}
.fb-desk{position:relative;z-index:10;display:none;flex:1;align-items:center;justify-content:center;padding:1.5rem 2rem}
.fb-arrow{display:flex;width:3rem;height:3rem;flex:none;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgb(246 244 236 / .2);color:#f6f4ec;transition:all .2s}
.fb-arrow:disabled{opacity:.25;cursor:default}
.fb-arrow:not(:disabled):hover{border-color:#a5e05f;color:#c4ee8e}
.fb-prev{margin-right:1.5rem}.fb-next{margin-left:1.5rem}
.fb-zoom{transition:transform .5s}
.fb-zoom.on{transform:scale(1.25)}
.fb-book{position:relative;perspective:2600px;width:min(60vw,58rem);aspect-ratio:3/2.05}
.fb-shadow{position:absolute;left:2rem;right:2rem;bottom:-1.25rem;height:2.5rem;border-radius:50%;background:rgb(0 0 0 / .45);filter:blur(24px)}
.fb-sheet{position:absolute;top:0;right:0;width:50%;height:100%;transform-style:preserve-3d;transform-origin:left center;transition:transform .85s cubic-bezier(.35,.1,.2,1)}
.fb-face{position:absolute;inset:0;overflow:hidden;cursor:pointer;-webkit-backface-visibility:hidden;backface-visibility:hidden;box-shadow:0 1px 2px rgb(0 0 0 / .35)}
.fb-face.r{border-radius:0 .75rem .75rem 0}
.fb-face.l{border-radius:.75rem 0 0 .75rem;transform:rotateY(180deg)}
.fb-shade{position:absolute;top:0;bottom:0;width:1.5rem;pointer-events:none}
.fb-face.r .fb-shade{left:0;background:linear-gradient(to right,rgb(0 0 0 / .25),transparent)}
.fb-face.l .fb-shade{right:0;background:linear-gradient(to left,rgb(0 0 0 / .25),transparent)}
.fb-mobile{position:relative;z-index:10;flex:1}
.fb-reader{display:flex;height:100%;gap:1rem;overflow-x:auto;scroll-snap-type:x mandatory;padding:1rem 1.5rem;scrollbar-width:none}
.fb-reader::-webkit-scrollbar{display:none}
.fb-page{position:relative;flex:none;width:82vw;aspect-ratio:3/4.1;scroll-snap-align:center;overflow:hidden;border-radius:.75rem;box-shadow:0 24px 60px -24px rgb(0 0 0 / .7)}
.fb-foot{position:relative;z-index:10;display:flex;justify-content:center;padding:.5rem 1.5rem 1.5rem}
.fb-label{margin:0;font-family:"FbDisplay",system-ui,sans-serif;font-weight:500;font-size:.875rem;color:rgb(246 244 236 / .7)}
@media (min-width:768px){.fb-top{padding:1.75rem 2rem .5rem}.fb-desk{display:flex}.fb-mobile{display:none}}
@media (max-width:767px){.fb-wide{display:none}}
@media (max-width:519px){.fb-site{display:none}.fb-pill{padding:0;width:2.5rem;height:2.5rem;justify-content:center}.fb-tools{gap:.25rem}}
.fb-modal{position:fixed;border:0;padding:1.5rem;border-radius:1.25rem;width:min(92vw,28rem);max-height:82dvh;overflow:auto;background:#fbfaf5;color:#131a12;box-shadow:0 30px 80px -20px rgb(0 0 0 / .55)}
.fb-modal-wide{width:min(94vw,48rem)}
.fb-modal::backdrop{background:rgb(8 17 11 / .6);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.fb-modal h2{margin:0;padding-right:2rem;font-family:"FbDisplay",system-ui,sans-serif;font-weight:500;font-size:1.35rem;letter-spacing:-.01em}
.fb-close{position:absolute;top:1rem;right:1rem;border-radius:999px;padding:.5rem;color:#6b7264}
.fb-close:hover{background:rgb(19 26 18 / .05);color:#131a12}
.fb-toc{list-style:none;margin:1.25rem 0 0;padding:0}
.fb-toc button{display:flex;width:100%;align-items:center;gap:.75rem;border-radius:.75rem;padding:.65rem .75rem;text-align:left;font-size:.875rem}
.fb-toc button:hover{background:rgb(196 238 142 / .3)}
.fb-toc .n{font-family:"FbDisplay",system-ui,sans-serif;font-weight:600;font-size:.75rem;color:#4d831c}
.fb-toc .t{font-weight:500}
.fb-toc .p{margin-left:auto;font-size:.75rem;color:#6b7264}
.fb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-top:1.25rem;max-height:60dvh;overflow-y:auto;padding-right:.25rem}
@media (min-width:640px){.fb-grid{grid-template-columns:repeat(4,1fr)}}
@media (min-width:768px){.fb-grid{grid-template-columns:repeat(5,1fr)}}
.fb-thumb{position:relative;aspect-ratio:3/4.1;overflow:hidden;border-radius:.5rem;border:2px solid transparent;opacity:.8;transition:all .2s}
.fb-thumb:hover{opacity:1}
.fb-thumb.on{border-color:#65a824;opacity:1;box-shadow:0 8px 24px -12px rgb(0 0 0 / .4)}
.fb-thumb .fbp{pointer-events:none}
.fb-thumb-n{position:absolute;right:.25rem;bottom:.25rem;border-radius:.25rem;background:rgb(8 17 11 / .7);padding:0 .25rem;font-size:8px;color:#f6f4ec}
html.no-js .fb-desk,html.no-js .fb-tools,html.no-js .fb-label{display:none!important}
html.no-js .fb-mobile{display:block!important}
html.no-js .fb-page{width:min(82vw,26rem)}
`;

export interface StandaloneOptions {
  title: string;
  siteUrl: string;
  /** Online PDF of the same catalogue, linked from the toolbar. */
  pdfUrl: string | null;
}

export async function renderFlipbookHtml(
  pages: ResolvedPage[],
  options: StandaloneOptions,
): Promise<string> {
  const trees: TreeNode[] = pages.map((page) => pageTree(page));

  const urls: string[] = [];
  const collect = (node: TreeNode | string) => {
    if (typeof node === "string") return;
    if (node.img) urls.push(node.img.image.url);
    node.children?.forEach(collect);
  };
  trees.forEach(collect);

  const [pictures, fonts] = await Promise.all([
    loadPictures(urls, forHtml),
    fontFaces(facesUsed(pages)),
  ]);

  const faces = trees
    .map((tree, i) => {
      const page = pages[i]!;
      const chapter = page.chapter ? ` data-chapter="${escapeHtml(page.chapter)}"` : "";
      const html = treeToHtml(tree, (img) => pictures.get(img.image.url) ?? null);
      return `<div class="fb-page" data-index="${i}"${chapter}>${html}</div>`;
    })
    .join("\n");

  const chapters = pages.filter((page) => page.chapter);
  const toc = [
    `<li><button type="button" data-goto="1"><span class="t">Cover</span></button></li>`,
    ...chapters.map(
      (page, i) =>
        `<li><button type="button" data-goto="${page.number}"><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="t">${escapeHtml(page.chapter!)}</span><span class="p">p. ${page.number}</span></button></li>`,
    ),
  ].join("");

  const site = options.siteUrl.replace(/\/$/, "");
  const close = `<button type="button" class="fb-close" aria-label="Close">${icon("x")}</button>`;
  const data = JSON.stringify({ title: options.title, site }).replace(/</g, "\\u003c");
  const pdf = options.pdfUrl
    ? `<a class="fb-tool" href="${escapeHtml(options.pdfUrl)}" target="_blank" rel="noopener" aria-label="Download PDF" title="Download PDF">${icon("download")}</a>`
    : "";

  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title)}</title>
<meta name="description" content="${escapeHtml(options.title)} — every range and product, page by page. Works offline.">
<style>${fonts}</style>
<style>${SHELL_CSS}${FLIPBOOK_PAGE_CSS}</style>
</head>
<body>
<div id="fb" class="fb">
<div class="fb-glow" aria-hidden="true"></div>
<header class="fb-top">
<a class="fb-pill" href="${escapeHtml(site)}/catalogue" target="_blank" rel="noopener" aria-label="Open humusoncomplex.com" title="humusoncomplex.com">${icon("arrow-left")}<span class="fb-site">humusoncomplex.com</span></a>
<div class="fb-tools">
<button type="button" class="fb-tool" data-act="toc" aria-label="Contents" title="Contents">${icon("list")}</button>
<button type="button" class="fb-tool" data-act="thumbs" aria-label="Thumbnails" title="Thumbnails">${icon("grid")}</button>
<button type="button" class="fb-tool fb-wide" data-act="zoom" aria-label="Zoom in" title="Zoom in">${icon("zoom-in", "fb-off")}${icon("zoom-out", "fb-on")}</button>
<button type="button" class="fb-tool" data-act="fullscreen" aria-label="Full screen" title="Full screen">${icon("maximize", "fb-off")}${icon("minimize", "fb-on")}</button>
<button type="button" class="fb-tool" data-act="share" aria-label="Share this page" title="Share this page">${icon("link", "fb-off")}${icon("check", "fb-on")}</button>
${pdf}
</div>
</header>
<div class="fb-desk">
<button type="button" class="fb-arrow fb-prev" data-act="prev" aria-label="Previous pages">${icon("arrow-left")}</button>
<div id="fb-zoom" class="fb-zoom">
<div id="fb-book" class="fb-book"><div class="fb-shadow" aria-hidden="true"></div></div>
</div>
<button type="button" class="fb-arrow fb-next" data-act="next" aria-label="Next pages">${icon("arrow-right")}</button>
</div>
<div class="fb-mobile">
<div id="fb-reader" class="fb-reader">
${faces}
</div>
</div>
<footer class="fb-foot"><p id="fb-label" class="fb-label" aria-live="polite">Cover</p></footer>
</div>
<dialog id="fb-toc" class="fb-modal" aria-labelledby="fb-toc-title">
<h2 id="fb-toc-title">Contents</h2>
${close}
<ol class="fb-toc">${toc}</ol>
</dialog>
<dialog id="fb-thumbs" class="fb-modal fb-modal-wide" aria-labelledby="fb-thumbs-title">
<h2 id="fb-thumbs-title">Pages</h2>
${close}
<div id="fb-thumb-grid" class="fb-grid"></div>
</dialog>
<script type="application/json" id="fb-data">${data}</script>
<script>${ENGINE_JS}</script>
</body>
</html>
`;
}
