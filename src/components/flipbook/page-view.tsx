import Image from "next/image";
import { createElement, type CSSProperties, type ReactNode } from "react";
import type { ResolvedPage } from "@/lib/flipbook/resolve";
import { pageTree, type TreeImage, type TreeNode } from "@/lib/flipbook/tree";

/**
 * One flipbook page, drawn from the same element tree as the standalone HTML
 * download. No hooks and no client-only code: it renders on the server, in
 * the flipbook, in the designer canvas and as a thumbnail alike.
 */

const REACT_ATTR: Record<string, string> = {
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "shape-rendering": "shapeRendering",
};

function picture(img: TreeImage, priority: boolean, thumbnail: boolean): ReactNode {
  const span = Math.max(0.05, img.span);
  const sizes = thumbnail
    ? `${Math.ceil(12 * span)}vw`
    : `(max-width: 768px) ${Math.ceil(84 * span)}vw, ${Math.ceil(36 * span)}vw`;
  return (
    <Image
      key="img"
      src={img.image.url}
      alt={img.alt}
      fill
      sizes={sizes}
      priority={priority}
      className="fbimg"
      style={{ objectFit: img.fit, objectPosition: img.position }}
      {...(img.image.blurDataUrl && !thumbnail
        ? { placeholder: "blur" as const, blurDataURL: img.image.blurDataUrl }
        : {})}
    />
  );
}

function toReact(
  node: TreeNode | string,
  key: string | number,
  priority: boolean,
  thumbnail: boolean,
): ReactNode {
  if (typeof node === "string") return node;
  const props: Record<string, unknown> = { key };
  if (node.className) props.className = node.className;
  if (node.style) props.style = node.style as CSSProperties;
  for (const [name, value] of Object.entries(node.attrs ?? {})) {
    props[REACT_ATTR[name] ?? name] = value;
  }
  const children: ReactNode[] = [];
  if (node.img) children.push(picture(node.img, priority, thumbnail));
  (node.children ?? []).forEach((child, i) => {
    children.push(toReact(child, i, priority, thumbnail));
  });
  return createElement(node.tag, props, ...children);
}

export function PageView({
  page,
  priority = false,
  thumbnail = false,
}: {
  page: ResolvedPage;
  /** Load this page's pictures first (the cover). */
  priority?: boolean;
  /** Small rendition: lighter pictures. */
  thumbnail?: boolean;
}) {
  return toReact(pageTree(page), page.id, priority, thumbnail);
}
