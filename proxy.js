import { NextResponse } from "next/server";
import { PLATFORM_COOKIE, SESSION_COOKIE, verifyPlatformSession, verifySession } from "@/lib/session";

// Optimistic routing only; real authorization happens in requireUser() and requirePlatformAdmin(),
// which every page and server action calls itself.
const APP_PREFIXES = [
  "/dashboard",
  "/leads",
  "/contacts",
  "/companies",
  "/deals",
  "/tasks",
  "/settings",
  "/welcome",
  "/change-password",
];

const isConsolePath = (p) => p === "/platform" || p.startsWith("/platform/");

/**
 * Which address serves what. With APP_HOST and CONSOLE_HOST set (app.lasangrow.com and
 * ops.lasangrow.com in production), customers never see the console on their address, and the
 * console address serves nothing else. LEGACY_HOSTS (comma-separated, e.g. the old
 * lasan-grow.vercel.app) forward to the right new address. Any other address (localhost, Vercel
 * preview URLs) serves everything.
 */
function routeByHost(request) {
  const appHost = process.env.APP_HOST?.toLowerCase();
  const consoleHost = process.env.CONSOLE_HOST?.toLowerCase();
  if (!appHost || !consoleHost) return null;

  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  if (host === consoleHost) {
    if (pathname === "/") return NextResponse.redirect(`https://${consoleHost}/platform`, 307);
    return isConsolePath(pathname) ? null : NextResponse.redirect(`https://${appHost}${pathname}${search}`, 308);
  }
  if (host === appHost && isConsolePath(pathname)) {
    // As far as anyone on the customer address can tell, the console doesn't exist.
    return new NextResponse("Not found", { status: 404 });
  }
  const legacy = (process.env.LEGACY_HOSTS ?? "").toLowerCase().split(",").map((h) => h.trim()).filter(Boolean);
  if (legacy.includes(host)) {
    const to = isConsolePath(pathname) ? consoleHost : appHost;
    return NextResponse.redirect(`https://${to}${pathname}${search}`, 308);
  }
  return null;
}

export async function proxy(request) {
  const byHost = routeByHost(request);
  if (byHost) return byHost;

  const { pathname } = request.nextUrl;

  // The platform console has its own session, separate from any workspace sign-in.
  if (isConsolePath(pathname)) {
    const staff = await verifyPlatformSession(request.cookies.get(PLATFORM_COOKIE)?.value);
    if (pathname === "/platform/login") {
      return staff ? NextResponse.redirect(new URL("/platform", request.url)) : NextResponse.next();
    }
    return staff ? NextResponse.next() : NextResponse.redirect(new URL("/platform/login", request.url));
  }

  // Workspaces are created by Lasan, not by visitors.
  if (pathname === "/signup") return NextResponse.redirect(new URL("/login", request.url), 308);

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isApp = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isApp && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
