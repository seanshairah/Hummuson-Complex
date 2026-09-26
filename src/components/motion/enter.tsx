"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ROUTE_DISSOLVE_EVENT, getRouteStage } from "@/lib/route-stage";
import { REVEAL_EASE, entranceShape, type RevealVariant } from "@/components/motion/reveal";

/**
 * A page opener's entrance.
 *
 * `Reveal` waits to be scrolled into view; a page's first screen is in view
 * the moment it exists, and what it wants is a choreographed arrival —
 * crumbs, eyebrow, title, lede, actions, each a beat after the last. `Enter`
 * plays on mount.
 *
 * When it mounts during a route transition, the page being left is still on
 * screen as a copy over this one (src/components/layout/route-transition.tsx),
 * and it holds until that copy starts to dissolve (`useArrival`): the rise
 * then plays as the old page thins out, instead of on a clock started at
 * mount that a slow device would spend painting, with the rise over before
 * anything was visible. A fallback releases it if the signal never comes.
 * There is no transition on a hard load, and no hold.
 *
 * `wipe` is the same CSS curtain as Reveal's, switched on a frame after mount
 * so the clipped state is painted first and the transition has somewhere to
 * start from. Every shape renders statically under `prefers-reduced-motion`.
 */
export type EnterVariant = RevealVariant;

/** Seconds into the dissolve at which an arriving page's opener starts to rise. */
const ARRIVAL_LEAD = 0.05;
/** How long an opener waits for the dissolve before it goes anyway. */
const ARRIVAL_FALLBACK_MS = 900;

function waitingForDissolve() {
  const stage = getRouteStage();
  return stage === "leaving" || stage === "arriving";
}

/**
 * For page-opening motion: `held` while the page it belongs to is arriving
 * under the copy of the one being left, false from the moment that copy
 * starts to dissolve (or at once, outside a transition); `lead` is the beat
 * to add after that. Both are read at first render, so Motion has them when
 * it starts: a `transition` that changes later does not restart an animation.
 */
export function useArrival(): { held: boolean; lead: number } {
  const [lead] = useState(() => (getRouteStage() ? ARRIVAL_LEAD : 0));
  const [held, setHeld] = useState(waitingForDissolve);
  useEffect(() => {
    if (!held) return;
    const release = () => setHeld(false);
    if (!waitingForDissolve()) {
      release();
      return;
    }
    window.addEventListener(ROUTE_DISSOLVE_EVENT, release);
    const fallback = setTimeout(release, ARRIVAL_FALLBACK_MS);
    return () => {
      window.removeEventListener(ROUTE_DISSOLVE_EVENT, release);
      clearTimeout(fallback);
    };
  }, [held]);
  return { held, lead };
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
  const { held, lead } = useArrival();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (reduce) return <div className={className}>{children}</div>;
  const start = lead + delay;

  if (variant === "wipe") {
    return (
      <div data-inview={mounted && !held ? "" : undefined}>
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
      animate={held ? hidden : show}
      transition={{ duration, delay: start, ease: REVEAL_EASE }}
    >
      {children}
    </motion.div>
  );
}
