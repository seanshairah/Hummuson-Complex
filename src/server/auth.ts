import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { clientIp } from "@/server/rate-limit";
import { clearLoginThrottle, countLoginAttempt } from "@/server/login-throttle";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "EDITOR";
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
  providers: [
    Credentials({
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Counted here rather than only in the sign-in form's action, because
        // this callback has its own public endpoint that can be posted to
        // directly — a limit on the form alone would guard the front door
        // while leaving the side one open.
        const throttle = await countLoginAttempt(email, clientIp(request.headers));
        if (!throttle.allowed) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await clearLoginThrottle(email);
        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});

/** Server-side guard for admin actions/pages. Throws when unauthenticated. */
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
