/**
 * Catalogue data validation. Reports every product/crop/relationship problem
 * that would surface as a wrong count or an empty UI state. Findings are
 * reported, never auto-corrected — business information is not invented here.
 *
 * Usage: npx tsx scripts/qa/validate-data.ts
 * Exit code 1 when a BLOCKER is present, 0 otherwise.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type Level = "BLOCKER" | "WARN" | "INFO";
const findings: { level: Level; code: string; detail: string }[] = [];
const add = (level: Level, code: string, detail: string) => findings.push({ level, code, detail });

async function main() {
  const products = await db.product.findMany({
    include: {
      category: true,
      primaryImage: true,
      crops: { include: { crop: true } },
      benefits: { include: { benefit: true } },
      growthStages: { include: { growthStage: true } },
      packageSizes: true,
      applicationGuides: true,
    },
  });
  const published = products.filter((p) => p.status === "PUBLISHED");

  /* ── Per-product integrity ────────────────────────────────────────────── */
  const byName = new Map<string, string[]>();
  const bySlug = new Map<string, string[]>();
  for (const p of products) {
    if (!p.name?.trim()) add("BLOCKER", "MISSING_NAME", `product ${p.id} has no name`);
    if (!p.shortDescription?.trim() && !p.descriptionHtml?.trim())
      add("BLOCKER", "MISSING_DESCRIPTION", `${p.name} has neither a short nor a full description`);
    if (!p.primaryImageId) add("BLOCKER", "MISSING_IMAGE", `${p.name} has no primary image`);
    if (!p.categoryId) add("BLOCKER", "MISSING_CATEGORY", `${p.name} has no category`);

    if (p.status === "PUBLISHED") {
      if (p.crops.length === 0) add("WARN", "NO_CROPS", `${p.name} is listed for no crop`);
      if (p.benefits.length === 0)
        add("WARN", "NO_OUTCOMES", `${p.name} declares no intended outcome`);
      if (p.growthStages.length === 0)
        add("INFO", "NO_STAGE", `${p.name} declares no growth stage`);
      if (!p.applicationMethods || p.applicationMethods.length === 0)
        add("INFO", "NO_METHOD", `${p.name} declares no application method`);
      if (p.packageSizes.length === 0) add("INFO", "NO_PACK_SIZES", `${p.name} has no pack sizes`);
      if (!p.composition || p.composition.length === 0)
        add("INFO", "NO_COMPOSITION", `${p.name} has no published composition`);
      if (p.applicationGuides.length === 0)
        add("INFO", "NO_RATES", `${p.name} has no published application rates`);
    }

    const nameKey = p.name.trim().toLowerCase();
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), p.id]);
    bySlug.set(p.slug, [...(bySlug.get(p.slug) ?? []), p.id]);
  }
  for (const [name, ids] of byName)
    if (ids.length > 1)
      add("BLOCKER", "DUPLICATE_NAME", `"${name}" used by ${ids.length} products`);
  for (const [slug, ids] of bySlug)
    if (ids.length > 1)
      add("BLOCKER", "DUPLICATE_SLUG", `"${slug}" used by ${ids.length} products`);

  /* ── Reference integrity ──────────────────────────────────────────────── */
  const [orphanCrops, orphanBenefits, orphanStages] = await Promise.all([
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "ProductCrop" pc
      WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = pc."productId")
         OR NOT EXISTS (SELECT 1 FROM "Crop" c WHERE c.id = pc."cropId")`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "ProductBenefit" pb
      WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = pb."productId")
         OR NOT EXISTS (SELECT 1 FROM "Benefit" b WHERE b.id = pb."benefitId")`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "ProductGrowthStage" pg
      WHERE NOT EXISTS (SELECT 1 FROM "Product" p WHERE p.id = pg."productId")
         OR NOT EXISTS (SELECT 1 FROM "GrowthStage" g WHERE g.id = pg."growthStageId")`,
  ]);
  const orphans =
    Number(orphanCrops[0]?.n ?? 0) +
    Number(orphanBenefits[0]?.n ?? 0) +
    Number(orphanStages[0]?.n ?? 0);
  if (orphans > 0)
    add("BLOCKER", "BROKEN_RELATIONSHIP", `${orphans} join rows point at missing records`);

  /* ── Facets that can never return a result ────────────────────────────── */
  const publishedIds = new Set(published.map((p) => p.id));
  const countFor = <T extends { productId: string }>(rows: T[]) =>
    new Set(rows.filter((r) => publishedIds.has(r.productId)).map((r) => r.productId)).size;

  const crops = await db.crop.findMany({ include: { products: true } });
  for (const crop of crops)
    if (countFor(crop.products) === 0)
      add("WARN", "EMPTY_CROP", `crop "${crop.name}" (${crop.slug}) has no published products`);

  const benefits = await db.benefit.findMany({ include: { products: true } });
  for (const benefit of benefits)
    if (countFor(benefit.products) === 0)
      add("WARN", "EMPTY_OUTCOME", `outcome "${benefit.name}" has no published products`);

  const stages = await db.growthStage.findMany({ include: { products: true } });
  for (const stage of stages)
    if (countFor(stage.products) === 0)
      add("WARN", "EMPTY_STAGE", `stage "${stage.name}" (${stage.key}) has no published products`);

  const categories = await db.productCategory.findMany({ include: { products: true } });
  for (const category of categories)
    if (category.products.filter((p) => publishedIds.has(p.id)).length === 0)
      add("WARN", "EMPTY_CATEGORY", `category "${category.name}" has no published products`);

  /* ── Naming consistency ───────────────────────────────────────────────── */
  const lower = crops.filter((c) => c.name === c.name.toLowerCase()).length;
  const upper = crops.length - lower;
  if (lower > 0 && upper > 0)
    add(
      "WARN",
      "INCONSISTENT_CROP_CASE",
      `${lower} lower-case and ${upper} capitalised crop names coexist`,
    );

  /* ── Report ───────────────────────────────────────────────────────────── */
  const order: Level[] = ["BLOCKER", "WARN", "INFO"];
  console.log(`products ${products.length} (published ${published.length})`);
  for (const level of order) {
    const rows = findings.filter((f) => f.level === level);
    console.log(`\n${level}: ${rows.length}`);
    for (const row of rows) console.log(`  [${row.code}] ${row.detail}`);
  }
  const blockers = findings.filter((f) => f.level === "BLOCKER").length;
  console.log(`\n${blockers === 0 ? "PASS" : "FAIL"} — ${blockers} blocker(s)`);
  await db.$disconnect();
  process.exit(blockers === 0 ? 0 : 1);
}
main();
