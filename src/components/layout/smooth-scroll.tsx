"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getLenis, setLenis } from "@/lib/smooth-scroll";

/**
 * Smooth scrolling for the whole site.
 *
 * A wheel notch is a hard 100px step and a trackpad flick is a burst of them;
 * the browser applies each one the instant it arrives, so the page moves in
 * jolts and stops dead. Lenis takes the wheel input, keeps a target position,
 * and every frame moves the real scroll a fraction of the remaining distance
 * towards it — the page glides and settles. It is the native scroll position
 * that moves, so sticky elements, IntersectionObservers, the parallax layers
 * and the reading-progress bar all keep working unchanged.
 *
 * Only where there is a wheel. A phone's scrolling is already inertial and
 * Lenis's touch mode would replace it with a worse copy, so touch-only devices
 * keep native scrolling (and the CSS scroll-snap on the homepage, which is
 * switched off under Lenis in favour of the snap in screen-nav.tsx: the
 * browser's snapping and Lenis's interpolation each correct the other into a
 * stutter). Under `prefers-reduced-motion` Lenis is not created at all.
 *
 * Three things Lenis does not know about on its own:
 *
 *   – Scroll locks. A dialog, a sheet or the search box locks the body
 *     (react-remove-scroll marks it `data-scroll-locked`), but a lock only
 *     stops *native* scrolling; a wheel over the overlay would still glide the
 *     page underneath. The body attribute is watched and Lenis stopped while
 *     it is there. Wheel *inside* the overlay's own scroller still works:
 *     those carry `data-lenis-prevent` and Lenis leaves them alone.
 *
 *   – Route changes. Next resets the scroll (or restores it, on back/forward)
 *     natively after the new page commits. Lenis adopts a native move only
 *     when it is not itself mid-glide, so after each navigation it is told
 *     where the page is outright.
 *
 *   – Hash links. Same-page anchors (the product page's section jumps, the
 *     catalogue's range list) glide instead of jumping. The click is *not*
 *     prevented — the hash still lands in the URL and focus still moves, as a
 *     native anchor's does — because Lenis writes its own frame back before
 *     the native jump can be painted.
 */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: true,
      anchors: false,
      // A click on a link to another page stops the glide where it is: the
      // veil covers a still page, and the next one starts at rest.
      stopInertiaOnNavigate: true,
      // Any scrollable element under the pointer that can still move in the
      // gesture's direction takes the wheel natively.
      allowNestedScroll: true,
    });
    setLenis(lenis);

    const body = document.body;
    const syncLock = () => {
      if (body.hasAttribute("data-scroll-locked")) lenis.stop();
      else lenis.start();
    };
    const locks = new MutationObserver(syncLock);
    locks.observe(body, { attributes: true, attributeFilter: ["data-scroll-locked"] });
    syncLock();

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || !url.hash) return;
      if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
        return;
      }
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) lenis.scrollTo(target, { duration: 1 });
    };
    document.addEventListener("click", onClick);

    return () => {
      locks.disconnect();
      document.removeEventListener("click", onClick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  useEffect(() => {
    const lenis = getLenis();
    if (!lenis) return;
    const frame = requestAnimationFrame(() => {
      lenis.resize();
      lenis.scrollTo(window.scrollY, { immediate: true, force: true, programmatic: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
