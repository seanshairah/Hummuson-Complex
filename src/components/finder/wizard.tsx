"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, HelpCircle, RotateCcw, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/shared/product-card";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { Spinner } from "@/components/ui/skeleton";
import { ButtonLink } from "@/components/ui/button";
import { cn, humanize } from "@/lib/utils";
import { trackClient } from "@/lib/analytics-client";
import { whatsappAdviceMessage } from "@/lib/whatsapp";
import type { ProductCardData } from "@/server/data/products";

export interface FinderOptions {
  crops: { slug: string; name: string; count: number }[];
  benefits: { slug: string; name: string; count: number }[];
  stages: { key: string; name: string }[];
  methods: string[];
}

interface Answers {
  cropSlug?: string;
  benefitSlug?: string;
  stageKey?: string;
  method?: string;
}

interface ResultEntry {
  product: ProductCardData;
  reasons: string[];
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function FinderWizard({ options }: { options: FinderOptions }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [results, setResults] = useState<ResultEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const steps = useMemo(
    () => [
      {
        key: "crop",
        eyebrow: "Question 1 of 4",
        question: "What are you growing?",
        hint: "Crops as listed in Humuson product guidance.",
        options: [
          ...options.crops.map((crop) => ({
            value: crop.slug,
            label: crop.name.charAt(0).toUpperCase() + crop.name.slice(1),
            meta: `${crop.count} product${crop.count === 1 ? "" : "s"}`,
          })),
          { value: "", label: "Other / not listed", meta: "We’ll match broadly" },
        ],
        selected: answers.cropSlug ?? (answers.cropSlug === "" ? "" : undefined),
        set: (value: string) => setAnswers((a) => ({ ...a, cropSlug: value || undefined })),
      },
      {
        key: "benefit",
        eyebrow: "Question 2 of 4",
        question: "What do you want to improve?",
        hint: "Goals evidenced in the products’ own published claims.",
        options: options.benefits.map((benefit) => ({
          value: benefit.slug,
          label: benefit.name,
          meta: `${benefit.count} product${benefit.count === 1 ? "" : "s"}`,
        })),
        selected: answers.benefitSlug,
        set: (value: string) => setAnswers((a) => ({ ...a, benefitSlug: value || undefined })),
      },
      {
        key: "stage",
        eyebrow: "Question 3 of 4",
        question: "What stage is your crop?",
        hint: "Products are matched where their guidance references the stage.",
        options: [
          ...options.stages.map((stage) => ({
            value: stage.key,
            label: stage.name,
            meta: undefined,
          })),
          { value: "", label: "Not sure", meta: undefined },
        ],
        selected: answers.stageKey ?? (answers.stageKey === "" ? "" : undefined),
        set: (value: string) => setAnswers((a) => ({ ...a, stageKey: value || undefined })),
      },
      {
        key: "method",
        eyebrow: "Question 4 of 4",
        question: "Preferred application method?",
        hint: "Not sure is a perfectly good answer — we’ll include everything.",
        options: [
          ...options.methods.map((method) => ({
            value: method,
            label: humanize(method),
            meta: undefined,
          })),
          { value: "NOT_SURE", label: "Not sure", meta: undefined },
        ],
        selected: answers.method,
        set: (value: string) => setAnswers((a) => ({ ...a, method: value })),
      },
    ],
    [options, answers],
  );

  const current = steps[step];

  const submit = async (finalAnswers: Answers) => {
    setLoading(true);
    try {
      const res = await fetch("/api/finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalAnswers),
      });
      const data = res.ok ? ((await res.json()) as { results: ResultEntry[] }) : { results: [] };
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const choose = (value: string) => {
    if (!current) return;
    if (!started) {
      setStarted(true);
      trackClient("FINDER_STARTED");
    }
    current.set(value);
    const nextAnswers: Answers = { ...answers };
    if (current.key === "crop") nextAnswers.cropSlug = value || undefined;
    if (current.key === "benefit") nextAnswers.benefitSlug = value || undefined;
    if (current.key === "stage") nextAnswers.stageKey = value || undefined;
    if (current.key === "method") nextAnswers.method = value;

    if (step < steps.length - 1) {
      setTimeout(() => setStep((s) => s + 1), reduce ? 0 : 240);
    } else {
      void submit(nextAnswers);
    }
  };

  const restart = () => {
    setAnswers({});
    setResults(null);
    setStep(0);
  };

  const summaryChips = [
    answers.cropSlug
      ? (options.crops.find((c) => c.slug === answers.cropSlug)?.name ?? answers.cropSlug)
      : started
        ? "Any crop"
        : null,
    answers.benefitSlug ? options.benefits.find((b) => b.slug === answers.benefitSlug)?.name : null,
    answers.stageKey ? options.stages.find((s) => s.key === answers.stageKey)?.name : null,
    answers.method ? humanize(answers.method) : null,
  ].filter((chip): chip is string => Boolean(chip));

  /* Results view */
  if (loading || results !== null) {
    return (
      <div className="container-site pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-paper/80">
            <Spinner className="size-8 text-leaf-400" />
            <p className="font-display text-lg">Matching your answers against the range…</p>
          </div>
        ) : (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="flex flex-wrap items-center gap-2 pt-4">
              {summaryChips.map((chip) => (
                <span
                  key={chip}
                  className="flex items-center gap-1.5 rounded-full border border-paper/20 px-3.5 py-1.5 text-xs font-medium text-paper/85 capitalize"
                >
                  <Check className="size-3 text-leaf-400" /> {chip}
                </span>
              ))}
              <button
                type="button"
                onClick={restart}
                className="ml-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-paper/60 transition-colors hover:text-paper"
              >
                <RotateCcw className="size-3.5" /> Start over
              </button>
            </div>

            {results && results.length > 0 ? (
              <>
                <h2 className="mt-8 text-display-3 text-paper">
                  {results.length} match{results.length === 1 ? "" : "es"} from the range
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-paper/65">
                  Ranked by how closely each product’s published guidance matches your answers.
                  Always confirm application details with Humuson technical support.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((entry) => (
                    <ProductCard
                      key={entry.product.id}
                      product={entry.product}
                      reasons={entry.reasons}
                      className="h-full"
                    />
                  ))}
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-3 rounded-3xl p-6 glass-dark">
                  <p className="text-sm text-paper/80">Want a second opinion on these matches?</p>
                  <div className="ml-auto flex flex-wrap gap-3">
                    <WhatsAppButton
                      message={whatsappAdviceMessage(
                        `choosing between ${results
                          .slice(0, 3)
                          .map((entry) => entry.product.name)
                          .join(", ")}`,
                      )}
                      label="Ask an adviser"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="mx-auto max-w-xl py-20 text-center">
                <HelpCircle className="mx-auto size-10 text-leaf-400" strokeWidth={1.5} />
                <h2 className="mt-5 text-display-3 text-paper">No confident match — yet</h2>
                <p className="mt-3 text-sm leading-relaxed text-paper/70">
                  Nothing in the published guidance matches that exact combination, and we won’t
                  guess. A Humuson agronomist will know what fits — basic consultation is free.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <WhatsAppButton
                    message={whatsappAdviceMessage(summaryChips.join(", ") || "my crop")}
                    label="WhatsApp an adviser"
                  />
                  <ButtonLink href="/products" variant="outline-light">
                    Browse all products
                  </ButtonLink>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  /* Question view */
  return (
    <div className="container-site pb-24">
      {/* Progress */}
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between text-xs text-paper/60">
          <span className="text-eyebrow text-[0.62rem] text-leaf-400">{current?.eyebrow}</span>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors hover:text-paper"
            >
              <ArrowLeft className="size-3.5" /> Back
            </button>
          )}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-paper/15">
          <motion.div
            className="h-full rounded-full bg-leaf-400"
            initial={false}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.5, ease: EASE }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current?.key}
          initial={reduce ? false : { opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? undefined : { opacity: 0, x: -48 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mx-auto mt-10 max-w-3xl"
        >
          <h2 className="text-display-2 text-paper">{current?.question}</h2>
          {current?.hint && <p className="mt-3 text-sm text-paper/60">{current.hint}</p>}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {current?.options.map((option) => {
              const isSelected = current.selected === option.value && option.value !== "";
              return (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  onClick={() => choose(option.value)}
                  className={cn(
                    "group flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition-all duration-200",
                    isSelected
                      ? "border-leaf-400 bg-leaf-400 text-humus-950"
                      : "border-paper/15 bg-paper/5 text-paper backdrop-blur-sm hover:border-leaf-400/60 hover:bg-paper/10",
                  )}
                >
                  <span>
                    <span className="block font-display text-base font-medium">{option.label}</span>
                    {option.meta && (
                      <span
                        className={cn(
                          "mt-0.5 block text-xs",
                          isSelected ? "text-humus-950/70" : "text-paper/50",
                        )}
                      >
                        {option.meta}
                      </span>
                    )}
                  </span>
                  <ArrowRight
                    className={cn(
                      "size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                      isSelected ? "text-humus-950" : "text-paper/40",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="mx-auto mt-12 flex max-w-3xl items-center gap-2 text-xs text-paper/45">
        <Sparkles className="size-3.5 shrink-0 text-leaf-400/70" />
        Matches come only from each product’s published guidance — never guesswork.
      </p>
    </div>
  );
}
