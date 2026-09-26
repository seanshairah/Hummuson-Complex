import { peek, rateLimit, resetBucket, type Bucket, type RateLimitVerdict } from "@/server/rate-limit";

/**
 * Login is the only endpoint on this system where an attacker gains
 * privilege, so it gets its own limits rather than sharing the general API
 * allowance.
 *
 * Two buckets, because either one alone has a hole. The per-account bucket
 * stops password guessing against a known admin address and cannot be evaded
 * by changing address. The per-IP bucket stops a spray across many addresses
 * from one source, but rests on a header, so it is a second layer and never
 * the only one.
 */
const FIFTEEN_MINUTES = 15 * 60;

/**
 * The per-address ceiling is tunable because it is the one limit that can hit
 * innocent people: a whole office behind a single NAT address shares it. The
 * per-account limit below is not tunable — five wrong passwords for one
 * account in a quarter of an hour is never legitimate.
 */
const IP_ATTEMPT_LIMIT = Number(process.env.LOGIN_IP_ATTEMPT_LIMIT) || 30;

function emailBucket(email: string): Bucket {
  return { name: "login:email", subject: email, limit: 5, windowSeconds: FIFTEEN_MINUTES };
}

function ipBucket(ip: string): Bucket {
  return { name: "login:ip", subject: ip, limit: IP_ATTEMPT_LIMIT, windowSeconds: FIFTEEN_MINUTES };
}

/**
 * Counts one sign-in attempt. Called from `authorize()` — the credentials
 * callback can be posted to directly, so the limit has to live at the point
 * where the password is actually checked, not only in the form's action.
 *
 * Fails closed: if the counter store is unreachable we refuse rather than
 * hand out unlimited attempts.
 */
export async function countLoginAttempt(email: string, ip: string): Promise<RateLimitVerdict> {
  return rateLimit([emailBucket(email), ipBucket(ip)], { failOpen: false });
}

/**
 * Reports whether this account or address is currently locked out, without
 * counting an attempt. The sign-in form uses this so it can say "too many
 * attempts" instead of "invalid password", which would send someone hunting
 * for a problem that isn't there.
 */
export async function peekLoginThrottle(email: string, ip: string): Promise<RateLimitVerdict> {
  const byEmail = await peek(emailBucket(email));
  if (!byEmail.allowed) return byEmail;
  return peek(ipBucket(ip));
}

/**
 * A correct password clears the account's failures — someone who mistyped
 * twice should not carry those attempts around for the rest of the window.
 * The per-IP window is deliberately not cleared: an attacker holding one
 * valid account would otherwise reset their own spray counter at will.
 */
export async function clearLoginThrottle(email: string): Promise<void> {
  await resetBucket(emailBucket(email));
}
