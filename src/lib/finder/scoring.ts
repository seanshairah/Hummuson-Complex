/**
 * Product-finder recommendation scoring. Pure: candidate products (with their
 * real database mappings) + the farmer's answers in, ranked recommendations
 * with human-readable reasons out. A product is only ever recommended from
 * verified mappings — unknown data is treated as neutral, never invented.
 */

export interface FinderAnswers {
  cropSlug?: string;      // undefined = "other / not listed"
  benefitSlug?: string;   // what they want to improve
  stageKey?: string;      // current growth stage
  method?: string;        // preferred application method ("NOT_SURE" allowed)
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

/** Minimum score for a product to appear in results. */
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

  // Crop
  if (answers.cropSlug) {
    const groups = CROP_GROUPS[answers.cropSlug] ?? [];
    if (candidate.cropSlugs.includes(answers.cropSlug)) {
      score += WEIGHTS.cropDirect;
      reasons.push(`Listed for ${labels.cropName ?? answers.cropSlug}`);
    } else if (groups.some((g) => candidate.cropSlugs.includes(g))) {
      const group = groups.find((g) => candidate.cropSlugs.includes(g));
      score += WEIGHTS.cropGroup;
      reasons.push(`Listed for ${group}`);
    } else if (candidate.cropSlugs.length > 0) {
      // The product declares crops and none match — strong negative signal.
      score -= 25;
    }
    // No crop data on the product = neutral: never claim suitability.
  }

  // Goal / benefit
  if (answers.benefitSlug && candidate.benefitSlugs.includes(answers.benefitSlug)) {
    score += WEIGHTS.benefit;
    if (labels.benefitName) reasons.push(`Supports ${labels.benefitName.toLowerCase()}`);
  }

  // Growth stage
  if (answers.stageKey) {
    if (candidate.stageKeys.includes(answers.stageKey)) {
      score += WEIGHTS.stage;
      if (labels.stageName) reasons.push(`Used at ${labels.stageName.toLowerCase()} stage`);
    } else if (candidate.stageKeys.length === 0) {
      score += WEIGHTS.stageUnknown;
    }
  }

  // Application method
  if (answers.method && answers.method !== "NOT_SURE") {
    if (candidate.methods.includes(answers.method)) {
      score += WEIGHTS.method;
      if (labels.methodName) reasons.push(`${labels.methodName} application`);
    }
  }

  if (candidate.featured) score += WEIGHTS.featured;

  return { candidate, score, reasons };
}

export function recommend(
  candidates: FinderCandidate[],
  answers: FinderAnswers,
  labels?: Parameters<typeof scoreCandidate>[2],
  limit = 6,
): FinderRecommendation[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, answers, labels))
    .filter((r) => r.score >= FINDER_MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit);
}
