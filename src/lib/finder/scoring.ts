/**
 * Product-finder recommendation scoring. Pure: candidate products (with their
 * real database mappings) + the farmer's answers in, ranked recommendations
 * with human-readable reasons out. A product is only ever recommended from
 * verified mappings — unknown data is treated as neutral, never invented.
 */

export interface FinderAnswers {
  cropSlug?: string; // undefined = "other / not listed"
  benefitSlug?: string; // what they want to improve
  stageKey?: string; // current growth stage
  method?: string; // preferred application method ("NOT_SURE" allowed)
}

export interface FinderCandidate {
  id: string;
  slug: string;
  name: string;
  cropSlugs: string[];
  benefitSlugs: string[];
  stageKeys: string[];
  methods: string[];
  featured?: boolean;
}

export interface FinderRecommendation {
  candidate: FinderCandidate;
  score: number;
  reasons: string[];
  /**
   * True when the product's own published data contradicts an answer — it
   * declares crops/benefits/stages/methods and the selected one is not among
   * them. Contradicted products are never recommended. A product that simply
   * has no data for a dimension is NOT disqualified: unknown stays neutral, so
   * the finder never claims suitability it cannot evidence.
   */
  disqualified: boolean;
  /**
   * How many of the answered criteria this product positively matches on its
   * own published data. A recommendation must have at least one — a product
   * with no evidence either way is not a match, it is simply unknown.
   */
  matchedCriteria: number;
  /** How many criteria the visitor actually answered. */
  answeredCriteria: number;
}

/** Broad crop groups: a maize grower should still see "cereals" products. */
export const CROP_GROUPS: Record<string, string[]> = {
  maize: ["cereals", "grains"],
  wheat: ["cereals", "grains"],
  barley: ["cereals", "grains"],
  sorghum: ["cereals", "grains"],
  tomato: ["vegetables"],
  cabbage: ["vegetables"],
  onion: ["vegetables"],
  pepper: ["vegetables"],
  cucumber: ["vegetables"],
  potato: ["vegetables", "tubers"],
  "sugar-bean": ["legumes"],
  soybean: ["legumes", "oilseeds"],
  cowpea: ["legumes"],
  groundnut: ["legumes", "oilseeds"],
  sunflower: ["oilseeds"],
};

const WEIGHTS = {
  cropDirect: 40,
  cropGroup: 26,
  benefit: 30,
  stage: 15,
  stageUnknown: 5,
  method: 15,
  featured: 2,
} as const;

/**
 * Ranking floor. Contradictions are excluded outright (see `disqualified`), so
 * this no longer has to suppress bad matches — a survivor that positively
 * matches an answered criterion is always eligible regardless of weight.
 */
export const FINDER_MIN_SCORE = 30;

export function scoreCandidate(
  candidate: FinderCandidate,
  answers: FinderAnswers,
  labels: {
    cropName?: string;
    benefitName?: string;
    stageName?: string;
    methodName?: string;
  } = {},
): FinderRecommendation {
  let score = 0;
  const reasons: string[] = [];
  let disqualified = false;
  let matchedCriteria = 0;
  let answeredCriteria = 0;

  // Crop — direct match, broad-group match, or (if the product declares crops
  // and none of them fit) a contradiction.
  if (answers.cropSlug) {
    answeredCriteria += 1;
    const groups = CROP_GROUPS[answers.cropSlug] ?? [];
    if (candidate.cropSlugs.includes(answers.cropSlug)) {
      matchedCriteria += 1;
      score += WEIGHTS.cropDirect;
      reasons.push(`Listed for ${labels.cropName ?? answers.cropSlug}`);
    } else if (groups.some((g) => candidate.cropSlugs.includes(g))) {
      const group = groups.find((g) => candidate.cropSlugs.includes(g));
      matchedCriteria += 1;
      score += WEIGHTS.cropGroup;
      reasons.push(`Listed for ${group}`);
    } else if (candidate.cropSlugs.length > 0) {
      disqualified = true;
    }
    // No crop data on the product = neutral: never claim suitability.
  }

  // Goal / benefit
  if (answers.benefitSlug) {
    answeredCriteria += 1;
    if (candidate.benefitSlugs.includes(answers.benefitSlug)) {
      matchedCriteria += 1;
      score += WEIGHTS.benefit;
      if (labels.benefitName) reasons.push(`Supports ${labels.benefitName.toLowerCase()}`);
    } else if (candidate.benefitSlugs.length > 0) {
      disqualified = true;
    }
  }

  // Growth stage
  if (answers.stageKey) {
    answeredCriteria += 1;
    if (candidate.stageKeys.includes(answers.stageKey)) {
      matchedCriteria += 1;
      score += WEIGHTS.stage;
      if (labels.stageName) reasons.push(`Used at ${labels.stageName.toLowerCase()} stage`);
    } else if (candidate.stageKeys.length === 0) {
      score += WEIGHTS.stageUnknown;
    } else {
      disqualified = true;
    }
  }

  // Application method
  if (answers.method && answers.method !== "NOT_SURE") {
    answeredCriteria += 1;
    if (candidate.methods.includes(answers.method)) {
      matchedCriteria += 1;
      score += WEIGHTS.method;
      if (labels.methodName) reasons.push(`${labels.methodName} application`);
    } else if (candidate.methods.length > 0) {
      disqualified = true;
    }
  }

  if (candidate.featured) score += WEIGHTS.featured;

  return { candidate, score, reasons, disqualified, matchedCriteria, answeredCriteria };
}

export function recommend(
  candidates: FinderCandidate[],
  answers: FinderAnswers,
  labels?: Parameters<typeof scoreCandidate>[2],
  limit = 6,
): FinderRecommendation[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, answers, labels))
    .filter((r) => {
      if (r.disqualified) return false;
      // Nothing answered → the whole range is a valid answer set.
      if (r.answeredCriteria === 0) return true;
      // Otherwise a product must positively match at least one answer. Weak
      // single-criterion matches (stage or method alone) still qualify: the
      // product's own data says it fits, so withholding it would be wrong.
      return r.matchedCriteria > 0;
    })
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit);
}

/**
 * Criteria in the order they may be relaxed — least agronomically binding
 * first. The chosen outcome is deliberately absent: it is what the farmer
 * actually came for, so we would rather show nothing than show products that
 * do not address their goal.
 */
const RELAXATION_ORDER: (keyof FinderAnswers)[] = ["method", "stageKey", "cropSlug"];

export interface FinderOutcome {
  results: FinderRecommendation[];
  /** Criteria that had to be ignored to return anything. Empty = exact match. */
  relaxed: (keyof FinderAnswers)[];
}

/**
 * Strict match first. When the exact combination has no product that satisfies
 * it, drop the least binding criterion and try again, reporting what was
 * ignored so the UI can say so plainly. Nothing is ever invented — a relaxed
 * result is still a product whose own data supports every remaining answer.
 */
export function recommendWithFallback(
  candidates: FinderCandidate[],
  answers: FinderAnswers,
  labels?: Parameters<typeof scoreCandidate>[2],
  limit = 6,
): FinderOutcome {
  const exact = recommend(candidates, answers, labels, limit);
  if (exact.length > 0) return { results: exact, relaxed: [] };

  const relaxed: (keyof FinderAnswers)[] = [];
  const working: FinderAnswers = { ...answers };
  for (const key of RELAXATION_ORDER) {
    const answered =
      key === "method" ? working.method && working.method !== "NOT_SURE" : Boolean(working[key]);
    if (!answered) continue;
    if (key === "method") working.method = "NOT_SURE";
    else delete working[key];
    relaxed.push(key);
    const next = recommend(candidates, working, labels, limit);
    if (next.length > 0) return { results: next, relaxed };
  }
  return { results: [], relaxed };
}
