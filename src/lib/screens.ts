"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The homepage is a run of full-height "screens" (see
 * src/components/home/screen.tsx). Two things want to know which one is under
 * a given point of the viewport: the header, which takes its tone from the
 * screen beneath its own bar, and the dot navigation, which marks the screen at
 * the middle of the viewport.
 *
 * A scroll listener with a point probe rather than IntersectionObserver: the
 * question is "which screen contains this y", and with eight screens that is
 * eight rectangle reads per frame — cheaper and more exact than reasoning
 * about intersection ratios of elements that are each a viewport tall.
 */
export type ScreenTone = "dark" | "light";

export interface ScreenInfo {
  id: string;
  label: string;
  tone: ScreenTone;
  index: number;
}

export function useActiveScreen(probeY: () => number, key: string) {
  const [active, setActive] = useState<ScreenInfo | null>(null);
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const probe = useRef(probeY);
  probe.current = probeY;

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-screen]"));
    const list: ScreenInfo[] = els.map((el, index) => ({
      id: el.id,
      label: el.dataset.label ?? el.id,
      tone: el.dataset.tone === "dark" ? "dark" : "light",
      index,
    }));
    setScreens(list);
    if (els.length === 0) {
      setActive(null);
      return;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const y = probe.current();
      let found: ScreenInfo | null = null;
      for (let i = 0; i < els.length; i++) {
        const rect = els[i]?.getBoundingClientRect();
        if (rect && rect.top <= y && rect.bottom > y) {
          found = list[i] ?? null;
          break;
        }
      }
      setActive((prev) => (prev?.id === found?.id ? prev : found));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [key]);

  return { active, screens };
}
