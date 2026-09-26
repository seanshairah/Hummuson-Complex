"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-linked entrances, in five shapes that share one ease and one idea:
 * the element is already where it belongs, and arrives there.
 *
 *   rise   fade up — the default, for most content
 *   wipe   a curtain lifting off the block, for display headings
 *   scale  settles in from slightly larger, for media and single features
 *   blur   sharpens as it rises, for staggered cards
 *   fade   opacity only
 *
 * `wipe` is the one shape not driven by Motion's animator, and it observes a
 * different element from the one it clips. Chromium's IntersectionObserver
 * applies the target's own `clip-path` when it computes the intersection, and
 * a block clipped to nothing is never intersecting — so a clipped element
 * waiting to be seen before it unclips waits forever. That is what froze the
 * first version of this, with `clipPath` keyframes handed to Motion's
 * `whileInView` (which is an IntersectionObserver underneath): no animation
 * ever started, not even the accompanying translate, while every opacity-based
 * shape around it worked. So the observed element is a plain wrapper, and the
 * clip lives on its child as a CSS transition (`.reveal-wipe` in globals.css)
 * switched on by the wrapper's in-view attribute. The resting inset is
 * negative on every side — a clip box larger than the element — so nothing
 * is left clipped afterwards: a hover shadow still shows.
 *
 * `blur` clears its filter once it has landed: `blur(0px)` is not `none`, and
 * would keep costing a compositing layer.
 *
 * Every shape renders statically under `prefers-reduced-motion`. `Enter`
 * (enter.tsx) is the mount-timed sibling of this for page openers, and shares
 * the shapes and the ease.
 */
export type RevealVariant = "rise" | "wipe" | "scale" | "blur" | "fade";

export const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

export function entranceShape(variant: Exclude<RevealVariant, "wipe">, y: number) {
  switch (variant) {
    case "scale":
      return {
        hidden: { opacity: 0, scale: 0.94, y: y * 0.5 },
        show: { opacity: 1, scale: 1, y: 0 },
        duration: 0.8,
      };
    case "blur":
      return {
        hidden: { opacity: 0, y, filter: "blur(12px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)" },
        duration: 0.8,
      };
    case "fade":
      return { hidden: { opacity: 0 }, show: { opacity: 1 }, duration: 0.6 };
    default:
      return { hidden: { opacity: 0, y }, show: { opacity: 1, y: 0 }, duration: 0.85 };
  }
}

export function Reveal({
  children,
  variant = "rise",
  delay = 0,
  y = 40,
  once = true,
  className,
  amount = 0.12,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  y?: number;
  once?: boolean;
  className?: string;
  amount?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Always observed, so the hook order is stable across variants; the result
  // only drives the wipe.
  const inView = useInView(ref, { once, amount });

  if (reduce) return <div className={className}>{children}</div>;

  if (variant === "wipe") {
    return (
      <div ref={ref} data-inview={inView ? "" : undefined}>
        <div
          className={cn("reveal-wipe", className)}
          style={delay ? { transitionDelay: `${delay}s` } : undefined}
        >
          {children}
        </div>
      </div>
    );
  }

  const { hidden, show, duration } = entranceShape(variant, y);
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={hidden}
      whileInView={show}
      // Low threshold, no negative margin: tall sections must never sit
      // blank while a fast scroll waits for a large visible fraction.
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: REVEAL_EASE }}
      onAnimationComplete={() => {
        if (variant === "blur" && ref.current) ref.current.style.filter = "";
      }}
    >
      {children}
    </motion.div>
  );
}

/** Staggers direct children reveals. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  amount = 0.1,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** One item of a RevealGroup. The wipe is a single-element shape; use Reveal for it. */
export function RevealItem({
  children,
  className,
  variant = "rise",
  y = 32,
}: {
  children: ReactNode;
  className?: string;
  variant?: Exclude<RevealVariant, "wipe">;
  y?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  if (reduce) return <div className={className}>{children}</div>;
  const { hidden, show, duration } = entranceShape(variant, y);
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={{
        hidden,
        show: { ...show, transition: { duration, ease: REVEAL_EASE } },
      }}
      onAnimationComplete={() => {
        if (variant === "blur" && ref.current) ref.current.style.filter = "";
      }}
    >
      {children}
    </motion.div>
  );
}
