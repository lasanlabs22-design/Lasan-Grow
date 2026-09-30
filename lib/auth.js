import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { tenantDb, schema } from "@/lib/db";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  sessionCookieOptions,
} from "@/lib/session";

export async function startSession(user) {
  const token = await signSession({ userId: user.id, orgId: user.orgId, tokenVersion: user.tokenVersion });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Returns { user, org } for the signed-in user, or null. Cached per request.
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  // Looked up inside the session's own workspace, so row-level security refuses a user id that
  // belongs to any other workspace.
  const db = await tenantDb(session.orgId);
  const [row] = await db
    .select({ user: schema.users, org: schema.organizations })
    .from(schema.users)
    .innerJoin(schema.organizations, eq(schema.users.orgId, schema.organizations.id))
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  if (!row || row.user.orgId !== session.orgId) return null;
  // A suspended workspace is locked out at once, even with a valid cookie.
  if (row.org.status !== "active") return null;
  // A password change or reset since this cookie was issued signs it out.
  if (row.user.tokenVersion !== session.tokenVersion) return null;

  const { passwordHash, failedLogins, lockedUntil, ...user } = row.user;
  return { user, org: row.org };
});

// For pages and server actions: every query must go through tenantDb(org.id).
// Someone still on a temporary password can only reach the change-password page.
export async function requireUser({ allowPasswordChange = false } = {}) {
  const current = await getCurrentUser();
  if (!current) {
    const store = await cookies();
    redirect(store.has(SESSION_COOKIE) ? "/session-ended" : "/login");
  }
  if (current.user.mustChangePassword && !allowPasswordChange) redirect("/change-password");
  return current;
}
