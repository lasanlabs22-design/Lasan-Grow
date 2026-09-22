import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  sessionCookieOptions,
} from "@/lib/session";

export async function startSession(user) {
  const token = await signSession({ userId: user.id, orgId: user.orgId });
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

  const db = await getDb();
  const [row] = await db
    .select({ user: schema.users, org: schema.organizations })
    .from(schema.users)
    .innerJoin(schema.organizations, eq(schema.users.orgId, schema.organizations.id))
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  if (!row || row.user.orgId !== session.orgId) return null;

  const { passwordHash, ...user } = row.user;
  return { user, org: row.org };
});

// For pages and server actions: every query must be scoped by the returned orgId.
export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}
