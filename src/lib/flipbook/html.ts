import type { TreeImage, TreeNode } from "./tree";

/**
 * Serialises a page tree to HTML for the standalone download. Every text node
 * and attribute value is escaped; the tree only ever holds validated colours,
 * numbers and addresses, but the words are the owner's and could hold `<`.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch]!);
}

const cssProperty = (key: string) =>
  key.startsWith("--") ? key : key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);

export function styleString(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([key, value]) => `${cssProperty(key)}:${value}`)
    .join(";");
}

const NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;

export function treeToHtml(
  node: TreeNode | string,
  imageSrc: (image: TreeImage) => string | null,
): string {
  if (typeof node === "string") return escapeHtml(node);

  let attrs = "";
  if (node.className) attrs += ` class="${escapeHtml(node.className)}"`;
  if (node.style && Object.keys(node.style).length) {
    attrs += ` style="${escapeHtml(styleString(node.style))}"`;
  }
  for (const [key, value] of Object.entries(node.attrs ?? {})) {
    if (!NAME.test(key)) continue;
    attrs += ` ${key}="${escapeHtml(value)}"`;
  }

  let inner = "";
  if (node.img) {
    const src = imageSrc(node.img);
    if (src) {
      const style = styleString({ objectFit: node.img.fit, objectPosition: node.img.position });
      inner += `<img class="fbimg" src="${escapeHtml(src)}" alt="${escapeHtml(node.img.alt)}" style="${escapeHtml(style)}" decoding="async">`;
    }
  }
  for (const child of node.children ?? []) inner += treeToHtml(child, imageSrc);

  if (node.tag === "path") return `<path${attrs}/>`;
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}
