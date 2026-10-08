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
  "/team",
  "/welcome",
  "/change-password",
];

const isConsolePath = (p) => p === "/platform" || p.startsWith("/platform/");

/**
 * Which address serves what, once APP_HOST and CONSOLE_HOST are set (production):
 *   SITE_HOST     lasangrow.com      the public website: the home page only. Any other path (its
 *                                    sign-in links and so on) forwards to the app address.
 *   APP_HOST      app.lasangrow.com  clients: sign-in and the CRM. Its bare address goes to sign-in,
 *                                    and the console doesn't exist here (404).
 *   CONSOLE_HOST  ops.lasangrow.com  the platform console only; everything else forwards to the app.
 *   LEGACY_HOSTS  comma-separated old addresses (lasan-grow.vercel.app) forward to the right new one.
 * Any other address (localhost, Vercel preview URLs) serves everything.
 */
function routeByHost(request) {
  const appHost = process.env.APP_HOST?.toLowerCase();
  const consoleHost = process.env.CONSOLE_HOST?.toLowerCase();
  const siteHost = process.env.SITE_HOST?.toLowerCase();
  if (!appHost || !consoleHost) return null;

  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const to = (h, path = pathname, status = 308) => NextResponse.redirect(`https://${h}${path}${search}`, status);
  const home = (path) => (isConsolePath(path) ? consoleHost : appHost);

  if (siteHost && host === siteHost) {
    return pathname === "/" ? null : to(home(pathname));
  }
  if (host === consoleHost) {
    if (pathname === "/") return to(consoleHost, "/platform", 307);
    return isConsolePath(pathname) ? null : to(appHost);
  }
  if (host === appHost) {
    // The website lives on SITE_HOST; the app's own front door is sign-in (which forwards to the
    // dashboard when already signed in).
    if (pathname === "/" && siteHost) return to(appHost, "/login", 307);
    // As far as anyone on the customer address can tell, the console doesn't exist.
    if (isConsolePath(pathname)) return new NextResponse("Not found", { status: 404 });
    return null;
  }
  const legacy = (process.env.LEGACY_HOSTS ?? "").toLowerCase().split(",").map((h) => h.trim()).filter(Boolean);
  if (legacy.includes(host)) {
    return pathname === "/" && siteHost ? to(siteHost) : to(home(pathname));
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
