"use client";

import type Lenis from "lenis";
import { useSyncExternalStore } from "react";

/**
 * The one Lenis instance, for anything that wants to move the page or ride
 * along with it: the dot navigation, the homepage snap, hash links. It is
 * created by <SmoothScroll/> in the site layout (src/components/layout/
 * smooth-scroll.tsx) and is null before that, on touch devices, and under
 * `prefers-reduced-motion` — every caller falls back to native scrolling.
 *
 * A module store rather than context so that non-React code (the header's
 * menu lock, a click handler) can reach it, and a `useSyncExternalStore`
 * hook so that a component mounted before the instance exists — a page's
 * effects run before the layout's — re-renders once it does.
 */
let instance: Lenis | null = null;
const listeners = new Set<() => void>();

export function getLenis(): Lenis | null {
  return instance;
}

export function setLenis(next: Lenis | null) {
  if (instance === next) return;
  instance = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function none() {
  return null;
}

export function useLenis(): Lenis | null {
  return useSyncExternalStore(subscribe, getLenis, none);
}

/**
 * Scroll the page so `element` sits at the top of the viewport — through Lenis
 * where it runs (an eased glide whose length grows a little with the
 * distance), natively otherwise. Both honour the element's `scroll-margin-top`.
 */
export function scrollToElement(element: HTMLElement) {
  if (instance) {
    const distance = Math.abs(element.getBoundingClientRect().top);
    const duration = Math.min(1.4, 0.7 + (distance / window.innerHeight) * 0.35);
    instance.scrollTo(element, { duration });
    return;
  }
  element.scrollIntoView({ behavior: "smooth", block: "start" });
}
