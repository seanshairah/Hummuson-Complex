"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * Counts up to a real value when scrolled into view.
 *
 * The true figure is what renders on the server and what any non-JS or
 * pre-hydration visitor sees — the count-up is decoration layered on top of a
 * correct number, never a placeholder standing in for one. Showing "0" until
 * hydration would be a wrong statistic, not a loading state.
 *
 * Only ever fed verified numbers — never invented statistics.
 */
export function Counter({
  value,
  suffix = "",
  prefix = "",
  className,
  duration = 1.6,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Until the element scrolls into view the server-rendered true value stays
    // on screen; the animation only ever replaces a correct number.
    if (!inView) return;
    if (reduce) {
      el.textContent = `${prefix}${value.toLocaleString()}${suffix}`;
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = `${prefix}${Math.round(v).toLocaleString()}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, value, suffix, prefix, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}
