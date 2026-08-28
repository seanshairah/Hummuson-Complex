"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/server/data/products";
import { MediaImage } from "@/components/shared/media-image";

interface StageData {
  key: string;
  name: string;
  headline: string | null;
  description: string | null;
  products: ProductCardData[];
}

/**
 * Interactive growth-stage timeline: a growing stem line across the season
 * with selectable stages; each stage reveals the products whose own guidance
 * references it. Fully keyboard-navigable tabs.
 */
export function GrowthTimeline({ stages, cropName }: { stages: StageData[]; cropName: string }) {
  const reduce = useReducedMotion();
  const withAny = stages.some((stage) => stage.products.length > 0);
  const [activeKey, setActiveKey] = useState(
    stages.find((stage) => stage.products.length > 0)?.key ?? stages[0]?.key ?? "",
  );
  const active = stages.find((stage) => stage.key === activeKey) ?? stages[0];
  if (!active) return null;
  const activeIndex = stages.findIndex((stage) => stage.key === active.key);

  return (
    <div>
      {/* Timeline rail */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute top-[1.05rem] right-4 left-4 h-0.5 rounded bg-line md:right-8 md:left-8"
        />
        <motion.div
          aria-hidden
          className="absolute top-[1.05rem] left-4 h-0.5 origin-left rounded bg-leaf-500 md:left-8"
          initial={false}
          animate={{
            width: `calc((100% - 2rem) * ${stages.length > 1 ? activeIndex / (stages.length - 1) : 0})`,
          }}
          transition={reduce ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <div
          role="tablist"
          aria-label={`${cropName} growth stages`}
          className="relative flex justify-between gap-1 overflow-x-auto pb-2 scrollbar-none"
        >
          {stages.map((stage, i) => {
            const isActive = stage.key === active.key;
            const reached = i <= activeIndex;
            return (
              <button
                key={stage.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`stage-panel-${stage.key}`}
                id={`stage-tab-${stage.key}`}
                onClick={() => setActiveKey(stage.key)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") setActiveKey(stages[(i + 1) % stages.length]!.key);
                  if (e.key === "ArrowLeft")
                    setActiveKey(stages[(i - 1 + stages.length) % stages.length]!.key);
                }}
                className="group flex min-w-16 flex-col items-center gap-2 px-1 md:min-w-24"
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 bg-paper transition-all",
                    isActive
                      ? "scale-110 border-leaf-600 bg-leaf-400 text-humus-950 shadow-card"
                      : reached
                        ? "border-leaf-500 text-leaf-700"
                        : "border-line text-ink-faint group-hover:border-ink/30",
                  )}
                >
                  <Sprout className="size-4" strokeWidth={2} />
                </span>
                <span
                  className={cn(
                    "text-center text-[0.68rem] leading-tight font-medium tracking-wide uppercase",
                    isActive ? "text-ink" : "text-ink-faint",
                  )}
                >
                  {stage.name}
                </span>
                {stage.products.length > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[0.62rem] font-semibold",
                      isActive ? "bg-humus-900 text-paper" : "bg-paper-dim text-ink-faint",
                    )}
                  >
                    {stage.products.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage panel */}
      <div
        role="tabpanel"
        id={`stage-panel-${active.key}`}
        aria-labelledby={`stage-tab-${active.key}`}
        className="mt-6 rounded-3xl border border-line bg-cream p-6"
      >
        <motion.div
          key={active.key}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <h3 className="font-display text-xl font-semibold text-ink">
            {active.headline ?? `${active.name}`}
          </h3>
          {active.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{active.description}</p>
          )}

          {active.products.length > 0 ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {active.products.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.slug}`}
                    className="group flex items-center gap-3.5 rounded-2xl border border-line bg-paper p-3 transition-all hover:-translate-y-0.5 hover:border-leaf-600/50 hover:shadow-card"
                  >
                    {product.image && (
                      <span className="relative block h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-paper-dim">
                        <MediaImage image={product.image} alt="" fill sizes="48px" className="object-cover" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm font-semibold text-ink group-hover:text-brand">
                        {product.name}
                      </span>
                      {product.methods.length > 0 && (
                        <span className="block text-[0.68rem] tracking-wide text-ink-faint uppercase">
                          {product.methods[0]!.replace(/_/g, " ").toLowerCase()}
                        </span>
                      )}
                    </span>
                    <ArrowRight className="ml-auto size-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-leaf-700" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-faint">
              {withAny
                ? `No product in the range references the ${active.name.toLowerCase()} stage for ${cropName} — ask a Humuson adviser what fits here.`
                : `Stage-by-stage guidance for ${cropName} isn’t published yet — a Humuson adviser can plan the season with you.`}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
