"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A soft pool of light that follows the pointer across a card. Two custom
 * properties set on move, one radial gradient that reads them; the overlay is
 * `pointer-events-none`, so the card underneath is still the thing being
 * clicked, and it only fades in on hover, so a touch never leaves a
 * highlight behind. Give it the card's radius so the pool is clipped to the
 * same corners.
 */
export function Spotlight({
  children,
  className,
  tone = "light",
  radius = 260,
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark";
  radius?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--sy", `${event.clientY - rect.top}px`);
  };
  const colour = tone === "dark" ? "rgb(196 238 142 / 0.14)" : "rgb(165 224 95 / 0.3)";
  return (
    <div ref={ref} onPointerMove={onMove} className={cn("group/spot relative", className)}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(${radius}px circle at var(--sx, 50%) var(--sy, 50%), ${colour}, transparent 60%)`,
        }}
      />
    </div>
  );
}
