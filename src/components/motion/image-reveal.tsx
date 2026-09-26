"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const FROM: Record<"up" | "down" | "left" | "right", string> = {
  up: "inset(100% 0 0 0)",
  down: "inset(0 0 100% 0)",
  left: "inset(0 100% 0 0)",
  right: "inset(0 0 0 100%)",
};

/**
 * A photograph arriving: a curtain draws back across the frame while the
 * picture settles from slightly enlarged to its resting size — the two
 * together read as the image being uncovered rather than switched on.
 *
 * CSS transitions switched on by an in-view attribute (`.image-reveal` in
 * globals.css), with the clip on a child of the observed element, for the
 * reason given on the heading wipe in reveal.tsx: an IntersectionObserver in
 * Chromium sees a clipped-to-nothing target as never intersecting. The
 * starting inset is passed in as a custom property so the direction stays a
 * prop.
 *
 * The outer element is the frame (give it the aspect ratio, radius and
 * `relative`) and is what the observer watches; the middle one clips, taking
 * the frame's radius; the inner one scales, and is positioned so a `fill`
 * image inside lays out against it.
 */
export function ImageReveal({
  children,
  className,
  direction = "up",
  delay = 0,
  amount = 0.25,
}: {
  children: ReactNode;
  className?: string;
  direction?: keyof typeof FROM;
  delay?: number;
  amount?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });
  if (reduce) return <div className={className}>{children}</div>;
  const wait: React.CSSProperties = delay ? { transitionDelay: `${delay}s` } : {};
  // The starting inset rides in as a custom property, which CSSProperties
  // does not know about; it is set by name to keep the object typed.
  const frame: React.CSSProperties = { ...wait };
  (frame as Record<string, string>)["--reveal-from"] = FROM[direction];
  return (
    <div ref={ref} data-inview={inView ? "" : undefined} className={cn("relative", className)}>
      <div className="image-reveal absolute inset-0 overflow-hidden rounded-[inherit]" style={frame}>
        <div className="image-reveal-inner relative h-full w-full" style={wait}>
          {children}
        </div>
      </div>
    </div>
  );
}
