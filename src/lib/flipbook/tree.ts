import { PAGE_H, PAGE_W, snapWeight, type FontKey, type Gradient } from "./model";
import type {
  FlipbookImage,
  ResolvedBlock,
  ResolvedLink,
  ResolvedPage,
  Run,
} from "./resolve";

/**
 * A resolved page as a small, renderer-neutral element tree.
 *
 * The web flipbook and the designer turn it into React elements
 * (components/flipbook/page-view.tsx); the standalone HTML download turns it
 * into a string (html.ts). One description of the markup means the download
 * cannot drift from the site. Styles are camelCase with explicit units.
 *
 * Every length inside a page is a multiple of `--u`, one design unit, which
 * the page defines from its own width with a container query unit — so a
 * page draws the same at thumbnail size, in the book and full screen.
 */

export interface TreeImage {
  image: FlipbookImage;
  alt: string;
  fit: "cover" | "contain";
  position: string;
  /** Fraction of the page width the picture spans, for responsive sizes. */
  span: number;
}

export interface TreeNode {
  tag: "div" | "span" | "strong" | "a" | "ol" | "li" | "svg" | "path";
  className?: string;
  style?: Record<string, string>;
  attrs?: Record<string, string>;
  children?: (TreeNode | string)[];
  /** Draw a picture here (the element becomes its frame). */
  img?: TreeImage;
}

/** Class names the tree uses; styled by FLIPBOOK_PAGE_CSS. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")";

export const FLIPBOOK_PAGE_CSS = `
.fbp{position:relative;width:100%;height:100%;overflow:hidden;container-type:inline-size;--u:calc(100cqw / ${PAGE_W});--fb-display:var(--font-space-grotesk,"Space Grotesk"),system-ui,sans-serif;--fb-sans:var(--font-inter,"Inter"),system-ui,sans-serif;--fb-serif:var(--font-fraunces,"Fraunces"),Georgia,serif;font-family:var(--fb-sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;isolation:isolate}
.fbp *,.fbp *::before,.fbp *::after{box-sizing:border-box}
.fbp-layer{position:absolute;inset:0;pointer-events:none}
.fbp-glow{background:radial-gradient(155% 70% at 78% 12%,rgb(132 204 53 / .14),transparent 60%),radial-gradient(133% 65% at 12% 88%,rgb(47 88 59 / .35),transparent 65%)}
.fbp-grain{opacity:.5;background-image:${GRAIN}}
.fbb{position:absolute;display:block;margin:0;text-decoration:none;color:inherit}
.fbb.fbp-frame{overflow:hidden}
.fbt{display:flex;flex-direction:column;white-space:pre-wrap;overflow-wrap:break-word}
.fbt>span{display:block;min-width:0}
.fbt-clamp{display:-webkit-box!important;-webkit-box-orient:vertical;overflow:hidden}
.fbimg{position:absolute;inset:0;width:100%;height:100%;display:block;max-width:none}
.fbbtn{display:flex;align-items:center;justify-content:center;gap:.45em;white-space:nowrap;overflow:hidden;line-height:1.1}
.fbbtn svg{width:1em;height:1em;flex:none}
.fbtoc ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.fbtoc a{display:flex;align-items:baseline;gap:.5em;color:inherit;text-decoration:none}
.fbtoc .fbtoc-lead{flex:1;min-width:1em;margin:0 .3em;border-bottom-style:dotted;border-bottom-width:calc(var(--u) * 1.4);transform:translateY(-.25em)}
.fbqr svg{display:block;width:100%;height:100%}
a.fbb{cursor:pointer}
`;

export const FONT_STACK: Record<FontKey, string> = {
  display: "var(--fb-display)",
  sans: "var(--fb-sans)",
  serif: "var(--fb-serif)",
};

const u = (n: number) => (n === 0 ? "0" : `calc(var(--u) * ${round(n)})`);
const round = (n: number) => Math.round(n * 1000) / 1000;
const pct = (n: number, of: number) => `${round((n / of) * 100)}%`;

export function cssGradient(gradient: Gradient): string {
  return `linear-gradient(${round(gradient.angle)}deg, ${gradient.from}, ${gradient.to})`;
}

/** The weight `**bold**` runs are set in, from the block's own weight. */
export function boldWeight(weight: number): number {
  return snapWeight(Math.max(700, weight + 200));
}

function box(block: ResolvedBlock): Record<string, string> {
  const style: Record<string, string> = {
    left: pct(block.x, PAGE_W),
    top: pct(block.y, PAGE_H),
    width: pct(block.w, PAGE_W),
    height: pct(block.h, PAGE_H),
  };
  if (block.rotate) style.transform = `rotate(${round(block.rotate)}deg)`;
  if (block.opacity < 1) style.opacity = String(block.opacity);
  return style;
}

/** A block element: an anchor when it links somewhere, a div otherwise. */
function element(
  link: ResolvedLink | null,
  className: string,
  style: Record<string, string>,
  children: (TreeNode | string)[],
  extra: Record<string, string> = {},
): TreeNode {
  if (!link) return { tag: "div", className, style, attrs: extra, children };
  if (link.kind === "page") {
    return {
      tag: "a",
      className,
      style,
      attrs: { ...extra, href: `#page-${link.page}`, "data-goto": String(link.page) },
      children,
    };
  }
  return {
    tag: "a",
    className,
    style,
    attrs: {
      ...extra,
      href: link.href,
      ...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
    },
    children,
  };
}

function runs(list: Run[], weight: number): (TreeNode | string)[] {
  const bold = String(boldWeight(weight));
  return list.map((run) =>
    run.bold ? { tag: "strong", style: { fontWeight: bold }, children: [run.text] } : run.text,
  );
}

const ARROW: TreeNode = {
  tag: "svg",
  attrs: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  },
  children: [
    { tag: "path", attrs: { d: "M5 12h14" } },
    { tag: "path", attrs: { d: "m12 5 7 7-7 7" } },
  ],
};

const TEXT_CASE: Record<string, string> = {
  upper: "uppercase",
  lower: "lowercase",
  title: "capitalize",
};

function blockTree(block: ResolvedBlock): TreeNode | null {
  const style = box(block);
  switch (block.type) {
    case "text": {
      Object.assign(style, {
        justifyContent:
          block.valign === "middle" ? "center" : block.valign === "bottom" ? "flex-end" : "flex-start",
        fontFamily: FONT_STACK[block.font],
        fontSize: u(block.size),
        fontWeight: String(block.weight),
        color: block.color,
        textAlign: block.align,
        lineHeight: String(block.lineHeight),
      });
      if (block.italic) style.fontStyle = "italic";
      if (block.letterSpacing) style.letterSpacing = `${block.letterSpacing}em`;
      if (block.textCase !== "none") style.textTransform = TEXT_CASE[block.textCase]!;
      if (block.background) style.background = block.background;
      if (block.padding) style.padding = u(block.padding);
      if (block.radius) style.borderRadius = u(block.radius);
      const inner: TreeNode = {
        tag: "span",
        children: runs(block.runs, block.weight),
      };
      if (block.maxLines > 0) {
        inner.className = "fbt-clamp";
        inner.style = { WebkitLineClamp: String(block.maxLines) };
      }
      return element(block.href, "fbb fbt", style, [inner]);
    }

    case "image": {
      if (block.radius) style.borderRadius = u(block.radius);
      if (block.borderWidth) style.border = `${u(block.borderWidth)} solid ${block.borderColor}`;
      if (block.gradient) style.backgroundImage = cssGradient(block.gradient);
      if (block.background) style.backgroundColor = block.background;
      const node = element(block.href, "fbb fbp-frame", style, []);
      if (block.image) {
        node.img = {
          image: block.image,
          alt: block.alt,
          fit: block.fit,
          position: `${block.focusX}% ${block.focusY}%`,
          span: Math.min(1, block.w / PAGE_W),
        };
      }
      return node;
    }

    case "shape": {
      if (block.shape === "line") {
        const thickness = Math.max(block.strokeWidth, 0.5);
        const children: TreeNode[] = [
          {
            tag: "span",
            style: {
              position: "absolute",
              left: "0",
              right: "0",
              top: "50%",
              height: u(thickness),
              marginTop: u(-thickness / 2),
              background: block.stroke ?? block.fill ?? "#000000",
            },
          },
        ];
        return element(block.href, "fbb", style, children);
      }
      if (block.gradient) style.backgroundImage = cssGradient(block.gradient);
      else if (block.fill) style.backgroundColor = block.fill;
      if (block.stroke && block.strokeWidth) {
        style.border = `${u(block.strokeWidth)} solid ${block.stroke}`;
      }
      if (block.shape === "ellipse") style.borderRadius = "50%";
      else if (block.radius) style.borderRadius = u(block.radius);
      return element(block.href, "fbb", style, []);
    }

    case "button": {
      Object.assign(style, {
        fontFamily: FONT_STACK[block.font],
        fontSize: u(block.size),
        fontWeight: String(block.weight),
        color: block.color,
        background: block.background,
        borderRadius: u(block.radius),
      });
      if (block.borderColor) style.border = `${u(1.5)} solid ${block.borderColor}`;
      const children: (TreeNode | string)[] = [{ tag: "span", children: [block.labelText] }];
      if (block.arrow) children.push(ARROW);
      return element(block.href, "fbb fbbtn", style, children);
    }

    case "contents": {
      Object.assign(style, {
        fontFamily: FONT_STACK[block.font],
        fontSize: u(block.size),
        color: block.color,
      });
      const items: TreeNode[] = block.entries.map((entry) => {
        const parts: TreeNode[] = [];
        if (block.numbered) {
          parts.push({
            tag: "span",
            style: { color: block.accent, fontSize: "0.74em", fontWeight: "600" },
            children: [String(entry.number).padStart(2, "0")],
          });
        }
        parts.push({ tag: "span", style: { fontWeight: "500" }, children: [entry.title] });
        parts.push(
          block.leader
            ? { tag: "span", className: "fbtoc-lead", style: { borderColor: `${block.muted}66` } }
            : { tag: "span", style: { flex: "1" } },
        );
        parts.push({
          tag: "span",
          style: { color: block.muted, fontSize: "0.74em" },
          children: [String(entry.page)],
        });
        return {
          tag: "li",
          children: [
            {
              tag: "a",
              attrs: { href: `#page-${entry.page}`, "data-goto": String(entry.page) },
              children: parts,
            },
          ],
        };
      });
      return {
        tag: "div",
        className: "fbb fbtoc",
        style,
        children: [{ tag: "ol", style: { gap: u(block.gap) }, children: items }],
      };
    }

    case "qr": {
      if (block.background) style.background = block.background;
      if (!block.qr) return element(block.href, "fbb fbqr", style, []);
      const svg: TreeNode = {
        tag: "svg",
        attrs: {
          viewBox: `0 0 ${block.qr.size} ${block.qr.size}`,
          "shape-rendering": "crispEdges",
          role: "img",
          "aria-label": "QR code",
        },
        children: [{ tag: "path", attrs: { d: block.qr.path, fill: block.color } }],
      };
      return element(block.href, "fbb fbqr", style, [svg]);
    }
  }
}

export function pageTree(page: ResolvedPage): TreeNode {
  const bg = page.background;
  const style: Record<string, string> = { backgroundColor: bg.color };
  if (bg.gradient) style.backgroundImage = cssGradient(bg.gradient);

  const children: TreeNode[] = [];
  if (bg.image) {
    const frame: TreeNode = {
      tag: "div",
      className: "fbp-layer",
      style: bg.imageOpacity < 1 ? { opacity: String(bg.imageOpacity) } : {},
      img: {
        image: bg.image,
        alt: "",
        fit: bg.imageFit,
        position: `${bg.focusX}% ${bg.focusY}%`,
        span: 1,
      },
    };
    children.push(frame);
  }
  if (bg.overlay) children.push({ tag: "div", className: "fbp-layer", style: { background: bg.overlay } });
  if (bg.glow) children.push({ tag: "div", className: "fbp-layer fbp-glow" });
  if (bg.grain) children.push({ tag: "div", className: "fbp-layer fbp-grain" });

  for (const block of page.blocks) {
    const node = blockTree(block);
    if (node) {
      node.attrs = { ...node.attrs, "data-block": block.id };
      children.push(node);
    }
  }

  return {
    tag: "div",
    className: "fbp",
    style,
    attrs: { "data-page": String(page.number) },
    children,
  };
}
