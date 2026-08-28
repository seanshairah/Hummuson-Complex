import { describe, expect, it } from "vitest";
import { recommend, scoreCandidate, type FinderCandidate } from "@/lib/finder/scoring";

const rootProduct: FinderCandidate = {
  id: "1",
  slug: "fosfix-plus",
  name: "Fosfix Plus",
  cropSlugs: ["maize", "vegetables", "cereals"],
  benefitSlugs: ["root-development", "nutrient-uptake"],
  stageKeys: ["seed", "emergence"],
  methods: ["SEED_TREATMENT", "SOIL"],
};

const foliarProduct: FinderCandidate = {
  id: "2",
  slug: "in5",
  name: "IN5",
  cropSlugs: ["vegetables", "tomato"],
  benefitSlugs: ["crop-vigour", "yield"],
  stageKeys: ["vegetative", "flowering"],
  methods: ["FOLIAR"],
};

const unknownDataProduct: FinderCandidate = {
  id: "3",
  slug: "master",
  name: "Master",
  cropSlugs: [],
  benefitSlugs: [],
  stageKeys: [],
  methods: [],
};

describe("finder scoring", () => {
  it("recommends crop + benefit + stage + method matches highest", () => {
    const results = recommend([rootProduct, foliarProduct, unknownDataProduct], {
      cropSlug: "maize",
      benefitSlug: "root-development",
      stageKey: "seed",
      method: "SEED_TREATMENT",
    });
    expect(results[0]?.candidate.slug).toBe("fosfix-plus");
    expect(results[0]?.reasons.length).toBeGreaterThan(0);
  });

  it("expands crops to groups (maize matches cereals products)", () => {
    const cerealOnly: FinderCandidate = { ...rootProduct, id: "4", cropSlugs: ["cereals"] };
    const { score, reasons } = scoreCandidate(cerealOnly, { cropSlug: "maize" });
    expect(score).toBeGreaterThan(0);
    expect(reasons[0]).toMatch(/cereals/);
  });

  it("penalizes explicit crop mismatches", () => {
    const { score } = scoreCandidate(foliarProduct, { cropSlug: "wheat" });
    expect(score).toBeLessThan(0);
  });

  it("treats missing product data as neutral, never as a match", () => {
    const { score, reasons } = scoreCandidate(unknownDataProduct, {
      cropSlug: "maize",
      benefitSlug: "yield",
    });
    expect(reasons).toHaveLength(0);
    expect(score).toBe(0);
  });

  it("ignores method when the farmer is not sure", () => {
    const withMethod = scoreCandidate(foliarProduct, { cropSlug: "tomato", method: "FOLIAR" });
    const notSure = scoreCandidate(foliarProduct, { cropSlug: "tomato", method: "NOT_SURE" });
    expect(withMethod.score).toBeGreaterThan(notSure.score);
    expect(notSure.score).toBeGreaterThan(0);
  });

  it("drops products below the recommendation threshold", () => {
    const results = recommend([unknownDataProduct], { cropSlug: "maize", benefitSlug: "yield" });
    expect(results).toHaveLength(0);
  });
});
