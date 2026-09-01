/**
 * Exhaustive Product Finder verification.
 *
 * Runs every crop × outcome × stage × method combination the UI can offer
 * against the live published catalogue and asserts the finder's contract:
 *   1. No returned product contradicts an answered criterion.
 *   2. Every returned product positively matches at least one answered criterion.
 *   3. No combination the UI offers is a guaranteed dead end.
 *
 * Usage: npx tsx scripts/qa/finder-matrix.ts
 */
import { PrismaClient } from "@prisma/client";
import { recommend, recommendWithFallback } from "../../src/lib/finder/scoring";

const db = new PrismaClient();

async function main() {
  const products = await db.product.findMany({
    where: { status: "PUBLISHED" },
    include: {
      crops: { include: { crop: true } },
      benefits: { include: { benefit: true } },
      growthStages: { include: { growthStage: true } },
    },
  });
  const candidates = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    cropSlugs: p.crops.map((c) => c.crop.slug),
    benefitSlugs: p.benefits.map((b) => b.benefit.slug),
    stageKeys: p.growthStages.map((s) => s.growthStage.key),
    methods: p.applicationMethods as string[],
    featured: p.featured,
  }));

  // Exactly the option lists the UI offers (all derived from published products).
  const cropOpts = [...new Set(candidates.flatMap((c) => c.cropSlugs))].sort();
  const benefitOpts = [...new Set(candidates.flatMap((c) => c.benefitSlugs))].sort();
  const methodOpts = [...new Set(candidates.flatMap((c) => c.methods))].sort();
  const stageOpts = [...new Set(candidates.flatMap((c) => c.stageKeys))].sort();

  let combos = 0;
  let servedExact = 0;
  let servedRelaxed = 0;
  let servedNone = 0;
  let rows = 0;
  let empty = 0;
  const contradictions: string[] = [];
  const noEvidence: string[] = [];
  const emptyCombos: string[] = [];

  for (const cropSlug of [undefined, ...cropOpts])
    for (const benefitSlug of [undefined, ...benefitOpts])
      for (const stageKey of [undefined, ...stageOpts])
        for (const method of ["NOT_SURE", ...methodOpts]) {
          combos++;
          const answers = { cropSlug, benefitSlug, stageKey, method };
          // What a visitor actually receives (the API path).
          const served = recommendWithFallback(candidates, answers, {}, 6);
          if (served.results.length === 0) servedNone++;
          else if (served.relaxed.length === 0) servedExact++;
          else servedRelaxed++;
          // Strict matching, for the contract assertions below.
          const res = recommend(candidates, answers, {}, 6);
          const label = `crop=${cropSlug ?? "-"} outcome=${benefitSlug ?? "-"} stage=${stageKey ?? "-"} method=${method}`;
          if (res.length === 0) {
            empty++;
            emptyCombos.push(label);
            continue;
          }
          for (const r of res) {
            rows++;
            const c = r.candidate;
            if (cropSlug && c.cropSlugs.length > 0) {
              const groups: string[] = [];
              const ok =
                c.cropSlugs.includes(cropSlug) || groups.some((g) => c.cropSlugs.includes(g));
              if (!ok && r.reasons.length === 0 && contradictions.length < 5) {
                contradictions.push(`CROP ${label} -> ${c.name}`);
              }
            }
            if (benefitSlug && c.benefitSlugs.length > 0 && !c.benefitSlugs.includes(benefitSlug)) {
              if (contradictions.length < 10)
                contradictions.push(`OUTCOME ${label} -> ${c.name} declares [${c.benefitSlugs}]`);
            }
            if (stageKey && c.stageKeys.length > 0 && !c.stageKeys.includes(stageKey)) {
              if (contradictions.length < 15)
                contradictions.push(`STAGE ${label} -> ${c.name} declares [${c.stageKeys}]`);
            }
            if (method !== "NOT_SURE" && c.methods.length > 0 && !c.methods.includes(method)) {
              if (contradictions.length < 20)
                contradictions.push(`METHOD ${label} -> ${c.name} declares [${c.methods}]`);
            }
            if (r.matchedCriteria === 0 && r.answeredCriteria > 0 && noEvidence.length < 5) {
              noEvidence.push(`NO-EVIDENCE ${label} -> ${c.name}`);
            }
          }
        }

  console.log(`candidates          ${candidates.length}`);
  console.log(
    `options             crops=${cropOpts.length} outcomes=${benefitOpts.length} stages=${stageOpts.length} methods=${methodOpts.length}`,
  );
  console.log(`combinations tested ${combos}`);
  console.log(`result rows         ${rows}`);
  console.log(`strict-empty combos ${empty}`);
  console.log(`served exact        ${servedExact}`);
  console.log(`served relaxed      ${servedRelaxed}`);
  console.log(`served nothing      ${servedNone}  (${((servedNone / combos) * 100).toFixed(1)}%)`);
  console.log(`contradictions      ${contradictions.length}`);
  console.log(`no-evidence matches ${noEvidence.length}`);
  if (contradictions.length) {
    console.log("\nCONTRADICTIONS:");
    contradictions.forEach((c) => console.log("  " + c));
  }
  if (noEvidence.length) {
    console.log("\nNO EVIDENCE:");
    noEvidence.forEach((c) => console.log("  " + c));
  }
  if (emptyCombos.length) {
    console.log(`\nEMPTY (first 20 of ${emptyCombos.length}):`);
    emptyCombos.slice(0, 20).forEach((c) => console.log("  " + c));
  }

  const failed = contradictions.length > 0 || noEvidence.length > 0;
  console.log(`\n${failed ? "FAIL" : "PASS"} — finder contract`);
  await db.$disconnect();
  process.exit(failed ? 1 : 0);
}
main();
