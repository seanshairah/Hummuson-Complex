import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A grid of cards with one gutter scale and rows that line up.
 *
 * Two problems this exists to stop repeating.
 *
 * The gutters had drifted to eight different values — gap-2, gap-2.5, gap-3,
 * gap-4, gap-5, gap-6, gap-10, gap-12 — across grids doing the same job, so
 * cards on adjacent pages sat at visibly different densities for no reason
 * anyone chose.
 *
 * And the breakpoint soup (`sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) set
 * column counts against the *viewport* when what matters is how wide a card can
 * be before it stops reading well. `auto-fill` with a minimum sets the count
 * from the space actually available, which is why these grids survive being
 * dropped inside a narrower column — a fixed `lg:grid-cols-3` does not.
 *
 * Rows are equal-height by grid default (`items-stretch`); a card only fills
 * that height if it says `h-full`, which is the honest version — short content
 * in a tall row is a card that chose to stretch, not one the grid forced.
 */
const GAP = {
  tight: "gap-3",
  base: "gap-4 sm:gap-5",
  loose: "gap-6 lg:gap-8",
} as const;

/** Minimum readable card widths, named for what they hold. */
const MIN = {
  /** Chips, stat tiles, compact list items. */
  xs: "13rem",
  /** Stockist and crop cards — a name, an address, an action. */
  sm: "16rem",
  /** Product cards with an image. */
  md: "18rem",
  /** Feature cards and editorial teasers. */
  lg: "22rem",
} as const;

export function CardGrid({
  children,
  min = "md",
  gap = "base",
  /** Hard column count, when the design genuinely calls for one. */
  cols,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  min?: keyof typeof MIN;
  gap?: keyof typeof GAP;
  cols?: string;
  className?: string;
  as?: "div" | "ul";
}) {
  return (
    <Tag
      className={cn("grid", GAP[gap], cols, className)}
      style={cols ? undefined : { gridTemplateColumns: `repeat(auto-fill, minmax(min(${MIN[min]}, 100%), 1fr))` }}
    >
      {children}
    </Tag>
  );
}
