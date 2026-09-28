import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { limitByIp, tooManyRequests } from "@/server/rate-limit";
import { recordEvent } from "@/server/analytics";
import { AnalyticsType } from "@prisma/client";

const eventSchema = z.object({
  type: z.nativeEnum(AnalyticsType),
  path: z.string().max(500).optional(),
  entityType: z.string().max(60).optional(),
  entityId: z.string().max(60).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const verdict = await limitByIp(request.headers, "api:events", 120, 60);
  if (!verdict.allowed) return tooManyRequests(verdict, "Too many requests.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await recordEvent(parsed.data);
  return NextResponse.json({ ok: true });
}
