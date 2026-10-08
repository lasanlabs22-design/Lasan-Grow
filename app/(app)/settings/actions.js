"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser, startSession } from "@/lib/auth";
import { tenantDb, schema } from "@/lib/db";
import { hashPassword, passwordProblem } from "@/lib/passwords";
import { MAX_PHOTO_CHARS, PHOTO_DATA_URL } from "@/lib/photos";

const { users, userPhotos, organizations, stages, deals, activities, leads, contacts, companies } = schema;

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
  const db = await tenantDb(user.orgId);
  await db.update(users).set({ name }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return ok("Profile saved");
}

// `dataUrl` is the cropped 320px photo from the browser, or null to remove it.
export async function saveProfilePhoto(dataUrl) {
  const { user } = await requireUser();
  const db = await tenantDb(user.orgId);
  if (dataUrl === null) {
    await db.delete(userPhotos).where(eq(userPhotos.userId, user.id));
  } else {
    if (typeof dataUrl !== "string" || !PHOTO_DATA_URL.test(dataUrl)) return fail("Upload a PNG, JPG or WEBP image");
    if (dataUrl.length > MAX_PHOTO_CHARS) return fail("That image is too large. Try a smaller photo.");
    await db
      .insert(userPhotos)
      .values({ userId: user.id, orgId: user.orgId, data: dataUrl })
      .onConflictDoUpdate({ target: userPhotos.userId, set: { data: dataUrl, updatedAt: new Date() } });
  }
  revalidatePath("/", "layout");
  return ok(dataUrl ? "Photo saved" : "Photo removed");
}

export async function changePassword(_prev, formData) {
  const { user } = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const problem = passwordProblem(next);
  if (problem) return fail(problem);
  const db = await tenantDb(user.orgId);
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!(await bcrypt.compare(current, row.hash))) return fail("Current password is wrong");
  // A new token version signs out every other device; this one gets a fresh session.
  const [updated] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), mustChangePassword: false, tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, user.id))
    .returning({ id: users.id, orgId: users.orgId, tokenVersion: users.tokenVersion });
  await startSession(updated);
  return ok("Password changed. Other devices have been signed out.");
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
  const db = await tenantDb(org.id);
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
  const db = await tenantDb(org.id);

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
  const db = await tenantDb(org.id);
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
  const db = await tenantDb(org.id);
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

// ---------- Danger zone ----------

export async function clearWorkspaceData(_prev, formData) {
  const { user, org } = await requireUser();
  if (user.role !== "owner") return fail("Only the workspace owner can do this");
  if (String(formData.get("confirm") ?? "").trim() !== org.name) return fail(`Type "${org.name}" to confirm`);
  const db = await tenantDb(org.id);
  await db.transaction(async (tx) => {
    for (const table of [activities, deals, leads, contacts, companies]) {
      await tx.delete(table).where(eq(table.orgId, org.id));
    }
  });
  revalidatePath("/", "layout");
  return ok("All records cleared. Your pipeline stages and team are untouched.");
}
