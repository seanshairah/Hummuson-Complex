"use client";

import { useActiveScreen } from "@/lib/screens";
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
 */
export function ScreenNav() {
  const { active, screens } = useActiveScreen(() => window.innerHeight / 2, "home");
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
                onClick={() =>
                  document
                    .getElementById(screen.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
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
