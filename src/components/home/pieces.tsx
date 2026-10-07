"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import type { ProductCardData } from "@/server/data/products";
import { MediaImage } from "@/components/shared/media-image";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Spotlight } from "@/components/motion/spotlight";

/**
 * The homepage's animated set pieces. Kept apart from sections.tsx so that
 * file stays a server component: these are the only parts of the page that
 * need motion values of their own rather than a Reveal wrapper.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Finder: three questions on a drawn spine ───────────────────────────── */

export function FinderSteps({ steps }: { steps: { n: string; q: string }[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative">
      {/* The spine draws itself down as the questions arrive on it. */}
      <motion.span
        aria-hidden
        className="absolute top-8 bottom-8 left-[2.25rem] w-px origin-top bg-gradient-to-b from-leaf-400/70 via-leaf-400/35 to-transparent"
        initial={reduce ? false : { scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.3, delay: 0.25, ease: EASE }}
      />
      <RevealGroup className="space-y-3" stagger={0.11}>
        {steps.map((step) => (
          <RevealItem key={step.n} variant="blur">
            <Spotlight tone="dark" className="rounded-2xl">
              <div className="flex items-center gap-5 rounded-2xl border border-paper/10 bg-paper/5 px-5 py-4 backdrop-blur-sm transition-colors duration-300 hover:border-leaf-400/40">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-leaf-400/45 bg-humus-950 font-display text-xs font-semibold text-leaf-400">
                  {step.n}
                </span>
                <span className="font-display text-base font-medium text-paper md:text-lg">
                  {step.q}
                </span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-paper/30" aria-hidden />
              </div>
            </Spotlight>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}

/* ── Catalogue: a fan of spreads that drift ─────────────────────────────── */

export function CatalogueSpreads({ spreads }: { spreads: ProductCardData[] }) {
  const reduce = useReducedMotion();
  if (spreads.length === 0) return null;
  return (
    <div className="relative mx-auto h-72 w-full max-w-md md:h-80">
      {spreads.map((product, i) => {
        const tilt = (i - 1) * 3;
        return (
          <motion.div
            key={product.id}
            className="absolute inset-y-0 hover:z-20"
            style={{
              left: `${i * 18}%`,
              right: `${(spreads.length - 1 - i) * 18}%`,
              zIndex: 10 - Math.abs(i - 1),
            }}
            initial={reduce ? false : { opacity: 0, y: 56, rotate: tilt + 7 }}
            whileInView={{ opacity: 1, y: Math.abs(i - 1) * 8, rotate: tilt }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.95, delay: 0.15 + i * 0.13, ease: EASE }}
            whileHover={reduce ? undefined : { scale: 1.04 }}
          >
            {/* The float lives on an inner element so it never fights the
                entrance transform for control of the same property. */}
            <div
              className="h-full animate-float-y overflow-hidden rounded-2xl border border-paper/15 shadow-float"
              style={{ animationDelay: `${i * -2.3}s`, animationDuration: `${7 + i}s` }}
            >
              {product.image && (
                <MediaImage
                  image={product.image}
                  alt={product.name}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-humus-950/70 to-transparent"
              />
              <p className="absolute bottom-3 left-4 font-display text-sm font-semibold text-paper">
                {product.name}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Why Humuson: the field note pinned to the photograph ───────────────── */

export function FieldNote({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.8, rotate: -5 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ type: "spring", stiffness: 190, damping: 17, delay: 0.55 }}
      className="absolute -right-3 -bottom-5 max-w-[240px] rounded-2xl bg-leaf-400 p-5 text-humus-950 shadow-float md:-right-6"
    >
      {children}
    </motion.div>
  );
}
