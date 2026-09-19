import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/shared/breadcrumbs";
import { Em } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

/**
 * Standard sub-page opener: header clearance, breadcrumbs, eyebrow → title →
 * lede, and the gap to whatever comes next.
 *
 * It used to run `pt-28 pb-12 md:pt-36 md:pb-16` with the title at
 * `text-display-2` — 68px on a laptop above 4.5rem of clearance above a 4.5rem
 * header. The first useful line of every sub-page sat most of a screen down.
 * The type is a step smaller and the clearance a step tighter; the page reads
 * the same and starts sooner.
 *
 * The bottom padding here *is* the gap to the first section, which is why
 * sections that follow a PageIntro declare `top="none"`. Two paddings meeting
 * at that seam is what produced the 8rem voids.
 */
export function PageIntro({
  eyebrow,
  title,
  titleAccent,
  lede,
  crumbs,
  actions,
  children,
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  /** Rendered after `title` in editorial italics. */
  titleAccent?: string;
  lede?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  children?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <section
      className={cn(
        "relative overflow-hidden pt-24 section-pb-tight md:pt-28 lg:pt-32",
        dark && "bg-grain bg-humus-950 text-paper",
        className,
      )}
    >
      {dark && <div className="absolute inset-0 glow-leaf" aria-hidden />}
      <div className="relative container-site">
        {crumbs && <Breadcrumbs crumbs={crumbs} tone={tone} className="mb-6" />}
        <Reveal y={20}>
          {eyebrow && (
            <p
              className={cn(
                "mb-4 flex items-center gap-3 text-eyebrow",
                dark ? "text-leaf-400" : "text-leaf-700",
              )}
            >
              <span
                aria-hidden
                className={cn("h-px w-8", dark ? "bg-leaf-400/60" : "bg-leaf-700/50")}
              />
              {eyebrow}
            </p>
          )}
          {/* Title and lede sit side by side once there is room for them.
              Stacked, a two-line title over a four-line lede pushed the first
              control most of a screen down while the right half of the measure
              stayed empty — the height and the void were the same problem. The
              lede is bottom-aligned so it settles on the title's last line
              rather than floating beside its middle. */}
          <div
            className={cn(
              "grid gap-x-8 gap-y-4",
              lede && "lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-x-12",
            )}
          >
            <h1
              className={cn(
                "max-w-4xl text-page-title text-balance",
                dark ? "text-paper" : "text-ink",
              )}
            >
              {title}
              {titleAccent && (
                <>
                  {" "}
                  <Em className={dark ? "text-leaf-300" : "text-brand"}>{titleAccent}</Em>
                </>
              )}
            </h1>
            {lede && (
              <p
                className={cn(
                  "max-w-[58ch] text-base leading-relaxed sm:text-lg lg:pb-1.5",
                  dark ? "text-paper/70" : "text-ink-soft",
                )}
              >
                {lede}
              </p>
            )}
          </div>
          {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
