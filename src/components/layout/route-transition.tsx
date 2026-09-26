"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { routeTone, type RouteTone } from "@/lib/route-tone";
import { cn } from "@/lib/utils";

/**
 * The route veil: what a navigation looks like between one page and the next.
 *
 * Without it a navigation was a hard cut — the old page vanished, a skeleton
 * flashed for a few frames, then the new page appeared in its place, and the
 * scroll jumped to the top somewhere in the middle. Three things happening in
 * a row, none of them animated.
 *
 * With it: the moment an internal link is clicked, a curtain sweeps up over
 * the page from the bottom edge, its leading edge a hairline of leaf with a
 * soft bloom behind it. It holds while the next page is fetched (with a thin
 * progress line along its top so a slow one is visibly still coming), and once
 * the new route has rendered underneath it, it carries on upward and off the
 * top, uncovering the new page from the bottom up. One continuous motion,
 * with the scroll reset and the swap happening behind it, unseen. The page
 * openers (src/components/motion/enter.tsx) know to wait for it.
 *
 * The veil is tinted to the page being *revealed*, not the one being left —
 * dark into the catalogue, paper into a product page — so the uncover reads as
 * the next page arriving. A neutral colour would flash between two dark pages.
 * It sits above the header too, so the header's own tone change — light-on-dark
 * to frosted, or back — happens behind it rather than as a second visible switch.
 *
 * Why a veil and not a transform on the page. The natural implementation is a
 * `template.tsx` that slides the page up as it fades in. But a transformed
 * element is a containing block for `position: fixed` descendants, and the
 * product page's mobile action bar, the flipbook's glow layer and the reading
 * progress bar are all fixed children of the page — each would render at the
 * bottom of the page for the length of the animation and then jump into the
 * viewport. Transforming a fixed *sibling* has none of that. It also never sits
 * between the pointer and the page (`pointer-events-none`), so a click during
 * the sweep lands where it was aimed.
 *
 * Only link clicks start it. Back and forward, `router.push` from the finder
 * and the search box, and form submissions arrive instantly, as before: the
 * veil only ever animates *out* on those, from already-gone, which is a no-op.
 * Under `prefers-reduced-motion` it renders nothing at all.
 */

type Phase = "idle" | "covering" | "covered" | "uncovering";

/** In-out quart: the curtain leaves rest, crosses fast, and settles. */
const SWEEP = [0.76, 0, 0.24, 1] as const;
const COVER_S = 0.42;
const UNCOVER_S = 0.66;
/** How long a navigation may take before the veil gives up and clears. */
const STALL_MS = 8000;

function internalDestination(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest("a");
  if (!anchor || !(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return null;
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return null;
  // Same document (a query change, a hash) is not a page change.
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return null;
  }
  return url.pathname;
}

const EDGE_LINE =
  "absolute inset-x-0 h-px bg-leaf-400/90 shadow-[0_0_18px_2px_rgb(165_224_95/0.55)]";

export function RouteTransition() {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const search = useSearchParams();
  const route = `${pathname}?${search.toString()}`;

  const [phase, setPhase] = useState<Phase>("idle");
  const [tone, setTone] = useState<RouteTone>("light");
  const phaseRef = useRef<Phase>("idle");
  const routeRef = useRef(route);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  // A link click starts the cover.
  useEffect(() => {
    if (reduce) return;
    const onClick = (event: MouseEvent) => {
      const destination = internalDestination(event);
      if (!destination) return;
      setTone(routeTone(destination));
      go("covering");
      if (stallTimer.current) clearTimeout(stallTimer.current);
      stallTimer.current = setTimeout(() => {
        if (phaseRef.current !== "idle") go("uncovering");
      }, STALL_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [reduce]);

  // The route changing means the next page is rendered under the veil.
  useEffect(() => {
    if (routeRef.current === route) return;
    routeRef.current = route;
    if (stallTimer.current) {
      clearTimeout(stallTimer.current);
      stallTimer.current = null;
    }
    // Mid-sweep-in: finish covering first, then the cover-complete handler
    // uncovers. Already covered: uncover now. Idle: nothing to do.
    if (phaseRef.current === "covering") go("covered");
    else if (phaseRef.current === "covered") go("uncovering");
  }, [route]);

  const pending = phase === "covering" || phase === "covered";
  const visible = phase !== "idle";

  if (reduce) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="route-veil"
          data-route-veil={phase}
          aria-hidden
          initial={{ y: "100%" }}
          animate={{ y: phase === "uncovering" ? "-100%" : "0%" }}
          // By the time it leaves the tree it is already off the top.
          exit={{ y: "-100%", transition: { duration: 0 } }}
          transition={{ duration: phase === "uncovering" ? UNCOVER_S : COVER_S, ease: SWEEP }}
          onAnimationComplete={() => {
            const current = phaseRef.current;
            if (current === "covering") {
              // Fully covered and the next page is still on its way: hold.
              go("covered");
            } else if (current === "covered") {
              // The route moved while we were still sweeping in (the usual
              // case with a prefetched link) and the route effect parked us
              // here; now that the cover is complete, let the new page through.
              go("uncovering");
            } else if (current === "uncovering") {
              go("idle");
            }
          }}
          className={cn(
            // Above the header (z-40): the bar changes tone with the route,
            // and that change belongs under the veil, not on top of it.
            "pointer-events-none fixed inset-0 z-[45] will-change-transform",
            tone === "dark" ? "bg-grain bg-humus-950" : "bg-paper",
          )}
        >
          {/* The leading edge on the way up and the trailing edge on the way
              out: a hairline of leaf with a bloom fading in behind it, so the
              sweep has a front. Each edge is off-screen during the other's
              phase. */}
          <span className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-leaf-400/25 to-transparent" />
          <span className={cn(EDGE_LINE, "top-0")} />
          <span className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-leaf-400/25 to-transparent" />
          <span className={cn(EDGE_LINE, "bottom-0")} />
          {/* Progress: creeps while the next page is on its way, then completes. */}
          <motion.span
            className="absolute inset-x-0 top-0 h-[3px] origin-left bg-leaf-400 shadow-[0_0_12px_rgb(165_224_95/0.8)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: pending ? 0.82 : 1 }}
            transition={
              pending
                ? { duration: 3.2, ease: [0.1, 0.8, 0.2, 1] }
                : { duration: 0.18, ease: "easeOut" }
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
