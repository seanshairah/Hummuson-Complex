import { unstable_cache } from "next/cache";
import { buildIndex, search, type SearchDoc } from "@/lib/search/engine";
import { stripHtml, humanize } from "@/lib/utils";
import { db } from "@/server/db";
import { getAllFaqs } from "./content";
import { getAllProducts, getProductBySlug } from "./products";

export interface AskResponse {
  matched: boolean;
  answerHtml?: string;
  sources?: { label: string; href: string }[];
  related?: { title: string; href: string }[];
}

interface AskDoc extends SearchDoc {
  meta: {
    answerHtml: string;
    sourceLabel: string;
    sourceHref: string;
    productSlug?: string;
    faqId?: string;
  };
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const list = (items: string[]) =>
  `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

/**
 * The Ask Humuson corpus: every published FAQ plus per-product "fact" answers
 * generated from verified database fields only (rates, crops, packs,
 * composition). Nothing here is invented — absent data simply produces no doc,
 * and the caller falls back to the human-adviser answer.
 */
const getAskDocs = unstable_cache(
  async (): Promise<AskDoc[]> => {
    const [faqs, products] = await Promise.all([getAllFaqs(), getAllProducts()]);
    const docs: AskDoc[] = [];

    for (const faq of faqs) {
      docs.push({
        id: `faq:${faq.id}`,
        type: "faq",
        title: faq.question,
        aliases: faq.aliases,
        keywords: [...faq.keywords, faq.productName ?? ""].filter(Boolean),
        body: stripHtml(faq.answerHtml),
        href: faq.productSlug ? `/products/${faq.productSlug}` : "/faq",
        boost: 1.5,
        meta: {
          answerHtml: faq.answerHtml,
          sourceLabel: faq.productName ? `${faq.productName} FAQ` : "Humuson FAQ",
          sourceHref: faq.productSlug ? `/products/${faq.productSlug}#faq` : `/faq#faq-${faq.id}`,
          productSlug: faq.productSlug ?? undefined,
          faqId: faq.id,
        },
      });
    }

    for (const product of products) {
      const detail = await getProductBySlug(product.slug);
      if (!detail) continue;
      const href = `/products/${product.slug}`;
      const facts: { question: string; keywords: string[]; answerHtml: string }[] = [];

      if (detail.shortDescription || detail.benefitClaims.length > 0) {
        facts.push({
          question: `What does ${product.name} do?`,
          keywords: ["purpose", "benefits", "about", "work"],
          answerHtml: [
            detail.shortDescription ? `<p>${escapeHtml(detail.shortDescription)}</p>` : "",
            detail.benefitClaims.length > 0 ? list(detail.benefitClaims) : "",
          ].join(""),
        });
      }
      if (detail.guides.length > 0) {
        facts.push({
          question: `What rate should I use for ${product.name}?`,
          keywords: ["rate", "dosage", "how much", "apply", "application"],
          answerHtml: `<p>Published application guidance for ${escapeHtml(product.name)}:</p>${list(
            detail.guides.map((guide) =>
              [
                guide.rate,
                guide.unit ? ` ${guide.unit}` : "",
                guide.crop ? ` — ${guide.crop}` : "",
                guide.stage ? ` (${guide.stage})` : "",
                guide.notes ? ` — ${guide.notes}` : "",
              ].join(""),
            ),
          )}<p>Always confirm the recommended application for your crop and conditions with Humuson technical support.</p>`,
        });
      }
      if (detail.cropNames.length > 0) {
        facts.push({
          question: `Which crops is ${product.name} suitable for?`,
          keywords: ["crops", "suitable", "use on", ...detail.cropNames],
          answerHtml: `<p>${escapeHtml(product.name)} is listed for:</p>${list(detail.cropNames)}`,
        });
      }
      if (detail.packageSizes.length > 0) {
        facts.push({
          question: `What package sizes does ${product.name} come in?`,
          keywords: ["package", "pack", "size", "sizes", "price"],
          answerHtml: `<p>Available package sizes for ${escapeHtml(product.name)}:</p>${list(
            detail.packageSizes.map((pack) =>
              pack.priceUsd ? `${pack.size} — $${pack.priceUsd}` : pack.size,
            ),
          )}`,
        });
      }
      if (detail.composition.length > 0) {
        facts.push({
          question: `What is ${product.name} made of?`,
          keywords: ["composition", "ingredients", "contains", "made"],
          answerHtml: `<p>Published composition of ${escapeHtml(product.name)}:</p>${list(detail.composition)}`,
        });
      }
      if (detail.methods.length > 0) {
        facts.push({
          question: `How is ${product.name} applied?`,
          keywords: ["apply", "application", "method", "spray", "how"],
          answerHtml: `<p>${escapeHtml(product.name)} application method${detail.methods.length > 1 ? "s" : ""}: ${detail.methods
            .map((method) => escapeHtml(humanize(method)))
            .join(", ")}.</p>${
            detail.guides.length > 0
              ? `<p>Published guidance:</p>${list(
                  detail.guides.map((guide) =>
                    [guide.rate, guide.unit ? ` ${guide.unit}` : "", guide.notes ? ` — ${guide.notes}` : ""].join(""),
                  ),
                )}`
              : ""
          }`,
        });
      }

      facts.forEach((fact, i) => {
        docs.push({
          id: `fact:${product.id}:${i}`,
          type: "guide",
          title: fact.question,
          keywords: [product.name, ...fact.keywords],
          body: stripHtml(fact.answerHtml),
          href,
          meta: {
            answerHtml: fact.answerHtml,
            sourceLabel: product.name,
            sourceHref: href,
            productSlug: product.slug,
          },
        });
      });
    }

    return docs;
  },
  ["ask-docs"],
  { tags: ["faqs", "products"], revalidate: 600 },
);

const CONFIDENCE_THRESHOLD = 7;

export async function answerQuestion(
  question: string,
  productSlug?: string,
): Promise<AskResponse> {
  const docs = await getAskDocs();
  const index = buildIndex(docs);

  // Product context: an unqualified "how do I apply it?" on a product page
  // resolves against that product.
  let effectiveQuestion = question;
  if (productSlug) {
    const product = await getProductBySlug(productSlug);
    if (product && !question.toLowerCase().includes(product.name.toLowerCase())) {
      effectiveQuestion = `${question} ${product.name}`;
    }
  }

  const results = search(index, effectiveQuestion, {
    limit: 5,
    minCoverage: 0.34,
    prefix: false,
  }) as { doc: AskDoc; score: number; coverage: number }[];

  // With product context, prefer answers about that product when scores are close.
  let ranked = results;
  if (productSlug) {
    ranked = [...results].sort((a, b) => {
      const aBoost = a.doc.meta.productSlug === productSlug ? a.score * 1.35 : a.score;
      const bBoost = b.doc.meta.productSlug === productSlug ? b.score * 1.35 : b.score;
      return bBoost - aBoost;
    });
  }

  const top = ranked[0];
  const matched = Boolean(top && top.score >= CONFIDENCE_THRESHOLD);

  try {
    await db.questionEvent.create({
      data: {
        question: question.slice(0, 500),
        matched,
        faqId: matched ? (top!.doc.meta.faqId ?? null) : null,
        productSlug: productSlug ?? null,
      },
    });
  } catch {
    // Analytics must never block an answer.
  }

  if (!matched || !top) return { matched: false };

  const seen = new Set<string>([top.doc.meta.sourceHref]);
  const related: { title: string; href: string }[] = [];
  for (const result of ranked.slice(1)) {
    if (result.score < CONFIDENCE_THRESHOLD * 0.6) continue;
    if (seen.has(result.doc.meta.sourceHref)) continue;
    seen.add(result.doc.meta.sourceHref);
    related.push({ title: result.doc.title, href: result.doc.href });
    if (related.length >= 2) break;
  }

  return {
    matched: true,
    answerHtml: top.doc.meta.answerHtml,
    sources: [{ label: top.doc.meta.sourceLabel, href: top.doc.meta.sourceHref }],
    related,
  };
}
