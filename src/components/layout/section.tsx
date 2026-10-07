import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page's vertical rhythm and horizontal measure, in one place.
 *
 * Before this, every page picked its own: `pb-16` here, `pb-20` there,
 * `py-16 md:py-20` on the next one, `pt-8` where somebody wanted a bit less.
 * Nothing was wrong on its own and the whole was incoherent — section seams
 * landed at different heights on adjacent pages and the gutters drifted with
 * them. A shared component is the only version of this that stays true: a
 * shared *convention* is one hurried commit away from being broken again.
 *
 * `space` is deliberately coarse. Three steps that are obviously different beat
 * eight that are nearly the same.
 */
export type SectionSpace = "none" | "tight" | "base" | "loose";

const SPACE_Y: Record<SectionSpace, string> = {
  none: "",
  tight: "section-y-tight",
  base: "section-y",
  loose: "section-y-loose",
};

const SPACE_TOP: Record<SectionSpace, string> = {
  none: "",
  tight: "section-pt-tight",
  base: "section-pt",
  loose: "section-pt",
};

const SPACE_BOTTOM: Record<SectionSpace, string> = {
  none: "",
  tight: "section-pb-tight",
  base: "section-pb",
  loose: "section-pb-loose",
};

const WIDTH: Record<"site" | "wide" | "reading", string> = {
  site: "container-site",
  wide: "container-wide",
  // Reading measure still sits inside the page gutters, so an editorial column
  // lines up with everything above and below it instead of floating free.
  reading: "container-site",
};

export function Section({
  children,
  space = "base",
  top,
  bottom,
  tone = "none",
  width = "site",
  as: Tag = "section",
  className,
  innerClassName,
  id,
  "aria-labelledby": ariaLabelledBy,
}: {
  children: ReactNode;
  /** Vertical padding on both sides. `top`/`bottom` override it individually. */
  space?: SectionSpace;
  top?: SectionSpace;
  bottom?: SectionSpace;
  tone?: "none" | "paper" | "dark";
  width?: "site" | "wide" | "reading";
  as?: ElementType;
  /** Classes on the full-bleed outer element — backgrounds, overflow. */
  className?: string;
  /** Classes on the measured inner element — grids, spacing between children. */
  innerClassName?: string;
  id?: string;
  "aria-labelledby"?: string;
}) {
  const dark = tone === "dark";
  const pad =
    top !== undefined || bottom !== undefined
      ? cn(SPACE_TOP[top ?? "none"], SPACE_BOTTOM[bottom ?? "none"])
      : SPACE_Y[space];

  return (
    <Tag
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "relative",
        pad,
        tone === "paper" && "bg-paper-dim",
        dark && "bg-grain bg-humus-950 text-paper",
        className,
      )}
    >
      {dark && <span aria-hidden className="absolute inset-0 glow-leaf" />}
      <div className={cn("relative", WIDTH[width], innerClassName)}>
        {width === "reading" ? (
          <div className="container-reading">{children}</div>
        ) : (
          children
        )}
      </div>
    </Tag>
  );
}
