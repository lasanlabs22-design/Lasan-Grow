import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Optimistic auth routing only; real authorization happens in requireUser().
const APP_PREFIXES = [
  "/dashboard",
  "/leads",
  "/contacts",
  "/companies",
  "/deals",
  "/tasks",
  "/settings",
  "/welcome",
];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  const isApp = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isApp && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (AUTH_PAGES.includes(pathname) && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
