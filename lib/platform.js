import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { PLATFORM_COOKIE, platformCookieOptions, signPlatformSession, verifyPlatformSession } from "@/lib/session";

// Sessions for the platform console (Lasan staff). Kept apart from workspace sessions in lib/auth.js.

export async function startPlatformSession(admin) {
  const token = await signPlatformSession({ adminId: admin.id, tokenVersion: admin.tokenVersion });
  const store = await cookies();
  store.set(PLATFORM_COOKIE, token, platformCookieOptions);
}

export async function endPlatformSession() {
  const store = await cookies();
  store.delete({ name: PLATFORM_COOKIE, path: platformCookieOptions.path });
}

// The signed-in console account, or null. A deactivated account, or one whose token version moved on
// (password or role changed), is treated as signed out. Cached per request.
export const getPlatformAdmin = cache(async () => {
  const store = await cookies();
  const session = await verifyPlatformSession(store.get(PLATFORM_COOKIE)?.value);
  if (!session) return null;
  const db = await getDb();
  const [admin] = await db.select().from(schema.platformAdmins).where(eq(schema.platformAdmins.id, session.adminId)).limit(1);
  if (!admin || !admin.isActive || admin.tokenVersion !== session.tokenVersion) return null;
  const { passwordHash, ...safe } = admin;
  return safe;
});

/**
 * For every console page and server action. `role: "admin"` limits it to console admins.
 * Someone on a temporary password can only reach the password page until they replace it.
 */
export async function requirePlatformAdmin({ role, allowPasswordChange = false } = {}) {
  const admin = await getPlatformAdmin();
  if (!admin) {
    const store = await cookies();
    redirect(store.has(PLATFORM_COOKIE) ? "/platform/session-ended" : "/platform/login");
  }
  if (admin.mustChangePassword && !allowPasswordChange) redirect("/platform/password");
  if (role === "admin" && admin.role !== "admin") throw new Error("Only console admins can do that");
  return admin;
}

// Where customers sign in, for the credentials handed to a new workspace owner.
export async function customerSignInUrl() {
  if (process.env.APP_HOST) return `https://${process.env.APP_HOST}/login`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/login`;
}
