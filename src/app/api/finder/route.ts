import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { limitByIp, tooManyRequests } from "@/server/rate-limit";
import { recommendWithFallback } from "@/lib/finder/scoring";
import { getFinderCandidates, getAllProducts, getFilterOptions } from "@/server/data/products";
import { recordEvent } from "@/server/analytics";

const answersSchema = z.object({
  cropSlug: z.string().max(100).optional(),
  benefitSlug: z.string().max(100).optional(),
  stageKey: z.string().max(100).optional(),
  method: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const verdict = await limitByIp(request.headers, "api:finder", 40, 60);
  if (!verdict.allowed) return tooManyRequests(verdict, "Too many requests — please wait a moment.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = answersSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const answers = parsed.data;
  const [candidates, products, options] = await Promise.all([
    getFinderCandidates(),
    getAllProducts(),
    getFilterOptions(),
  ]);

  const labels = {
    cropName: options.crops.find((crop) => crop.slug === answers.cropSlug)?.name,
    benefitName: options.benefits.find((benefit) => benefit.slug === answers.benefitSlug)?.name,
    stageName: options.stages.find((stage) => stage.key === answers.stageKey)?.name,
    methodName: answers.method
      ? answers.method.charAt(0) + answers.method.slice(1).toLowerCase().replace(/_/g, " ")
      : undefined,
  };

  const { results: recommendations, relaxed } = recommendWithFallback(
    candidates,
    answers,
    labels,
    6,
  );
  const byId = new Map(products.map((product) => [product.id, product]));

  await recordEvent({
    type: "FINDER_COMPLETED",
    meta: { ...answers, results: recommendations.length },
  });

  return NextResponse.json({
    relaxed,
    results: recommendations
      .map((recommendation) => ({
        product: byId.get(recommendation.candidate.id) ?? null,
        reasons: recommendation.reasons,
        score: recommendation.score,
      }))
      .filter((entry) => entry.product !== null),
  });
}
