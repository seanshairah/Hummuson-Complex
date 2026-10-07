"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, MessageCircleQuestion } from "lucide-react";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/empty-state";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { cn, humanize } from "@/lib/utils";
import { whatsappAdviceMessage } from "@/lib/whatsapp";
import type { FaqData } from "@/server/data/content";

const CATEGORY_ORDER = [
  "GENERAL",
  "BENEFITS",
  "APPLICATION",
  "DOSAGE",
  "COMPATIBILITY",
  "CROPS",
  "PACKAGES",
  "STORAGE",
  "AVAILABILITY",
  "ORDERING",
];

export function FaqExplorer({ faqs }: { faqs: FaqData[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("ALL");

  const categories = useMemo(() => {
    const present = [...new Set(faqs.map((faq) => faq.category))];
    present.sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));
    return ["ALL", ...present];
  }, [faqs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((faq) => {
      if (category !== "ALL" && faq.category !== category) return false;
      if (!q) return true;
      const haystack = [faq.question, ...faq.aliases, ...faq.keywords, faq.productName ?? ""]
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [faqs, query, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, FaqData[]>();
    for (const faq of filtered) {
      const list = map.get(faq.category) ?? [];
      list.push(faq);
      map.set(faq.category, list);
    }
    return [...map.entries()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]),
    );
  }, [filtered]);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions — e.g. “shelf life”, “delivery”, “how does it work”…"
            aria-label="Search frequently asked questions"
            className="h-12 w-full rounded-full border border-line bg-cream pr-4 pl-11 text-sm outline-none focus:border-leaf-600 focus:ring-2 focus:ring-leaf-500/25"
          />
        </label>
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 font-display text-xs font-medium transition-colors",
                category === cat
                  ? "border-humus-900 bg-humus-900 text-paper"
                  : "border-line bg-cream text-ink-soft hover:border-ink/30",
              )}
            >
              {cat === "ALL" ? "All" : humanize(cat)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title={`No answer found for “${query}”`}
          description="We only publish verified answers — but a Humuson adviser can answer anything about the range directly."
          action={
            <>
              <WhatsAppButton message={whatsappAdviceMessage(query)} label="Ask on WhatsApp" />
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-full border border-line px-6 font-display text-sm font-medium text-ink"
              >
                Send an enquiry
              </Link>
            </>
          }
          className="mt-10"
        />
      ) : (
        <div className="mt-10 space-y-10">
          {grouped.map(([cat, items]) => (
            <section key={cat} aria-labelledby={`faq-cat-${cat}`}>
              <h2 id={`faq-cat-${cat}`} className="text-eyebrow text-leaf-700">
                {humanize(cat)}
              </h2>
              <Accordion type="single" collapsible className="mt-2">
                {items.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={faq.id}
                    trigger={<span id={`faq-${faq.id}`}>{faq.question}</span>}
                  >
                    <div
                      className="rich-text text-sm"
                      dangerouslySetInnerHTML={{ __html: faq.answerHtml }}
                    />
                    {faq.productSlug && (
                      <Link
                        href={`/products/${faq.productSlug}`}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-leaf-700 hover:underline"
                      >
                        View {faq.productName} →
                      </Link>
                    )}
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
