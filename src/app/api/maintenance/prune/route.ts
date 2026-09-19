import { NextRequest, NextResponse } from "next/server";
import { pruneExpiredData } from "@/server/data/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retention sweep, called on a schedule (see vercel.json).
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`, so the check is the
 * documented one for that platform. Without the secret configured the
 * endpoint refuses everything rather than defaulting to open — an endpoint
 * that deletes customer records is not one to leave ungated because an
 * environment variable is missing.
 *
 * Vercel Cron calls the path with GET, so GET is the sweep. Adding ?dryRun=1
 * reports what would be deleted without deleting it, which is how the
 * retention periods can be reviewed against real numbers before anyone
 * commits to them. The sweep does nothing at all until
 * DATA_RETENTION_ENABLED is set, whichever way it is called.
 */
function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  const result = await pruneExpiredData({ dryRun });
  return NextResponse.json({ ...result, dryRun });
}
