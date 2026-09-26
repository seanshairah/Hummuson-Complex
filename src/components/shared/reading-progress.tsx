"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

/** Thin reading-progress bar pinned under the header on article pages. */
export function ReadingProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-leaf-500"
    />
  );
}
