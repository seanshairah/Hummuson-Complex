"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  capturePage,
  dissolvePage,
  type PageSnapshot,
  type SettleDissolve,
} from "@/components/layout/route-snapshot";
import { setRouteStage } from "@/lib/route-stage";

/**
 * What a navigation looks like between one page and the next: a crossfade.
 *
 * The page being left dissolves into the one arriving. For about half a
 * second both are on screen: the old page fading and lifting slightly away,
 * the new one underneath with its opener rising into place (the page openers,
 * src/components/motion/enter.tsx, start a beat into the dissolve). Nothing
 * covers the screen and nothing blinks to a flat colour, which is what the
 * two earlier versions did: a tinted veil that faded in and out read as a
 * flash, and a full-height curtain sweeping up and off read as a loading
 * screen.
 *
 * How. A link click copies the page as it is on screen into an inert overlay
 * (route-snapshot.ts explains the copy), and lets Next navigate as it always
 * does. The live page stays up and usable while the next one loads, with a
 * thin progress line if the load takes long enough to notice. When the new
 * route commits, the copy goes over it before the browser paints (a layout
 * effect), so the swap itself is never seen, and the copy dissolves away.
 *
 * Why the old page is not simply animated in place: it is gone the moment the
 * new one commits, and holding the commit back would hold back the page.
 * Why not a transform on the new page: a transformed element is a containing
 * block for `position: fixed` descendants, and the product page's action bar,
 * the flipbook's glow and the reading-progress bar are fixed children of the
 * page. The overlay is a sibling, `pointer-events: none` throughout, so a
 * click during the dissolve lands on the new page where it was aimed.
 *
 * Only link clicks start it. Back and forward, `router.push` from the finder
 * and the search box, and form submissions arrive instantly, as before.
 * `html[data-route-transition]` says where it is (src/lib/route-stage.ts):
 * the openers wait for "dissolving" so that their rise is always seen.
 * Under `prefers-reduced-motion` nothing is copied and nothing animates.
 */

/** How long a navigation may take before the transition stands down. */
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
  // Same document (a hash) is not a page change.
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return null;
  }
  return url.pathname;
}

export function RouteTransition() {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const search = useSearchParams();
  const route = `${pathname}?${search.toString()}`;

  const [loading, setLoading] = useState(false);
  const snapshot = useRef<PageSnapshot | null>(null);
  const routeRef = useRef(route);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleDissolve = useRef<SettleDissolve | null>(null);
  // Each click is a generation; anything finishing late (a dissolve hurried
  // along by a second click, a stall timer) only tidies up after its own.
  const generation = useRef(0);

  // A link click takes the copy, before Next's own handler starts the
  // navigation (this listens in the capture phase).
  useEffect(() => {
    if (reduce) return;
    const onClick = (event: MouseEvent) => {
      if (!internalDestination(event)) return;
      settleDissolve.current?.("hurry");
      settleDissolve.current = null;
      const taken = capturePage();
      if (!taken) return;
      const mine = ++generation.current;
      snapshot.current = taken;
      setRouteStage("leaving");
      setLoading(true);
      if (stallTimer.current) clearTimeout(stallTimer.current);
      stallTimer.current = setTimeout(() => {
        if (generation.current !== mine) return;
        snapshot.current = null;
        setLoading(false);
        setRouteStage(null);
      }, STALL_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [reduce]);

  // The copy must show the page where it was when it went, even if the
  // reader scrolled while the next page loaded.
  useEffect(() => {
    if (!loading) return;
    const onScroll = () => {
      if (snapshot.current) snapshot.current.scrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading]);

  // The route changing means the next page is in the document. A layout
  // effect runs before the browser paints it, so the copy is over it first.
  useLayoutEffect(() => {
    if (routeRef.current === route) return;
    routeRef.current = route;
    if (stallTimer.current) {
      clearTimeout(stallTimer.current);
      stallTimer.current = null;
    }
    setLoading(false);
    const taken = snapshot.current;
    snapshot.current = null;
    if (!taken) {
      setRouteStage(null);
      return;
    }
    setRouteStage("arriving");
    const mine = generation.current;
    const settle = dissolvePage(taken, {
      onStart: () => {
        if (generation.current === mine) setRouteStage("dissolving");
      },
      onDone: () => {
        if (generation.current !== mine) return;
        settleDissolve.current = null;
        setRouteStage(null);
      },
    });
    settleDissolve.current = settle;
  }, [route]);

  useEffect(
    () => () => {
      settleDissolve.current?.("now");
      if (stallTimer.current) clearTimeout(stallTimer.current);
    },
    [],
  );

  if (reduce) return null;

  return (
    <AnimatePresence>
      {loading && (
        // Progress: only for a load long enough to notice. It waits a beat
        // before appearing, creeps while the next page is on its way, and
        // completes as it goes.
        <motion.span
          key="route-progress"
          data-route-chrome
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-leaf-400 shadow-[0_0_10px_rgb(165_224_95/0.7)]"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{
            scaleX: 0.82,
            opacity: 1,
            transition: {
              scaleX: { duration: 3.2, delay: 0.15, ease: [0.1, 0.8, 0.2, 1] },
              opacity: { duration: 0.2, delay: 0.15 },
            },
          }}
          exit={{
            scaleX: 1,
            opacity: 0,
            transition: { scaleX: { duration: 0.2 }, opacity: { duration: 0.3, delay: 0.1 } },
          }}
        />
      )}
    </AnimatePresence>
  );
}
