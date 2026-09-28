import { db } from "@/server/db";
import type { AnalyticsType, SearchSource } from "@prisma/client";

export async function recordEvent(input: {
  type: AnalyticsType;
  path?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        type: input.type,
        path: input.path?.slice(0, 500) ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        meta: (input.meta ?? undefined) as object | undefined,
      },
    });
  } catch {
    // Never let analytics failures surface.
  }
}

export async function recordSearch(input: {
  query: string;
  normalized: string;
  resultCount: number;
  source: SearchSource;
}): Promise<void> {
  try {
    await db.searchEvent.create({
      data: {
        query: input.query.slice(0, 300),
        normalized: input.normalized.slice(0, 300),
        resultCount: input.resultCount,
        source: input.source,
      },
    });
  } catch {
    // ignore
  }
}
