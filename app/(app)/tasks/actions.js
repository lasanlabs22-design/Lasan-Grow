"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { ownedId, emptyToNull } from "@/lib/guard";

const { activities, deals, contacts, companies, leads } = schema;

const activitySchema = z.object({
  type: z.enum(["call", "email", "meeting", "task", "note"]),
  subject: z.string().trim().min(1, "Add a short subject"),
  notes: z.string().optional(),
  dueAt: z.string().optional(),
});

function revalidateAll(extra = []) {
  for (const p of ["/tasks", "/dashboard", ...extra]) revalidatePath(p);
}

export async function createActivity(_prev, formData) {
  const { user, org } = await requireUser();
  const parsed = activitySchema.safeParse({
    type: formData.get("type") || "task",
    subject: formData.get("subject"),
    notes: formData.get("notes") ?? "",
    dueAt: formData.get("dueAt") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { type, subject, notes, dueAt } = parsed.data;

  const db = await getDb();
  const links = {};
  try {
    links.dealId = await ownedId(db, deals, emptyToNull(formData.get("dealId")), org.id);
    links.contactId = await ownedId(db, contacts, emptyToNull(formData.get("contactId")), org.id);
    links.companyId = await ownedId(db, companies, emptyToNull(formData.get("companyId")), org.id);
    links.leadId = await ownedId(db, leads, emptyToNull(formData.get("leadId")), org.id);
  } catch {
    return { error: "That record isn't in this workspace" };
  }

  // Notes and anything logged without a due date are records of work already done.
  const isLog = type === "note" || formData.get("logged") === "on" || !dueAt;
  const due = dueAt ? new Date(dueAt) : new Date();
  await db.insert(activities).values({
    orgId: org.id,
    ownerId: user.id,
    type,
    subject,
    notes: emptyToNull(notes),
    dueAt: due,
    done: isLog,
    completedAt: isLog ? new Date() : null,
    ...links,
  });

  revalidateAll([
    links.dealId && `/deals/${links.dealId}`,
    links.contactId && `/contacts/${links.contactId}`,
    links.companyId && `/companies/${links.companyId}`,
  ].filter(Boolean));
  return { ok: true, at: Date.now() };
}

export async function toggleActivity(id, done) {
  const { org } = await requireUser();
  const db = await getDb();
  const [row] = await db
    .update(activities)
    .set({ done, completedAt: done ? new Date() : null })
    .where(and(eq(activities.id, id), eq(activities.orgId, org.id)))
    .returning({ dealId: activities.dealId, contactId: activities.contactId });
  if (!row) throw new Error("Not found");
  revalidateAll([row.dealId && `/deals/${row.dealId}`, row.contactId && `/contacts/${row.contactId}`].filter(Boolean));
}

export async function deleteActivity(id) {
  const { org } = await requireUser();
  const db = await getDb();
  await db.delete(activities).where(and(eq(activities.id, id), eq(activities.orgId, org.id)));
  revalidateAll();
}
