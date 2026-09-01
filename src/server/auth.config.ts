import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js base config: no database imports, so the middleware
 * bundle stays Prisma-free. The Credentials provider (which needs the DB)
 * and the revocation check (which also needs it) are added only in
 * src/server/auth.ts, for the Node runtime.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/admin/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // Stamped once, at sign-in, and deliberately not refreshed when the
        // token is rotated: this is what a revocation timestamp is compared
        // against, so it has to mean "when this session began".
        token.issuedAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as "ADMIN" | "EDITOR";
      if (token.issuedAt) session.user.issuedAt = token.issuedAt as number;
      return session;
    },
  },
} satisfies NextAuthConfig;
