import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const AUTH_PAGES = ["/admin/login", "/admin/signup", "/admin/forgot-password"];

export const proxy = auth((req) => {
  const path = req.nextUrl.pathname;
  const user = req.auth?.user;

  if (path.startsWith("/admin")) {
    const isAuthPage = AUTH_PAGES.some((p) => path === p || path.startsWith(p + "/"));

    if (!isAuthPage && !user) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthPage && user) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
