import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { clientIp } from "@/server/rate-limit";
import { writeAuditEvent } from "@/server/audit-log";
import { clearLoginThrottle, countLoginAttempt } from "@/server/login-throttle";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "EDITOR";
      /** Epoch milliseconds at which this session began. See requireUser(). */
      issuedAt: number;
    } & DefaultSession["user"];
  }
  interface User {
    role: "ADMIN" | "EDITOR";
  }
}


const credentialsSchema = z.object({
  // Trim the email: autofill, paste and mobile keyboards routinely add a
  // leading or trailing space, and an untrimmed value fails .email() outright
  // — which the sign-in form can only report as "invalid email or password".
  // The password is never trimmed; whitespace there can be deliberate.
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * A JWT session has no server-side record to delete, so without this a
     * stolen or stale token stays valid for its full seven days no matter
     * what happens to the account behind it. Returning null here invalidates
     * the token and clears the cookie.
     *
     * This runs on every session read rather than on an interval. The
     * middleware cannot do it at all — it runs on the edge with no database —
     * so it still waves a revoked token through to the page, and the page is
     * where the answer has to be right. auth() is only ever called inside the
     * admin area, so the cost is one indexed read per admin request.
     */
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      if (!token?.id) return token;
      if (params.user) return token;

      const issuedAt = typeof token.issuedAt === "number" ? token.issuedAt : undefined;
      const user = await db.user
        .findUnique({
          where: { id: token.id as string },
          select: { active: true, role: true, sessionsValidFrom: true },
        })
        .catch(() => undefined);

      // A database blip should not sign everyone out; leave the token alone
      // and let the next request decide. A row that is genuinely gone is a
      // different matter — that token has nothing behind it.
      if (user === undefined) return token;
      if (user === null) return null;
      if (!user.active) return null;
      if (!issuedAt || user.sessionsValidFrom.getTime() > issuedAt) return null;

      // Role is read back on every request too, so a demoted editor cannot
      // carry an ADMIN claim around in a token for the rest of the week.
      return { ...token, role: user.role };
    },
  },
  providers: [
    Credentials({
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, request) {
        const requestHeaders = request.headers;
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Counted here rather than only in the sign-in form's action, because
        // this callback has its own public endpoint that can be posted to
        // directly — a limit on the form alone would guard the front door
        // while leaving the side one open.
        const throttle = await countLoginAttempt(email, clientIp(requestHeaders));
        if (!throttle.allowed) {
          await writeAuditEvent({
            action: "auth.sign_in_blocked",
            actorEmail: email,
            requestHeaders,
            meta: { retryAfterSeconds: throttle.retryAfterSeconds },
          });
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });
        const valid = user?.active ? await bcrypt.compare(password, user.passwordHash) : false;

        if (!user || !valid) {
          // The reason is recorded but never returned: whether the address
          // exists is not something a failed attempt should reveal.
          await writeAuditEvent({
            action: "auth.sign_in_failed",
            actorId: user?.id,
            actorEmail: email,
            requestHeaders,
            meta: { reason: !user ? "unknown-account" : !user.active ? "deactivated" : "password" },
          });
          return null;
        }

        await clearLoginThrottle(email);
        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await writeAuditEvent({
          action: "auth.signed_in",
          actorId: user.id,
          actorEmail: user.email,
          requestHeaders,
        });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});

/**
 * Server-side guard for admin actions and pages. Throws when unauthenticated.
 *
 * Revocation is handled one level down, in the token callback above, so that
 * every reader of the session sees the same answer — including the sign-in
 * page, which would otherwise send a revoked session straight back to the
 * admin area it was just bounced out of.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Forbidden: admin role required");
  return user;
}
