"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { REVEAL_EASE, entranceShape, type RevealVariant } from "@/components/motion/reveal";

/**
 * A page opener's entrance.
 *
 * `Reveal` waits to be scrolled into view; a page's first screen is in view
 * the moment it exists, and what it wants is a choreographed arrival —
 * crumbs, eyebrow, title, lede, actions, each a beat after the last — timed
 * to the route veil clearing above it. `Enter` plays on mount, and when it
 * mounts under a veil (a client-side navigation) it holds for the veil to
 * pass: the veil lifts off the top of the viewport last, so without the hold
 * a title would be finished arriving before it could be seen. A veil still on
 * its way *in* when the page mounts (a prefetched link) is held for longer.
 *
 * The hold is read once, when the component first renders, so that Motion has
 * the delay when it starts the animation: a `transition` that changes later
 * does not restart one. There is no veil on a hard load, and no hold.
 *
 * `wipe` is the same CSS curtain as Reveal's, switched on a frame after mount
 * so the clipped state is painted first and the transition has somewhere to
 * start from. Every shape renders statically under `prefers-reduced-motion`.
 */
export type EnterVariant = RevealVariant;

/** Seconds a clearing veil takes to uncover enough of the page for an opener to be seen. */
const VEIL_LEAD = 0.26;
/** Seconds a veil still covering takes to finish covering, on top of the lead. */
const VEIL_COVER = 0.42;

function veilLead() {
  if (typeof document === "undefined") return 0;
  const veil = document.querySelector("[data-route-veil]");
  if (!veil) return 0;
  return veil.getAttribute("data-route-veil") === "covering" ? VEIL_COVER + VEIL_LEAD : VEIL_LEAD;
}

/** The delay page-opening motion adds when it is mounting under a route veil. */
export function useVeilLead(): number {
  const [lead] = useState(veilLead);
  return lead;
}

export function Enter({
  children,
  variant = "rise",
  delay = 0,
  y = 32,
  className,
}: {
  children: ReactNode;
  variant?: EnterVariant;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const lead = useVeilLead();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (reduce) return <div className={className}>{children}</div>;
  const start = lead + delay;

  if (variant === "wipe") {
    return (
      <div data-inview={mounted ? "" : undefined}>
        <div
          className={cn("reveal-wipe", className)}
          style={start ? { transitionDelay: `${start}s` } : undefined}
        >
          {children}
        </div>
      </div>
    );
  }

  const { hidden, show, duration } = entranceShape(variant, y);
  return (
    <motion.div
      className={className}
      initial={hidden}
      animate={show}
      transition={{ duration, delay: start, ease: REVEAL_EASE }}
    >
      {children}
    </motion.div>
  );
}
