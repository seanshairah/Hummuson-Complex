import { createHash } from "node:crypto";
import { db } from "@/server/db";

/**
 * Fixed-window rate limiting backed by the database.
 *
 * The app runs as serverless functions, so an in-process counter would be
 * per-instance: an attacker would get the limit multiplied by however many
 * instances happen to be warm, and would get a fresh allowance every cold
 * start. One shared counter in Postgres is the only version of this that
 * actually holds.
 */

export interface Bucket {
  /** Identifies what is being limited, e.g. "login:email" or "api:ask:ip". */
  name: string;
  /** The subject — an email, an IP, a user id. Hashed before storage. */
  subject: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** Seconds until the caller may retry. Zero when allowed. */
  retryAfterSeconds: number;
}

const ALLOWED: RateLimitVerdict = { allowed: true, retryAfterSeconds: 0 };

/**
 * Keys are hashed so a database dump does not hand over a list of admin email
 * addresses and visitor IPs. The audit log is where identities are recorded
 * deliberately; this table only needs to count.
 */
function bucketKey(bucket: Bucket): string {
  const digest = createHash("sha256").update(bucket.subject).digest("base64url").slice(0, 32);
  return `${bucket.name}:${digest}`;
}

/**
 * Increments one window and reports whether the caller is over its limit.
 * A single statement, so concurrent requests cannot race past the limit the
 * way a read-then-write pair would.
 */
async function consume(bucket: Bucket): Promise<RateLimitVerdict> {
  const key = bucketKey(bucket);
  const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, now(), now() + make_interval(secs => ${bucket.windowSeconds}::double precision))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" <= now() - make_interval(secs => ${bucket.windowSeconds}::double precision)
        THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" <= now() - make_interval(secs => ${bucket.windowSeconds}::double precision)
        THEN now() ELSE "RateLimit"."windowStart" END,
      "expiresAt" = now() + make_interval(secs => ${bucket.windowSeconds}::double precision)
    RETURNING "count", "windowStart"
  `;

  const row = rows[0];
  if (!row) return ALLOWED;
  if (row.count <= bucket.limit) return ALLOWED;

  const resetsAt = row.windowStart.getTime() + bucket.windowSeconds * 1000;
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000)),
  };
}

/** Expired windows are dead weight; sweep them on a small fraction of calls. */
function sweepOccasionally() {
  if (Math.random() > 0.02) return;
  void db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
}

/**
 * Applies every bucket and returns the first refusal.
 *
 * `failOpen` decides what happens when the counter store itself is
 * unreachable. Public read endpoints stay open — the limiter must never be
 * the thing that takes the site down — while anything that grants privilege
 * or writes refuses, because an attacker who can break the counter should not
 * thereby get unlimited attempts.
 */
export async function rateLimit(
  buckets: Bucket[],
  options: { failOpen: boolean },
): Promise<RateLimitVerdict> {
  try {
    for (const bucket of buckets) {
      const verdict = await consume(bucket);
      if (!verdict.allowed) return verdict;
    }
    sweepOccasionally();
    return ALLOWED;
  } catch (error) {
    if (options.failOpen) return ALLOWED;
    console.error("[rate-limit] counter unavailable", error);
    return { allowed: false, retryAfterSeconds: 60 };
  }
}

/**
 * Reads a window without incrementing it. Used where the limit is enforced
 * somewhere else and the caller only needs to know whether to say so — asking
 * twice about one attempt would count it twice.
 */
export async function peek(bucket: Bucket): Promise<RateLimitVerdict> {
  try {
    const row = await db.rateLimit.findUnique({ where: { key: bucketKey(bucket) } });
    if (!row) return ALLOWED;
    const resetsAt = row.windowStart.getTime() + bucket.windowSeconds * 1000;
    if (resetsAt <= Date.now() || row.count <= bucket.limit) return ALLOWED;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((resetsAt - Date.now()) / 1000)),
    };
  } catch {
    return ALLOWED;
  }
}

/**
 * Clears a window early — used after a successful login so that a person who
 * mistyped their password twice is not still carrying those failures around.
 */
export async function resetBucket(bucket: Bucket): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key: bucketKey(bucket) } }).catch(() => {});
}

/**
 * Best-effort client address.
 *
 * Vercel sets `x-vercel-forwarded-for` and `x-real-ip` itself, so those are
 * trustworthy here; the leftmost `x-forwarded-for` entry is a fallback for
 * other hosts and can be forged. That is why every login limit below is
 * paired with a per-account bucket, which cannot be spoofed.
 */
export function clientIp(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}

/**
 * Per-address allowance for a public endpoint. Fails open: a limiter that can
 * take the public site down is a worse problem than the abuse it prevents.
 */
export async function limitByIp(
  headers: Headers,
  name: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitVerdict> {
  return rateLimit([{ name, subject: clientIp(headers), limit, windowSeconds }], {
    failOpen: true,
  });
}

/** Standard 429 body + Retry-After, so clients can back off correctly. */
export function tooManyRequests(verdict: RateLimitVerdict, message: string): Response {
  return Response.json(
    { error: message, retryAfterSeconds: verdict.retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
  );
}
