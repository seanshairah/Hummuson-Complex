import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One screen of the homepage.
 *
 * The homepage used to be a column of sections at whatever height their
 * content came to, so what a visitor saw at any moment was the bottom of one
 * and the top of the next — two half-things. A screen is a section that
 * fills the viewport (`min-h-[100svh]`) with its content centred, and asks the
 * browser to settle on its top edge when a scroll ends near it
 * (`scroll-snap-align: start`, under the `proximity` type set on `<html>` in
 * globals.css). `proximity`, never `mandatory`: a section taller than a small
 * phone must stay scrollable through, and a reader flicking down must never be
 * dragged back.
 *
 * `data-screen`, `data-label` and `data-tone` are what the dot navigation and
 * the header read (src/lib/screens.ts). The header sits transparent over a
 * dark screen and frosted over a light one, following whatever is beneath it.
 *
 * Top padding clears the fixed header on short viewports, where "centred" would
 * otherwise put a heading under it.
 */
export type ScreenSurface = "dark" | "paper" | "cream" | "dim";

const SURFACE: Record<ScreenSurface, string> = {
  dark: "bg-grain bg-humus-950 text-paper",
  paper: "bg-paper",
  cream: "bg-cream",
  dim: "bg-paper-dim/60",
};

export function Screen({
  id,
  label,
  tone = "paper",
  ambient = tone === "dark",
  children,
  className,
  innerClassName,
}: {
  id: string;
  /** Shown by the dot navigation; also the section's accessible name. */
  label: string;
  tone?: ScreenSurface;
  /** Drifting light on dark screens. */
  ambient?: boolean;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <section
      id={id}
      data-screen
      data-label={label}
      data-tone={tone === "dark" ? "dark" : "light"}
      aria-label={label}
      className={cn(
        "relative isolate flex min-h-[100svh] snap-start flex-col justify-center overflow-hidden pt-24 pb-12 md:pt-28 md:pb-16",
        SURFACE[tone],
        className,
      )}
    >
      {tone === "dark" && <span aria-hidden className="absolute inset-0 -z-10 glow-leaf" />}
      {ambient && <Ambient />}
      <div className={cn("relative container-site", innerClassName)}>{children}</div>
    </section>
  );
}

/**
 * Two soft bodies of light drifting behind a dark screen, on a cycle long
 * enough that nobody catches them moving — the section simply never looks the
 * same twice. Radial gradients moved by transform only: no blur filter, so
 * nothing to rasterise each frame and nothing that turns the section into a
 * containing block for fixed elements.
 */
export function Ambient({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <span
        className="absolute -top-[22%] -right-[12%] size-[62vmax] animate-drift-a rounded-full will-change-transform"
        style={{
          background: "radial-gradient(closest-side, rgb(132 204 53 / 0.17), transparent 72%)",
        }}
      />
      <span
        className="absolute -bottom-[28%] -left-[16%] size-[56vmax] animate-drift-b rounded-full will-change-transform"
        style={{
          background: "radial-gradient(closest-side, rgb(63 115 80 / 0.3), transparent 72%)",
        }}
      />
    </div>
  );
}
