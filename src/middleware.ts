import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/server/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Gate the whole admin area. Unauthenticated visits bounce to the login
 * screen with a return path; the login page itself stays public.
 */
export default auth((request) => {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !request.auth) {
    const login = new URL("/admin/login", request.nextUrl.origin);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
