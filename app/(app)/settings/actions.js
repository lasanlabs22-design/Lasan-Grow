"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

const { users, organizations, stages, deals, activities, leads, contacts, companies } = schema;

async function requireAdmin() {
  const current = await requireUser();
  if (!["owner", "admin"].includes(current.user.role)) throw new Error("Only workspace admins can do that");
  return current;
}

const ok = (message) => ({ ok: true, message, at: Date.now() });
const fail = (error) => ({ error, at: Date.now() });

export async function updateProfile(_prev, formData) {
  const { user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return fail("Name is too short");
  const db = await getDb();
  await db.update(users).set({ name }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return ok("Profile saved");
}

export async function changePassword(_prev, formData) {
  const { user } = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return fail("New password needs at least 8 characters");
  const db = await getDb();
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!(await bcrypt.compare(current, row.hash))) return fail("Current password is wrong");
  await db.update(users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(users.id, user.id));
  return ok("Password changed");
}

const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name is too short"),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED"]),
});

export async function updateWorkspace(_prev, formData) {
  let org;
  try {
    ({ org } = await requireAdmin());
  } catch (e) {
    return fail(e.message);
  }
  const parsed = workspaceSchema.safeParse({ name: formData.get("name"), currency: formData.get("currency") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const db = await getDb();
  await db.update(organizations).set(parsed.data).where(eq(organizations.id, org.id));
  revalidatePath("/", "layout");
  return ok("Workspace saved");
}

// ---------- Pipeline stages ----------

export async function saveStage(_prev, formData) {
  let org;
  try {
    ({ org } = await requireAdmin());
  } catch (e) {
    return fail(e.message);
  }
  const name = String(formData.get("name") ?? "").trim();
  const probability = Math.max(0, Math.min(100, Number(formData.get("probability")) || 0));
  if (!name) return fail("Stage needs a name");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();

  if (id) {
    await db.update(stages).set({ name, probability }).where(and(eq(stages.id, id), eq(stages.orgId, org.id), eq(stages.kind, "open")));
  } else {
    // New open stages go just before Won/Lost.
    const all = await db.select().from(stages).where(eq(stages.orgId, org.id)).orderBy(asc(stages.position));
    const openCount = all.filter((s) => s.kind === "open").length;
    await db.transaction(async (tx) => {
      for (const s of all.filter((s) => s.kind !== "open")) {
        await tx.update(stages).set({ position: s.position + 1 }).where(eq(stages.id, s.id));
      }
      await tx.insert(stages).values({ orgId: org.id, name, probability, kind: "open", position: openCount });
    });
  }
  revalidatePath("/settings");
  revalidatePath("/deals");
  return ok(id ? "Stage updated" : "Stage added");
}

export async function moveStage(id, direction) {
  const { org } = await requireAdmin();
  const db = await getDb();
  const open = await db
    .select()
    .from(stages)
    .where(and(eq(stages.orgId, org.id), eq(stages.kind, "open")))
    .orderBy(asc(stages.position));
  const i = open.findIndex((s) => s.id === id);
  const j = i + (direction === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= open.length) return;
  await db.transaction(async (tx) => {
    await tx.update(stages).set({ position: open[j].position }).where(eq(stages.id, open[i].id));
    await tx.update(stages).set({ position: open[i].position }).where(eq(stages.id, open[j].id));
  });
  revalidatePath("/settings");
  revalidatePath("/deals");
}

export async function deleteStage(id) {
  const { org } = await requireAdmin();
  const db = await getDb();
  const [stage] = await db.select().from(stages).where(and(eq(stages.id, id), eq(stages.orgId, org.id)));
  if (!stage || stage.kind !== "open") return { error: "Won and Lost stages can't be removed" };
  const [{ n }] = await db.select({ n: sql`count(*)`.mapWith(Number) }).from(deals).where(eq(deals.stageId, id));
  if (n > 0) return { error: `Move the ${n} deal${n === 1 ? "" : "s"} in "${stage.name}" first` };
  const [{ open }] = await db
    .select({ open: sql`count(*)`.mapWith(Number) })
    .from(stages)
    .where(and(eq(stages.orgId, org.id), eq(stages.kind, "open")));
  if (open <= 1) return { error: "A pipeline needs at least one open stage" };
  await db.delete(stages).where(eq(stages.id, id));
  revalidatePath("/settings");
  revalidatePath("/deals");
  return { ok: true };
}

// ---------- Team ----------

const teammateSchema = z.object({
  name: z.string().trim().min(2, "Add their name"),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Temporary password needs 8+ characters"),
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
  const db = await getDb();
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email));
  if (exists) return fail("That email already has an account");
  await db.insert(users).values({
    orgId: org.id,
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    passwordHash: await bcrypt.hash(parsed.data.password, 10),
  });
  revalidatePath("/settings");
  return ok(`${parsed.data.name} can now sign in`);
}

export async function removeTeammate(id) {
  const { user, org } = await requireAdmin();
  if (id === user.id) return { error: "You can't remove yourself" };
  const db = await getDb();
  await db.delete(users).where(and(eq(users.id, id), eq(users.orgId, org.id), sql`${users.role} <> 'owner'`));
  revalidatePath("/settings");
  return { ok: true };
}

// ---------- Danger zone ----------

export async function clearWorkspaceData(_prev, formData) {
  const { user, org } = await requireUser();
  if (user.role !== "owner") return fail("Only the workspace owner can do this");
  if (String(formData.get("confirm") ?? "").trim() !== org.name) return fail(`Type "${org.name}" to confirm`);
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const table of [activities, deals, leads, contacts, companies]) {
      await tx.delete(table).where(eq(table.orgId, org.id));
    }
  });
  revalidatePath("/", "layout");
  return ok("All records cleared. Your pipeline stages and team are untouched.");
}
