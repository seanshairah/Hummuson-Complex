const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "do", "does", "did",
  "i", "my", "me", "we", "our", "you", "your", "it", "its", "this", "that", "these",
  "of", "in", "on", "at", "to", "for", "with", "and", "or", "as", "by", "from",
  "can", "could", "should", "would", "will", "shall", "may", "might", "have", "has",
  "what", "which", "who", "how", "when", "where", "why", "much", "many",
  "please", "tell", "about", "want", "need", "get", "there", "some", "any",
]);

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[®™©]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Light English stemmer tuned for agronomy vocabulary — conservative on short words. */
export function stem(token: string): string {
  let t = token;
  if (t.length > 4 && t.endsWith("ies")) t = `${t.slice(0, -3)}y`;
  else if (t.length > 4 && t.endsWith("sses")) t = t.slice(0, -2);
  else if (t.length > 4 && t.endsWith("oes")) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith("es") && !t.endsWith("oes")) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") && !t.endsWith("us")) t = t.slice(0, -1);
  if (t.length > 6 && t.endsWith("ing")) t = t.slice(0, -3);
  else if (t.length > 5 && t.endsWith("ed")) t = t.slice(0, -2);
  else if (t.length > 7 && t.endsWith("ation")) t = t.slice(0, -5);
  else if (t.length > 6 && t.endsWith("ment")) t = t.slice(0, -4);
  return t;
}

export function tokenize(input: string, { keepStopwords = false } = {}): string[] {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  const raw = normalized.split(/[\s-]+/).filter(Boolean);
  const tokens: string[] = [];
  for (const token of raw) {
    if (!keepStopwords && STOPWORDS.has(token)) continue;
    if (token.length < 2 && !/\d/.test(token)) continue;
    tokens.push(stem(token));
  }
  return tokens;
}
