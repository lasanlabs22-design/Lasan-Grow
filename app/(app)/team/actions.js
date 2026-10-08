"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { tenantDb, schema } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/passwords";

const { users } = schema;

async function requireAdmin() {
  const current = await requireUser();
  if (!["owner", "admin"].includes(current.user.role)) throw new Error("Only workspace admins can do that");
  return current;
}

const ok = (message) => ({ ok: true, message, at: Date.now() });
const fail = (error) => ({ error, at: Date.now() });

const teammateSchema = z.object({
  name: z.string().trim().min(2, "Add their name"),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string(),
  role: z.enum(["admin", "member"]),
});

export async function addTeammate(_prev, formData) {
  let org;
  try {
    ({ org } = await requireAdmin());
  } catch (e) {
    return fail(e.message);
  }
  const parsed = teammateSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim(),
    password: formData.get("password"),
    role: formData.get("role") || "member",
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const problem = passwordProblem(parsed.data.password);
  if (problem) return fail(`Temporary password: ${problem.toLowerCase()}`);
  const db = await tenantDb(org.id);
  try {
    await db.insert(users).values({
      orgId: org.id,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
      // They choose their own password the first time they sign in.
      mustChangePassword: true,
    });
  } catch (e) {
    // Emails are unique across all workspaces. Row-level security hides other workspaces' users,
    // so the database's unique index is what spots a clash.
    if ((e?.code ?? e?.cause?.code) === "23505") return fail("That email already has an account");
    throw e;
  }
  revalidatePath("/team");
  return ok(`${parsed.data.name} can now sign in, and will be asked to choose their own password`);
}

// Admins can manage the team; the owner's role never changes, and nobody changes their own.
export async function setTeammateRole(id, role) {
  const { user, org } = await requireAdmin();
  if (id === user.id) return { error: "You can't change your own role" };
  if (!["admin", "member"].includes(role)) return { error: "Unknown role" };
  const db = await tenantDb(org.id);
  await db
    .update(users)
    .set({ role })
    .where(and(eq(users.id, id), eq(users.orgId, org.id), sql`${users.role} <> 'owner'`));
  revalidatePath("/team");
  return { ok: true };
}

export async function removeTeammate(id) {
  const { user, org } = await requireAdmin();
  if (id === user.id) return { error: "You can't remove yourself" };
  const db = await tenantDb(org.id);
  await db.delete(users).where(and(eq(users.id, id), eq(users.orgId, org.id), sql`${users.role} <> 'owner'`));
  revalidatePath("/team");
  return { ok: true };
}
