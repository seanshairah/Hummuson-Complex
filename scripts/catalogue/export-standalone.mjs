/**
 * Exports the catalogue flipbook as one self-contained HTML file — pages,
 * photographs, fonts, styles and a small page-turning engine in a single
 * document that opens from a phone, an email attachment or a USB stick with no
 * network at all.
 *
 * It reads the flipbook that a running build serves, so what it exports is
 * exactly what /catalogue/flipbook shows, from whatever database that build
 * reads:
 *
 *   npm run build
 *   npx next start -p 3222                 # in another terminal
 *   npm run catalogue:standalone -- --out humuson-product-guide.html
 *
 *   --base  the running build            (default http://127.0.0.1:3222)
 *   --site  where "View product", "Explore mode" and "Share" point
 *                                        (default https://hummuson-complex.vercel.app)
 *   --out   the file to write            (default ./humuson-product-guide.html)
 *
 * Nothing is trusted on the way out: the file is opened from file:// in
 * Chromium with every network request refused, and each page, control, deep
 * link and the no-JavaScript fallback is exercised. A failed check exits
 * non-zero and names itself.
 *
 * Why a separate engine rather than the React component: the component needs
 * the Next.js runtime, which loads its chunks by URL and cannot run from a
 * single file. The engine below does the same job in plain DOM — the page
 * faces themselves are the server-rendered ones, byte for byte, so the pages
 * cannot drift from the site's; only the turning is reimplemented.
 */
import { chromium } from "@playwright/test";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = parseArgs(process.argv.slice(2));
const BASE = (args.base ?? "http://127.0.0.1:3222").replace(/\/$/, "");
const SITE = (args.site ?? "https://hummuson-complex.vercel.app").replace(/\/$/, "");
const OUT = path.resolve(args.out ?? "humuson-product-guide.html");

/** Product plates are the page's subject; chapter openers sit at 25% opacity. */
const PLATE = { w: 1024, q: 70 };
const OPENER = { w: 640, q: 55 };

const ICONS = [
  "arrow-left",
  "arrow-right",
  "list",
  "layout-grid",
  "zoom-in",
  "zoom-out",
  "maximize",
  "minimize",
  "link-2",
  "check",
  "download",
  "x",
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    out[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return out;
}

function launchOptions() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/opt/pw-browsers/chromium",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ].filter(Boolean);
  const executablePath = candidates.find((p) => existsSync(p));
  return executablePath ? { executablePath, args: ["--no-sandbox"] } : {};
}

async function dataUri(url, accept) {
  const response = await fetch(url, { headers: accept ? { Accept: accept } : {} });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  const type = (response.headers.get("content-type") ?? "application/octet-stream").split(";")[0];
  const body = Buffer.from(await response.arrayBuffer());
  return `data:${type};base64,${body.toString("base64")}`;
}

/** The original path behind a next/image URL (or the src itself when unoptimised). */
function originalImage(src) {
  const url = new URL(src, BASE);
  return url.pathname === "/_next/image" ? url.searchParams.get("url") : url.pathname;
}

async function replaceAsync(text, pattern, replacer) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    parts.push(text.slice(last, match.index), await replacer(match[0]));
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return parts.join("");
}

/** Lucide's icon nodes, read from the installed package, as inline SVG. */
function icon(name, className = "size-4") {
  const file = new URL(`../../node_modules/lucide-react/dist/esm/icons/${name}.js`, import.meta.url);
  const source = readFileSync(file, "utf8");
  const literal = /createLucideIcon\("[^"]+",\s*(\[[\s\S]*\])\s*\);/.exec(source)?.[1];
  if (!literal) throw new Error(`could not read the ${name} icon`);
  const nodes = new Function(`return ${literal}`)();
  const children = nodes
    .map(([tag, attrs]) => {
      const list = Object.entries(attrs)
        .filter(([key]) => key !== "key")
        .map(([key, value]) => `${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${value}"`);
      return `<${tag} ${list.join(" ")}/>`;
    })
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
    `class="lucide lucide-${name} ${className}" aria-hidden="true">${children}</svg>`
  );
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ── Capture ─────────────────────────────────────────────────────────────── */

async function capture() {
  const browser = await chromium.launch(launchOptions());
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    const response = await page.goto(`${BASE}/catalogue/flipbook`, { waitUntil: "networkidle" });
    if (!response?.ok()) throw new Error(`${BASE}/catalogue/flipbook answered ${response?.status()}`);

    const shape = await page.evaluate(() => {
      const reader = document.querySelector(".snap-x.snap-mandatory");
      if (!reader) throw new Error("no flipbook reader on the page — is the catalogue published?");
      const wrappers = [...reader.children];
      const toc = wrappers.find((w) => w.querySelector("ol li"));
      const back = wrappers.at(-1)?.querySelector("p.font-display") ?? wrappers.at(-2)?.querySelector("p.font-display");
      return {
        pages: wrappers.length,
        images: wrappers.flatMap((w) =>
          [...w.querySelectorAll("img")].map((img) => ({
            src: img.getAttribute("src"),
            opener: Boolean(img.closest(".opacity-25")),
          })),
        ),
        toc: toc
          ? [...toc.querySelectorAll("ol li")].map((li) => {
              const spans = li.querySelectorAll("span");
              return { title: spans[1].textContent.trim(), page: Number(spans[3].textContent) - 1 };
            })
          : [],
        title: back?.textContent.trim() || "Humuson Product Guide",
        stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
        htmlClass: [...document.documentElement.classList].filter((c) => c.startsWith("__")).join(" "),
        bodyClass: document.body.className,
        pdf: document.querySelector('a[aria-label="Download PDF"]')?.getAttribute("href") ?? null,
      };
    });

    const withdrawn = shape.images.map((i) => originalImage(i.src)).filter((p) => /\/master\/[12]\.jpg$/.test(p));
    if (withdrawn.length) throw new Error(`the flipbook still shows Master's jerrican: ${withdrawn.join(", ")}`);

    const uris = {};
    for (const image of shape.images) {
      const key = `${image.opener ? "o" : "p"}:${image.src}`;
      if (uris[key]) continue;
      const { w, q } = image.opener ? OPENER : PLATE;
      const original = originalImage(image.src);
      uris[key] = await dataUri(
        `${BASE}/_next/image?url=${encodeURIComponent(original)}&w=${w}&q=${q}`,
        "image/webp",
      );
    }

    const faces = await page.evaluate(
      ({ uris, site }) => {
        const reader = document.querySelector(".snap-x.snap-mandatory");
        return [...reader.children].map((wrapper) => {
          const face = wrapper.firstElementChild.cloneNode(true);
          for (const img of face.querySelectorAll("img")) {
            const key = `${img.closest(".opacity-25") ? "o" : "p"}:${img.getAttribute("src")}`;
            img.setAttribute("src", uris[key]);
            img.removeAttribute("srcset");
            img.removeAttribute("sizes");
            img.setAttribute("decoding", "async");
            // next/image clears its blur placeholder from script once the photo
            // loads. There is no script here, so it would stay — visible
            // through every transparent pack shot.
            for (const prop of [...img.style]) {
              if (prop.startsWith("background")) img.style.removeProperty(prop);
            }
          }
          for (const a of face.querySelectorAll('a[href^="/"]')) {
            a.setAttribute("href", site + a.getAttribute("href"));
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener");
          }
          return face.outerHTML;
        });
      },
      { uris, site: SITE },
    );

    let css = "";
    for (const href of shape.stylesheets) {
      const response = await fetch(href);
      if (!response.ok) throw new Error(`${response.status} fetching ${href}`);
      css += `${await response.text()}\n`;
    }
    // Fonts: the Latin subset of each face, inlined. The other subsets are for
    // scripts the catalogue never prints, and would triple the file. The
    // minifier writes Latin's range as u+00?? rather than U+0000-00FF.
    css = await replaceAsync(css, /@font-face\s*{[^}]*}/g, async (block) => {
      const range = /unicode-range:\s*([^;}]*)/i.exec(block)?.[1]?.trim();
      if (range && !/^u\+(?:0000-00ff|00\?\?)(?:,|$)/i.test(range)) return "";
      const url = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(block)?.[1];
      if (!url || url.startsWith("data:")) return block;
      return block.replace(/url\([^)]*\)/, `url(${await dataUri(new URL(url, BASE).href)})`);
    });
    const external = [...css.matchAll(/url\(\s*["']?(\/[^"')]+)/g)].map((m) => m[1]);
    for (const url of new Set(external)) {
      css = css.split(url).join(await dataUri(new URL(url, BASE).href));
    }

    return { ...shape, faces, css };
  } finally {
    await browser.close();
  }
}

/* ── Engine (runs in the exported page) ──────────────────────────────────── */

function engine() {
  const d = document;
  d.documentElement.classList.remove("no-js");
  const data = JSON.parse(d.getElementById("fb-data").textContent);
  const shell = d.getElementById("fb");
  const reader = d.getElementById("fb-reader");
  const pages = [...reader.children];
  const total = pages.length;
  const S = Math.ceil(total / 2);
  const book = d.getElementById("fb-book");
  const zoomBox = d.getElementById("fb-zoom");
  const label = d.getElementById("fb-label");
  const prev = d.querySelector('[data-act="prev"]');
  const next = d.querySelector('[data-act="next"]');
  const desktop = window.matchMedia("(min-width: 768px)");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FACE =
    "fb-face absolute inset-0 cursor-pointer overflow-hidden text-[clamp(9px,1.05vw,15px)] shadow-[0_1px_2px_rgba(0,0,0,0.35)]";

  let flipped = 0;
  let turning = null;
  let timer = 0;
  let readerIndex = 0;

  const faceOf = (index) => {
    const source = pages[index]?.firstElementChild;
    return source ? source.cloneNode(true) : d.createElement("div");
  };
  const shade = (side) => {
    const span = d.createElement("span");
    span.setAttribute("aria-hidden", "true");
    span.className =
      side === "left"
        ? "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/25 to-transparent"
        : "pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/25 to-transparent";
    return span;
  };

  const sheets = [];
  for (let i = 0; i < S; i += 1) {
    const sheet = d.createElement("div");
    sheet.className = "fb-sheet absolute top-0 right-0 h-full w-1/2";
    sheet.style.transformStyle = "preserve-3d";
    sheet.style.transformOrigin = "left center";
    sheet.style.transition = reduce ? "none" : "transform 0.85s cubic-bezier(0.35, 0.1, 0.2, 1)";

    const front = d.createElement("div");
    front.className = `${FACE} rounded-r-xl`;
    front.setAttribute("role", "button");
    front.setAttribute("aria-label", "Turn page forward");
    front.append(faceOf(2 * i), shade("left"));
    front.addEventListener("click", (event) => {
      if (!event.target.closest("a")) go(flipped + 1);
    });

    const back = d.createElement("div");
    back.className = `${FACE} rounded-l-xl`;
    back.style.transform = "rotateY(180deg)";
    back.setAttribute("role", "button");
    back.setAttribute("aria-label", "Turn page back");
    back.append(faceOf(2 * i + 1), shade("right"));
    back.addEventListener("click", (event) => {
      if (!event.target.closest("a")) go(flipped - 1);
    });

    sheet.append(front, back);
    book.append(sheet);
    sheets.push(sheet);
  }

  function spreadLabel() {
    if (flipped === 0) return "Cover";
    if (flipped >= S) return "Back cover";
    return `${flipped * 2}–${flipped * 2 + 1} / ${total}`;
  }

  function paint() {
    sheets.forEach((sheet, i) => {
      const isFlipped = i < flipped;
      sheet.style.zIndex = String(turning === i ? S + 2 : isFlipped ? i + 1 : S - i);
      sheet.style.transform = `rotateY(${isFlipped ? -180 : 0}deg)`;
    });
    prev.disabled = flipped === 0;
    next.disabled = flipped >= S;
    const text = desktop.matches ? spreadLabel() : `Page ${readerIndex + 1} / ${total}`;
    label.textContent = text;
    book.setAttribute("aria-label", `Catalogue, ${spreadLabel()}`);
    renderThumbState();
  }

  function remember(index) {
    const url = location.href.split("#")[0];
    try {
      history.replaceState(null, "", index > 0 ? `${url}#page=${index}` : url);
    } catch {
      // Some file:// contexts refuse history writes; the book still turns.
    }
  }

  function go(target) {
    const clamped = Math.max(0, Math.min(S, target));
    if (clamped === flipped) return;
    turning = clamped > flipped ? flipped : flipped - 1;
    flipped = clamped;
    paint();
    clearTimeout(timer);
    timer = setTimeout(() => {
      turning = null;
      paint();
    }, reduce ? 0 : 850);
    remember(clamped * 2);
  }

  function showReaderPage(index, smooth) {
    const page = pages[Math.max(0, Math.min(total - 1, index))];
    reader.scrollTo({
      left: page.offsetLeft - (reader.clientWidth - page.clientWidth) / 2,
      behavior: smooth && !reduce ? "smooth" : "auto",
    });
  }

  function jump(index) {
    go(Math.ceil(index / 2));
    if (!desktop.matches) showReaderPage(index, true);
    d.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  }

  // Phone reader: the label follows the page most in view.
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) readerIndex = pages.indexOf(entry.target);
      }
      if (!desktop.matches) label.textContent = `Page ${readerIndex + 1} / ${total}`;
    },
    { root: reader, threshold: 0.6 },
  );
  pages.forEach((page) => seen.observe(page));
  desktop.addEventListener("change", paint);

  // Contents
  d.querySelectorAll("#fb-toc [data-page]").forEach((button) => {
    button.addEventListener("click", () => jump(Number(button.dataset.page)));
  });

  // Thumbnails, built on first open so the file carries each page once.
  const thumbs = d.getElementById("fb-thumb-grid");
  let thumbButtons = [];
  function buildThumbs() {
    if (thumbButtons.length) return;
    thumbButtons = pages.map((_, i) => {
      const button = d.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", `Go to page ${i + 1}`);
      button.className = "fb-thumb group relative aspect-[3/4] overflow-hidden rounded-lg border-2 text-[5px] transition-all";
      const face = faceOf(i);
      face.setAttribute("inert", "");
      const number = d.createElement("span");
      number.className = "absolute right-1 bottom-1 rounded bg-humus-950/70 px-1 text-[8px] text-paper";
      number.textContent = String(i + 1);
      button.append(face, number);
      button.addEventListener("click", () => jump(i));
      thumbs.append(button);
      return button;
    });
    renderThumbState();
  }
  function renderThumbState() {
    const right = flipped * 2;
    thumbButtons.forEach((button, i) => {
      const current = desktop.matches ? right === i || right - 1 === i : readerIndex === i;
      button.classList.toggle("border-leaf-600", current);
      button.classList.toggle("shadow-card", current);
      button.classList.toggle("border-transparent", !current);
      button.classList.toggle("opacity-80", !current);
    });
  }

  function open(id) {
    const dialog = d.getElementById(id);
    if (id === "fb-thumbs") buildThumbs();
    dialog.showModal();
  }
  d.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelector(".fb-close").addEventListener("click", () => dialog.close());
  });

  const swap = (button, name) => {
    button.querySelector("svg").outerHTML = data.icons[name];
  };

  d.querySelectorAll("[data-act]").forEach((button) => {
    button.addEventListener("click", async () => {
      const act = button.dataset.act;
      if (act === "prev") go(flipped - 1);
      if (act === "next") go(flipped + 1);
      if (act === "toc") open("fb-toc");
      if (act === "thumbs") open("fb-thumbs");
      if (act === "zoom") {
        const zoomed = zoomBox.classList.toggle("scale-125");
        swap(button, zoomed ? "zoom-out" : "zoom-in");
        button.setAttribute("aria-label", zoomed ? "Zoom out" : "Zoom in");
        button.title = button.getAttribute("aria-label");
      }
      if (act === "fullscreen") {
        try {
          if (d.fullscreenElement) await d.exitFullscreen();
          else await shell.requestFullscreen();
        } catch {
          // Unsupported (iOS Safari) — zoom still works.
        }
      }
      if (act === "share") {
        const page = desktop.matches ? flipped * 2 : readerIndex;
        const url = `${data.site}/catalogue/flipbook${page > 0 ? `?page=${page}` : ""}`;
        try {
          if (navigator.share) await navigator.share({ title: data.title, url });
          else {
            await navigator.clipboard.writeText(url);
            swap(button, "check");
            setTimeout(() => swap(button, "link-2"), 1600);
          }
        } catch {
          // Cancelled, or no clipboard from a local file: show the link instead.
          if (!navigator.share) window.prompt("Copy this link", url);
        }
      }
    });
  });
  d.addEventListener("fullscreenchange", () => {
    const button = d.querySelector('[data-act="fullscreen"]');
    const on = Boolean(d.fullscreenElement);
    swap(button, on ? "minimize" : "maximize");
    button.setAttribute("aria-label", on ? "Exit fullscreen" : "Fullscreen");
    button.title = button.getAttribute("aria-label");
  });

  window.addEventListener("keydown", (event) => {
    if (d.querySelector("dialog[open]")) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const step = event.key === "ArrowRight" ? 1 : -1;
    if (desktop.matches) go(flipped + step);
    else showReaderPage(readerIndex + step, true);
  });

  // Deep link: #page=12 (or ?page=12, as the site's own share links read)
  // opens on pages 12–13, the same spread the site would show.
  const wanted = Number(
    /(?:^#|[?&#])page=(\d+)/.exec(location.hash)?.[1] ??
      new URLSearchParams(location.search).get("page") ??
      0,
  );
  if (Number.isFinite(wanted) && wanted > 0) {
    flipped = Math.min(S, Math.ceil(wanted / 2));
    readerIndex = Math.min(total - 1, wanted - 1);
    requestAnimationFrame(() => showReaderPage(readerIndex, false));
  }
  paint();
}

/* ── Assemble ────────────────────────────────────────────────────────────── */

function assemble(shot) {
  const TOOL =
    "flex size-10 items-center justify-center rounded-full border border-paper/20 text-paper/85 transition-colors hover:border-paper/50";
  const ARROW =
    "flex size-12 shrink-0 items-center justify-center rounded-full border border-paper/20 text-paper transition-all hover:border-leaf-400 hover:text-leaf-300 disabled:opacity-25";
  const icons = Object.fromEntries(ICONS.map((name) => [name, icon(name, "size-4")]));
  const pdf = shot.pdf ? new URL(shot.pdf, SITE).href : null;

  const shellCss = `
.fb-top{padding-top:1.25rem}
@media (min-width:768px){.fb-top{padding-top:1.75rem}}
.fb-face{-webkit-backface-visibility:hidden;backface-visibility:hidden}
.fb-thumb [inert]{pointer-events:none}
.fb-modal{border:0;padding:1.5rem;border-radius:1.5rem;width:min(92vw,28rem);max-height:82dvh;overflow:auto;
  background:var(--color-cream,#fbf8f1);color:var(--color-ink,#1b2a1f);box-shadow:0 30px 80px -20px rgb(0 0 0/.55)}
.fb-modal-wide{width:min(94vw,48rem)}
.fb-modal::backdrop{background:rgb(10 20 14/.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
html.no-js .fb-desk,html.no-js .fb-tools,html.no-js #fb-label{display:none!important}
html.no-js .fb-mobile{display:block!important}
html.no-js .fb-page{width:min(82vw,26rem)}
`;

  const tocItems = [
    `<li><button type="button" data-page="0" class="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-leaf-300/30">Cover</button></li>`,
    ...shot.toc.map(
      (entry, i) =>
        `<li><button type="button" data-page="${entry.page}" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-leaf-300/30">` +
        `<span class="font-display text-xs font-semibold text-leaf-700">${String(i + 1).padStart(2, "0")}</span>` +
        `<span class="font-medium text-ink">${escapeHtml(entry.title)}</span>` +
        `<span class="ml-auto text-xs text-ink-faint">p. ${entry.page + 1}</span></button></li>`,
    ),
  ].join("");

  const close = `<button type="button" class="fb-close absolute top-4 right-4 rounded-full p-2 text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink" aria-label="Close">${icons.x}</button>`;

  const data = { title: shot.title, site: SITE, icons };

  return `<!doctype html>
<html lang="en" class="${shot.htmlClass} no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(shot.title)}</title>
<meta name="description" content="The Humuson Complex product guide — every range and product, page by page. Works offline.">
<script>document.documentElement.classList.remove("no-js")</script>
<style>${shot.css}</style>
<style>${shellCss}</style>
</head>
<body class="${escapeHtml(shot.bodyClass)}">
<div id="fb" class="bg-grain flex min-h-dvh flex-col bg-humus-950">
<div aria-hidden="true" class="pointer-events-none fixed inset-0 glow-leaf"></div>
<header class="fb-top relative z-10 flex items-center justify-between gap-3 px-4 pb-2 md:px-8">
<a href="${SITE}/catalogue" target="_blank" rel="noopener" class="flex shrink-0 items-center gap-2 rounded-full border border-paper/20 px-3 py-2 text-sm font-medium whitespace-nowrap text-paper/85 transition-colors hover:border-paper/50 sm:px-4">${icon("arrow-left", "size-4")} Explore<span class="max-sm:hidden"> mode</span></a>
<div class="fb-tools flex items-center gap-1.5">
<button type="button" data-act="toc" aria-label="Contents" title="Contents" class="${TOOL}">${icons.list}</button>
<button type="button" data-act="thumbs" aria-label="Thumbnails" title="Thumbnails" class="${TOOL}">${icons["layout-grid"]}</button>
<button type="button" data-act="zoom" aria-label="Zoom in" title="Zoom in" class="${TOOL} max-md:hidden">${icons["zoom-in"]}</button>
<button type="button" data-act="fullscreen" aria-label="Fullscreen" title="Fullscreen" class="${TOOL}">${icons.maximize}</button>
<button type="button" data-act="share" aria-label="Share this page" title="Share this page" class="${TOOL}">${icons["link-2"]}</button>
${pdf ? `<a href="${pdf}" target="_blank" rel="noopener" aria-label="Download PDF" title="Download PDF" class="${TOOL}">${icons.download}</a>` : ""}
</div>
</header>
<div class="fb-desk relative z-10 hidden flex-1 items-center justify-center px-8 py-6 md:flex">
<button type="button" data-act="prev" aria-label="Previous pages" class="mr-6 ${ARROW}">${icon("arrow-left", "size-5")}</button>
<div id="fb-zoom" class="transition-transform duration-500">
<div id="fb-book" class="relative" style="perspective:2600px;width:min(60vw,58rem);aspect-ratio:3 / 2.05">
<div aria-hidden="true" class="absolute inset-x-8 -bottom-5 h-10 rounded-[50%] bg-black/45 blur-xl"></div>
</div>
</div>
<button type="button" data-act="next" aria-label="Next pages" class="ml-6 ${ARROW}">${icon("arrow-right", "size-5")}</button>
</div>
<div class="fb-mobile relative z-10 flex-1 md:hidden">
<div id="fb-reader" class="scrollbar-none relative flex h-full snap-x snap-mandatory gap-4 overflow-x-auto px-6 py-4">
${shot.faces
  .map(
    (face, i) =>
      `<div class="fb-page relative aspect-[3/4.1] w-[82vw] shrink-0 snap-center overflow-hidden rounded-xl text-[clamp(10px,3.4vw,15px)] shadow-float" data-page="${i}">${face}</div>`,
  )
  .join("\n")}
</div>
</div>
<footer class="relative z-10 flex items-center justify-center gap-4 px-6 pt-2 pb-6">
<p id="fb-label" aria-live="polite" class="font-display text-sm text-paper/70">Cover</p>
</footer>
</div>
<dialog id="fb-toc" class="fb-modal" aria-labelledby="fb-toc-title">
<h2 id="fb-toc-title" class="pr-8 text-title text-ink">Contents</h2>
${close}
<ol class="mt-5 space-y-1">${tocItems}</ol>
</dialog>
<dialog id="fb-thumbs" class="fb-modal fb-modal-wide" aria-labelledby="fb-thumbs-title">
<h2 id="fb-thumbs-title" class="pr-8 text-title text-ink">Pages</h2>
${close}
<div id="fb-thumb-grid" class="mt-5 grid max-h-[60dvh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-5"></div>
</dialog>
<script type="application/json" id="fb-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script>(${engine.toString()})();</script>
</body>
</html>
`;
}

/* ── Verify ──────────────────────────────────────────────────────────────── */

async function verify(file, shot) {
  const failures = [];
  const expect = (ok, message) => {
    if (!ok) failures.push(message);
  };
  const url = pathToFileURL(file).href;
  const total = shot.faces.length;
  const browser = await chromium.launch(launchOptions());

  async function context(options = {}) {
    const ctx = await browser.newContext(options);
    const requests = [];
    await ctx.route("**/*", (route) => {
      const target = route.request().url();
      if (target.startsWith("file:") || target.startsWith("data:")) return route.continue();
      requests.push(target);
      return route.abort();
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
    return { ctx, page, requests, errors };
  }

  try {
    const desk = await context({ viewport: { width: 1440, height: 900 } });
    const { page } = desk;
    await page.goto(url);
    const labelText = () => page.locator("#fb-label").textContent();
    expect((await page.locator(".fb-sheet").count()) === Math.ceil(total / 2), "one sheet per two pages");
    expect((await labelText()) === "Cover", "opens on the cover");
    await page.locator('[data-act="next"]').click();
    expect((await labelText()) === `2–3 / ${total}`, "the next button turns to 2–3");
    await page.keyboard.press("ArrowRight");
    expect((await labelText()) === `4–5 / ${total}`, "the right arrow key turns forward");
    await page.keyboard.press("ArrowLeft");
    expect((await labelText()) === `2–3 / ${total}`, "the left arrow key turns back");
    await page.waitForTimeout(900);
    await page.locator(".fb-sheet").nth(1).locator(".fb-face").first().click({ position: { x: 40, y: 40 } });
    expect((await labelText()) === `4–5 / ${total}`, "clicking a right-hand page turns it");

    await page.locator('[data-act="toc"]').click();
    const tocTexts = await page.locator("#fb-toc button[data-page]").allTextContents();
    for (const entry of shot.toc) {
      expect(
        tocTexts.some((t) => t.includes(entry.title) && t.includes(`p. ${entry.page + 1}`)),
        `contents lists ${entry.title} on p. ${entry.page + 1}`,
      );
    }
    const last = shot.toc.at(-1);
    await page.locator("#fb-toc button[data-page]").filter({ hasText: last.title }).click();
    const spread = Math.ceil(last.page / 2);
    expect(
      (await labelText()) === `${spread * 2}–${spread * 2 + 1} / ${total}`,
      `contents jumps to ${last.title}`,
    );
    expect(!(await page.locator("#fb-toc").evaluate((d) => d.open)), "contents closes after a jump");

    await page.locator('[data-act="thumbs"]').click();
    expect((await page.locator(".fb-thumb").count()) === total, "one thumbnail per page");
    await page.locator(".fb-thumb").first().click();
    expect((await labelText()) === "Cover", "a thumbnail jumps to its page");

    await page.locator('[data-act="zoom"]').click();
    expect(await page.locator("#fb-zoom").evaluate((e) => e.classList.contains("scale-125")), "zoom scales the book");

    const text = await page.locator("#fb-reader").textContent();
    expect(!/liquid foliar/i.test(text), "no page names the Liquid Foliar range");
    const chapters = await page.locator("#fb-reader h2").allTextContents();
    expect(!chapters.some((t) => /liquid/i.test(t)), "no liquid chapter");
    for (const name of ["Grow+ Top Dressing", "CarboAmin Basal Dressing"]) {
      const labels = await page
        .locator("#fb-reader .fb-page")
        .filter({ has: page.locator("h3", { hasText: name }) })
        .locator("span.text-eyebrow")
        .allTextContents();
      expect(labels.length > 0 && labels.every((l) => l.trim() === "Biostimulants"), `${name} appears under Biostimulants only`);
    }
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
    });
    for (const family of ["Inter", "Space Grotesk"]) {
      expect(fonts.includes(family), `the ${family} face is embedded and loads`);
    }
    expect(desk.errors.length === 0, `no script errors (${desk.errors.join(" | ")})`);
    expect(desk.requests.length === 0, `no network requests (${desk.requests.join(" ")})`);

    const linked = await context({ viewport: { width: 1440, height: 900 } });
    await linked.page.goto(`${url}#page=12`);
    expect((await linked.page.locator("#fb-label").textContent()) === `12–13 / ${total}`, "#page=12 opens on 12–13");

    const phone = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await phone.page.goto(url);
    await phone.page.locator("#fb-reader .fb-page").nth(6).evaluate((el) =>
      el.parentElement.scrollTo({ left: el.offsetLeft - (el.parentElement.clientWidth - el.clientWidth) / 2 }),
    );
    await phone.page.waitForTimeout(400);
    expect((await phone.page.locator("#fb-label").textContent()) === `Page 7 / ${total}`, "a phone reads page by page");
    expect(phone.errors.length === 0, `no script errors on a phone (${phone.errors.join(" | ")})`);

    const bare = await context({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    await bare.page.goto(url);
    expect(await bare.page.locator("#fb-reader").isVisible(), "without JavaScript every page is still readable");
    expect(!(await bare.page.locator(".fb-desk").isVisible()), "without JavaScript the unusable book is hidden");
  } finally {
    await browser.close();
  }
  return failures;
}

/* ── Main ────────────────────────────────────────────────────────────────── */

const shot = await capture();
writeFileSync(OUT, assemble(shot));
const size = (statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`✓ ${shot.faces.length} pages, ${shot.toc.length} chapters → ${OUT} (${size} MB)`);
for (const entry of shot.toc) console.log(`    ${entry.title} — p. ${entry.page + 1}`);

const failures = await verify(OUT, shot);
if (failures.length) {
  console.error(`✗ ${failures.length} check(s) failed:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log("✓ verified from file:// with the network cut: turning, keys, contents, thumbnails, zoom, deep link, phone, no-JS");
