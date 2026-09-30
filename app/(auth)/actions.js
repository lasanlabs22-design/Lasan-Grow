"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getAdminDb, tenantDb, schema } from "@/lib/db";
import { startSession, endSession, requireUser } from "@/lib/auth";
import { hashPassword, passwordProblem } from "@/lib/passwords";

// There is no public sign-up: workspaces are created by Lasan in the platform console (/platform),
// and each workspace's admins add their own team in Settings.

const { users, organizations } = schema;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Compared against when the email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "$2b$12$CUYHCbqQyS20dlT9foIHw.LW1Ni6tI2G.c2YuFP4NX3lTeSV3288y";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(128),
});

export async function login(_prev, formData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const values = { email: String(formData.get("email") ?? "") };
  const fail = { error: "Wrong email or password", values };
  if (!parsed.success) return fail;

  // Signing in is the one customer step that looks across workspaces (by email, before we know
  // which workspace), so it uses the owner connection and reads only what it needs.
  const admin = await getAdminDb();
  const [row] = await admin
    .select({
      id: users.id,
      orgId: users.orgId,
      passwordHash: users.passwordHash,
      mustChangePassword: users.mustChangePassword,
      tokenVersion: users.tokenVersion,
      failedLogins: users.failedLogins,
      lockedUntil: users.lockedUntil,
      status: organizations.status,
    })
    .from(users)
    .innerJoin(organizations, eq(users.orgId, organizations.id))
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (!row) {
    await bcrypt.compare(parsed.data.password, DUMMY_HASH);
    return fail;
  }
  if (row.lockedUntil && row.lockedUntil > new Date()) {
    const minutes = Math.ceil((row.lockedUntil - Date.now()) / 60000);
    return { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, values };
  }

  // Everything after the lookup happens inside the user's own workspace.
  const db = await tenantDb(row.orgId);
  if (!(await bcrypt.compare(parsed.data.password, row.passwordHash))) {
    const failed = row.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db
      .update(users)
      .set({ failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null })
      .where(eq(users.id, row.id));
    return fail;
  }
  // Only said after a correct password, so it can't be used to find out which emails exist.
  if (row.status !== "active") {
    return { error: "This workspace is suspended. Please contact your administrator or Lasan support.", values };
  }

  await db.update(users).set({ lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null }).where(eq(users.id, row.id));
  await startSession(row);
  redirect(row.mustChangePassword ? "/change-password" : "/welcome");
}

// First sign-in with a password someone else chose (the console, or a workspace admin).
export async function setOwnPassword(_prev, formData) {
  const { user } = await requireUser({ allowPasswordChange: true });
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return { error: "The new passwords don't match" };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next === current) return { error: "Choose a password different from the temporary one" };

  const db = await tenantDb(user.orgId);
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!(await bcrypt.compare(current, row.hash))) return { error: "The temporary password is wrong" };
  // A new token version signs out any other session that used the temporary password.
  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), mustChangePassword: false, tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, user.id))
    .returning({ id: users.id, orgId: users.orgId, tokenVersion: users.tokenVersion });
  await startSession(updated);
  redirect("/welcome?new=1");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
