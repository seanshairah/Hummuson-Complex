import { normalizeText, tokenize } from "./tokenize";
import { expandToken } from "./synonyms";

/**
 * The retrieval engine behind global search, the FAQ engine, Ask Humuson and
 * the admin "test a question" tool. Pure and deterministic: documents in,
 * ranked matches out. The content sets are small (hundreds of records), so an
 * in-memory weighted index outperforms a network round-trip and behaves
 * identically in every environment. PostgreSQL full-text remains the scale-up
 * path (see docs/ARCHITECTURE.md).
 */

export type SearchDocType =
  | "product"
  | "crop"
  | "faq"
  | "article"
  | "video"
  | "project"
  | "guide"
  | "page";

export interface SearchDoc {
  id: string;
  type: SearchDocType;
  /** Primary display title — highest match weight. */
  title: string;
  /** Alternative phrasings (FAQ aliases, crop aka, product tags). */
  aliases?: string[];
  /** Curated keywords — high weight. */
  keywords?: string[];
  /** Free text body — lowest weight. */
  body?: string;
  /** URL the result should open. */
  href: string;
  /** Static boost (e.g. featured products). */
  boost?: number;
  /** Arbitrary payload carried through to results. */
  meta?: Record<string, unknown>;
}

interface FieldPosting {
  weight: number;
  /** token → occurrence count */
  counts: Map<string, number>;
  /** normalized full text for phrase matching */
  text: string;
}

interface IndexedDoc {
  doc: SearchDoc;
  fields: FieldPosting[];
  allTokens: Set<string>;
}

export interface SearchIndex {
  docs: IndexedDoc[];
  /** token → doc indexes containing it (any field) */
  postings: Map<string, Set<number>>;
}

const FIELD_WEIGHTS = { title: 5, alias: 4.5, keyword: 3, body: 1 } as const;

function buildField(text: string, weight: number): FieldPosting {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return { weight, counts, text: normalizeText(text) };
}

export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const indexed: IndexedDoc[] = docs.map((doc) => {
    const fields: FieldPosting[] = [
      buildField(doc.title, FIELD_WEIGHTS.title),
      buildField((doc.aliases ?? []).join(" \n "), FIELD_WEIGHTS.alias),
      buildField((doc.keywords ?? []).join(" \n "), FIELD_WEIGHTS.keyword),
      buildField(doc.body ?? "", FIELD_WEIGHTS.body),
    ];
    const allTokens = new Set<string>();
    for (const field of fields) for (const token of field.counts.keys()) allTokens.add(token);
    return { doc, fields, allTokens };
  });

  const postings = new Map<string, Set<number>>();
  indexed.forEach((entry, i) => {
    for (const token of entry.allTokens) {
      const set = postings.get(token) ?? new Set<number>();
      set.add(i);
      postings.set(token, set);
    }
  });

  return { docs: indexed, postings };
}

export interface SearchResult {
  doc: SearchDoc;
  score: number;
  /** Fraction of query tokens that matched this document (0..1). */
  coverage: number;
}

export interface SearchOptions {
  limit?: number;
  types?: SearchDocType[];
  /** Enable prefix matching on the final token (typeahead). */
  prefix?: boolean;
  /** Results below this score are dropped. */
  minScore?: number;
  /** Require at least this query-token coverage (0..1). */
  minCoverage?: number;
}

export function search(index: SearchIndex, query: string, options: SearchOptions = {}): SearchResult[] {
  const { limit = 20, types, prefix = false, minScore = 0.5, minCoverage = 0 } = options;
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  const normalizedQuery = normalizeText(query);

  // Each query token expands to its synonym group; a match on any group member
  // counts once for that source token (exact form scores higher than synonym).
  const expanded = queryTokens.map((token) => ({ token, variants: expandToken(token) }));

  const scores = new Map<number, { score: number; matched: Set<string> }>();

  expanded.forEach(({ token, variants }) => {
    for (const variant of variants) {
      const isExact = variant === token;
      const docIds = index.postings.get(variant);
      if (docIds) {
        for (const docId of docIds) {
          const entry = index.docs[docId];
          if (!entry) continue;
          let fieldScore = 0;
          for (const field of entry.fields) {
            const count = field.counts.get(variant);
            if (count) fieldScore += field.weight * (1 + Math.log(count)) * (isExact ? 1 : 0.7);
          }
          if (fieldScore > 0) {
            const current = scores.get(docId) ?? { score: 0, matched: new Set<string>() };
            current.score += fieldScore;
            current.matched.add(token);
            scores.set(docId, current);
          }
        }
      }
      // Prefix matching for typeahead: match the last token as a prefix.
      if (prefix && token === queryTokens[queryTokens.length - 1] && variant === token) {
        for (const [indexedToken, docIds2] of index.postings) {
          if (indexedToken.length > variant.length && indexedToken.startsWith(variant)) {
            for (const docId of docIds2) {
              const entry = index.docs[docId];
              if (!entry) continue;
              let fieldScore = 0;
              for (const field of entry.fields) {
                const count = field.counts.get(indexedToken);
                if (count) fieldScore += field.weight * 0.55;
              }
              if (fieldScore > 0) {
                const current = scores.get(docId) ?? { score: 0, matched: new Set<string>() };
                current.score += fieldScore;
                current.matched.add(token);
                scores.set(docId, current);
              }
            }
          }
        }
      }
    }
  });

  const results: SearchResult[] = [];
  for (const [docId, { score, matched }] of scores) {
    const entry = index.docs[docId];
    if (!entry) continue;
    if (types && !types.includes(entry.doc.type)) continue;

    const coverage = matched.size / queryTokens.length;
    if (coverage < minCoverage) continue;

    let final = score * (0.4 + 0.6 * coverage) + (entry.doc.boost ?? 0);

    // Exact-phrase bonus: the whole query appearing in the title or aliases,
    // with a decisive bonus when the query IS the title (product-name lookups).
    if (normalizedQuery.length >= 2) {
      const title = entry.fields[0];
      const alias = entry.fields[1];
      // A query that IS the document title (e.g. a product name) outranks
      // documents that merely mention it, however often.
      if (title && title.text === normalizedQuery) final += 25;
      else if (title && normalizedQuery.length >= 3 && title.text.includes(normalizedQuery)) final += 6;
      else if (alias && normalizedQuery.length >= 3 && alias.text.includes(normalizedQuery)) final += 4;
    }

    if (final >= minScore) results.push({ doc: entry.doc, score: final, coverage });
  }

  results.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));
  return results.slice(0, limit);
}
