import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/shared/breadcrumbs";
import { Em } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";

/**
 * Standard sub-page opener with fixed-header clearance, breadcrumbs and the
 * editorial eyebrow → display title → lede pattern.
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
        "relative overflow-hidden pt-28 pb-12 md:pt-36 md:pb-16",
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
          <h1
            className={cn(
              "max-w-4xl text-display-2 text-balance",
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
                "mt-5 max-w-2xl text-lg leading-relaxed",
                dark ? "text-paper/70" : "text-ink-soft",
              )}
            >
              {lede}
            </p>
          )}
          {actions && <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
