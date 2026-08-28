import { NextRequest, NextResponse } from "next/server";
import { searchAll } from "@/server/data/search-index";
import { recordSearch } from "@/server/analytics";
import { normalizeText } from "@/lib/search/tokenize";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.slice(0, 200) ?? "";
  const prefix = request.nextUrl.searchParams.get("prefix") === "1";
  const typesParam = request.nextUrl.searchParams.get("types");

  if (q.trim().length < 2) return NextResponse.json({ results: [] });

  const results = await searchAll(q, {
    limit: 12,
    prefix,
    types: typesParam
      ? (typesParam.split(",") as ("product" | "crop" | "faq" | "article" | "video" | "project")[])
      : undefined,
  });

  // Log searches (not keystroke prefixes) for the admin "what are people
  // looking for / zero-result queries" insight.
  if (!prefix || q.trim().length >= 4) {
    void recordSearch({
      query: q,
      normalized: normalizeText(q),
      resultCount: results.length,
      source: "GLOBAL",
    });
  }

  return NextResponse.json({
    results: results.map((result) => ({
      type: result.doc.type,
      title: result.doc.title,
      href: result.doc.href,
      subtitle: (result.doc.meta as { subtitle?: string } | undefined)?.subtitle,
    })),
  });
}
