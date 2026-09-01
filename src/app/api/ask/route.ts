import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { limitByIp, tooManyRequests } from "@/server/rate-limit";
import { answerQuestion } from "@/server/data/ask";

const askSchema = z.object({
  question: z.string().trim().min(2).max(500),
  productSlug: z.string().trim().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const verdict = await limitByIp(request.headers, "api:ask", 20, 60);
  if (!verdict.allowed) return tooManyRequests(verdict, "Too many questions in a short time — please wait a moment.");

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
