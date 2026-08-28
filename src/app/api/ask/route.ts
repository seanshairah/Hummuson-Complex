import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion } from "@/server/data/ask";

const askSchema = z.object({
  question: z.string().trim().min(2).max(500),
  productSlug: z.string().trim().max(200).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const answer = await answerQuestion(parsed.data.question, parsed.data.productSlug);
  return NextResponse.json(answer);
}
