"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { startSession, endSession, requireUser } from "@/lib/auth";
import { passwordProblem } from "@/lib/passwords";

// There is no public sign-up: workspaces are created by Lasan in the platform console (/platform),
// and each workspace's admins add their own team in Settings.

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1),
});

export async function login(_prev, formData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const fail = { error: "Wrong email or password", values: { email: formData.get("email") } };
  if (!parsed.success) return fail;

  const db = await getDb();
  const [row] = await db
    .select({ user: schema.users, status: schema.organizations.status })
    .from(schema.users)
    .innerJoin(schema.organizations, eq(schema.users.orgId, schema.organizations.id))
    .where(eq(schema.users.email, parsed.data.email))
    .limit(1);
  if (!row || !(await bcrypt.compare(parsed.data.password, row.user.passwordHash))) return fail;
  // Only said after a correct password, so it can't be used to find out which emails exist.
  if (row.status !== "active") {
    return {
      error: "This workspace is suspended. Please contact your administrator or Lasan support.",
      values: { email: formData.get("email") },
    };
  }

  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, row.user.id));
  await startSession(row.user);
  redirect(row.user.mustChangePassword ? "/change-password" : "/welcome");
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

  const db = await getDb();
  const [row] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!(await bcrypt.compare(current, row.hash))) return { error: "The temporary password is wrong" };
  await db
    .update(schema.users)
    .set({ passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false })
    .where(eq(schema.users.id, user.id));
  redirect("/welcome?new=1");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
