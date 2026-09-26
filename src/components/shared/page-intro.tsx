import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/shared/breadcrumbs";
import { Em } from "@/components/ui/section-heading";
import { Enter } from "@/components/motion/enter";
import { Ambient } from "@/components/home/screen";

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
 *
 * It arrives in five beats (src/components/motion/enter.tsx): the crumbs
 * fade, the eyebrow rises, the title wipes up out of its baseline, the lede
 * rises after it, the actions last — the same choreography the homepage hero
 * has, so every page opens the same way. Under the route veil the whole
 * sequence waits for the veil to clear. A dark opener carries the same
 * drifting light as a dark homepage screen.
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
        "relative isolate overflow-hidden pt-24 section-pb-tight md:pt-28 lg:pt-32",
        dark && "bg-grain bg-humus-950 text-paper",
        className,
      )}
    >
      {dark && <div className="absolute inset-0 -z-10 glow-leaf" aria-hidden />}
      {dark && <Ambient />}
      <div className="relative container-site">
        {crumbs && (
          <Enter variant="fade">
            <Breadcrumbs crumbs={crumbs} tone={tone} className="mb-6" />
          </Enter>
        )}
        {eyebrow && (
          <Enter delay={0.06} y={16}>
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
          </Enter>
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
          <Enter variant="wipe" delay={0.12}>
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
          </Enter>
          {lede && (
            <Enter delay={0.34} y={24}>
              <p
                className={cn(
                  "max-w-[58ch] text-base leading-relaxed sm:text-lg lg:pb-1.5",
                  dark ? "text-paper/70" : "text-ink-soft",
                )}
              >
                {lede}
              </p>
            </Enter>
          )}
        </div>
        {actions && (
          <Enter delay={0.46} y={20} className="mt-6">
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          </Enter>
        )}
        {children}
      </div>
    </section>
  );
}
