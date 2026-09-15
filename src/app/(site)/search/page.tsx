import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/ui/empty-state";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { ButtonLink } from "@/components/ui/button";
import { searchAll } from "@/server/data/search-index";
import { recordSearch } from "@/server/analytics";
import { normalizeText } from "@/lib/search/tokenize";
import { humanize } from "@/lib/utils";
import { whatsappAdviceMessage } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Humuson products, crops, questions, articles, videos and results.",
  robots: { index: false },
};

const TYPE_LABEL: Record<string, string> = {
  product: "Product",
  crop: "Crop",
  faq: "Question",
  article: "Article",
  video: "Video",
  project: "Result",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query.length >= 2 ? await searchAll(query, { limit: 30 }) : [];

  if (query.length >= 2) {
    void recordSearch({
      query,
      normalized: normalizeText(query),
      resultCount: results.length,
      source: "GLOBAL",
    });
  }

  return (
    <>
      <PageIntro
        eyebrow="Search"
        title={query ? `Results for “${query}”` : "Search the platform"}
        lede={
          query
            ? `${results.length} result${results.length === 1 ? "" : "s"} across products, crops, questions, articles, videos and field results.`
            : "Find products, crops, questions, articles, videos and field results. Tip: press Ctrl+K anywhere."
        }
        crumbs={[{ label: "Search" }]}
      >
        <form action="/search" className="mt-8 flex max-w-xl gap-3">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="e.g. maize root development…"
            aria-label="Search"
            className="h-12 w-full rounded-full border border-line bg-cream px-5 text-sm outline-none focus:border-leaf-600 focus:ring-2 focus:ring-leaf-500/25"
          />
          <button
            type="submit"
            className="h-12 shrink-0 rounded-full bg-humus-900 px-6 font-display text-sm font-medium text-paper hover:bg-humus-700"
          >
            Search
          </button>
        </form>
      </PageIntro>

      <section className="container-site max-w-3xl pb-20">
        {query.length >= 2 && results.length === 0 && (
          <EmptyState
            icon={SearchX}
            title={`Nothing found for “${query}”`}
            description="Try a crop, product name or problem — or ask a Humuson adviser directly."
            action={
              <>
                <ButtonLink href="/products" variant="outline">
                  Browse products
                </ButtonLink>
                <WhatsAppButton message={whatsappAdviceMessage(query)} label="Ask on WhatsApp" />
              </>
            }
          />
        )}
        <ul className="divide-y divide-line">
          {results.map((result) => (
            <li key={result.doc.id}>
              <Link
                href={result.doc.href}
                className="group flex items-center gap-4 py-4 transition-colors hover:bg-paper-dim/60"
              >
                <span className="w-20 shrink-0 text-[0.65rem] font-medium tracking-widest text-leaf-700 uppercase">
                  {TYPE_LABEL[result.doc.type] ?? humanize(result.doc.type)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-medium text-ink group-hover:text-brand">
                    {result.doc.title}
                  </span>
                  {(result.doc.meta as { subtitle?: string } | undefined)?.subtitle && (
                    <span className="block truncate text-sm text-ink-faint">
                      {(result.doc.meta as { subtitle?: string }).subtitle}
                    </span>
                  )}
                </span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-ink-faint/40 transition-transform group-hover:translate-x-1 group-hover:text-leaf-700" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
