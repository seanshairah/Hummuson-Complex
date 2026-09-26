"use client";

import type Lenis from "lenis";
import { useEffect } from "react";
import { useActiveScreen } from "@/lib/screens";
import { scrollToElement, useLenis } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";

/**
 * Dot navigation for the homepage screens: one dot per screen, the current one
 * stretched into a bar with its label beside it. Desktop only — a phone's
 * right edge is where thumbs are, and the screens are one flick apart anyway.
 *
 * It takes its colours from the screen at the middle of the viewport, so it
 * reads on the dark screens and the light ones alike, and it fades out once
 * the footer has the viewport to itself.
 *
 * The current screen's label stays on only from 1400px up. Below that the
 * content runs to within a few pixels of the viewport edge and the label sat
 * across the last card; the dots alone clear it at every width the nav shows
 * at, and every label still appears on hover or focus.
 *
 * It also owns the snap. Under Lenis (src/components/layout/smooth-scroll.tsx)
 * the CSS `scroll-snap-type` on the document is off — the browser's snapping
 * and Lenis's glide would each correct the other — so the rule is applied
 * here instead, on the glide's own terms: a beat after the last wheel event,
 * wherever the glide is *heading* is compared with the screen edges around
 * it, and the glide is retargeted to one of them. The rule leans the way the
 * reader is going: a scroll that has come more than a fifth of the way into a
 * screen goes on to the next edge, a smaller one goes back. A screen taller
 * than the viewport can still be read through the middle — neither edge is
 * near enough and nothing moves — and the footer below the last screen is
 * free. Touch is never retargeted; on a touchscreen laptop the finger's own
 * inertia stands. Phones and reduced motion never reach this: they keep the
 * CSS snap.
 */

/** Into a screen by more than this fraction of the viewport, a scroll goes on to the next edge. */
const ADVANCE = 0.18;
/** Within this fraction of the viewport of an edge, a scroll completes to it. */
const COMPLETE = 0.82;
/** Quiet time after the last wheel event before the glide is retargeted. */
const SETTLE_MS = 160;

function useScreenSnap(lenis: Lenis | null) {
  useEffect(() => {
    if (!lenis) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let direction = 0;

    const settle = () => {
      timer = null;
      if (lenis.isStopped || lenis.isLocked) return;
      const vh = window.innerHeight;
      const scrollY = window.scrollY;
      const heading = Math.max(0, Math.min(lenis.targetScroll, lenis.limit));
      const screens = Array.from(document.querySelectorAll<HTMLElement>("[data-screen]")).map(
        (el) => {
          const rect = el.getBoundingClientRect();
          return { top: rect.top + scrollY, bottom: rect.bottom + scrollY };
        },
      );
      const index = screens.findIndex((s) => s.top <= heading + 1 && s.bottom > heading + 1);
      const here = screens[index]?.top;
      if (here === undefined) return;
      const next = screens[index + 1]?.top ?? null;
      const fromHere = heading - here;
      const toNext = next === null ? Number.POSITIVE_INFINITY : next - heading;

      let target: number | null = null;
      if (direction > 0) {
        if (toNext <= vh * COMPLETE) target = next;
        else if (fromHere <= vh * ADVANCE) target = here;
      } else {
        if (fromHere <= vh * COMPLETE) target = here;
        else if (toNext <= vh * ADVANCE) target = next;
      }
      if (target === null || Math.abs(target - heading) < 1) return;
      const distance = Math.abs(target - scrollY);
      lenis.scrollTo(target, { duration: Math.min(1.3, 0.6 + (distance / vh) * 0.45) });
    };

    const off = lenis.on("virtual-scroll", ({ deltaY, event }) => {
      if (event.type !== "wheel" || deltaY === 0) return;
      if (event.target instanceof Element && event.target.closest("[data-lenis-prevent]")) return;
      direction = Math.sign(deltaY);
      if (timer) clearTimeout(timer);
      timer = setTimeout(settle, SETTLE_MS);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, [lenis]);
}

export function ScreenNav() {
  const { active, screens } = useActiveScreen(() => window.innerHeight / 2, "home");
  const lenis = useLenis();
  useScreenSnap(lenis);
  if (screens.length < 2) return null;
  const dark = active?.tone === "dark";

  return (
    <nav
      aria-label="Sections"
      className={cn(
        "fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 transition-opacity duration-300 lg:block",
        active ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ol className="flex flex-col items-end gap-2.5">
        {screens.map((screen) => {
          const current = screen.id === active?.id;
          return (
            <li key={screen.id}>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById(screen.id);
                  if (el) scrollToElement(el);
                }}
                aria-label={`Go to ${screen.label}`}
                aria-current={current ? "true" : undefined}
                className="group flex items-center gap-3 py-1"
              >
                <span
                  className={cn(
                    "font-display text-[0.66rem] tracking-[0.2em] uppercase transition-opacity duration-300",
                    "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                    current && "min-[1400px]:opacity-100",
                    dark ? "text-paper/80" : "text-ink/70",
                  )}
                >
                  {screen.label}
                </span>
                <span
                  className={cn(
                    "block rounded-full transition-all duration-300",
                    current ? "h-6 w-1.5" : "size-1.5 group-hover:scale-125",
                    dark
                      ? current
                        ? "bg-leaf-400"
                        : "bg-paper/45"
                      : current
                        ? "bg-leaf-700"
                        : "bg-ink/30",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
