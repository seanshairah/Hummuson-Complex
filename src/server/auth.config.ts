import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js base config: no database imports, so the middleware
 * bundle stays Prisma-free. The Credentials provider (which needs the DB)
 * is added only in src/server/auth.ts for the Node runtime.
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
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as "ADMIN" | "EDITOR";
      return session;
    },
  },
} satisfies NextAuthConfig;
