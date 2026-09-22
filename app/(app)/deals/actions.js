"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { ownedId, emptyToNull } from "@/lib/guard";

const { deals, stages, contacts, companies } = schema;

const dealSchema = z.object({
  title: z.string().trim().min(2, "Give the deal a name"),
  value: z.coerce.number().int().min(0, "Value can't be negative").max(2_000_000_000),
  stageId: z.uuid("Pick a stage"),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  expectedClose: z.string().optional(),
  source: z.string().optional(),
});

function parseDeal(formData) {
  return dealSchema.safeParse({
    title: formData.get("title"),
    value: formData.get("value") || 0,
    stageId: formData.get("stageId"),
    contactId: formData.get("contactId") ?? "",
    companyId: formData.get("companyId") ?? "",
    expectedClose: formData.get("expectedClose") ?? "",
    source: formData.get("source") ?? "",
  });
}

async function resolveStage(db, stageId, orgId) {
  const [stage] = await db
    .select()
    .from(stages)
    .where(and(eq(stages.id, stageId), eq(stages.orgId, orgId)))
    .limit(1);
  if (!stage) throw new Error("Stage not found");
  return stage;
}

// Keeps status/closedAt consistent with the stage kind.
function statusFields(stage, previous) {
  if (stage.kind === "open") return { status: "open", closedAt: null, lostReason: null };
  const alreadyClosedSame = previous?.status === stage.kind;
  return { status: stage.kind, closedAt: alreadyClosedSame ? previous.closedAt : new Date() };
}

export async function saveDeal(_prev, formData) {
  const { user, org } = await requireUser();
  const parsed = parseDeal(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;
  const id = emptyToNull(formData.get("id"));

  const db = await getDb();
  try {
    const stage = await resolveStage(db, input.stageId, org.id);
    const values = {
      title: input.title,
      value: input.value,
      stageId: stage.id,
      contactId: await ownedId(db, contacts, emptyToNull(input.contactId), org.id),
      companyId: await ownedId(db, companies, emptyToNull(input.companyId), org.id),
      expectedClose: emptyToNull(input.expectedClose),
      source: emptyToNull(input.source),
    };

    if (id) {
      const [existing] = await db.select().from(deals).where(and(eq(deals.id, id), eq(deals.orgId, org.id))).limit(1);
      if (!existing) return { error: "Deal not found" };
      await db
        .update(deals)
        .set({ ...values, ...statusFields(stage, existing) })
        .where(and(eq(deals.id, id), eq(deals.orgId, org.id)));
    } else {
      await db.insert(deals).values({ ...values, ...statusFields(stage), orgId: org.id, ownerId: user.id });
    }
  } catch {
    return { error: "Something in that form doesn't belong to this workspace" };
  }

  revalidatePath("/deals");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/deals/${id}`);
  return { ok: true };
}

export async function moveDeal(dealId, stageId, lostReason) {
  const { org } = await requireUser();
  const db = await getDb();
  const stage = await resolveStage(db, stageId, org.id);
  const [existing] = await db.select().from(deals).where(and(eq(deals.id, dealId), eq(deals.orgId, org.id))).limit(1);
  if (!existing) throw new Error("Deal not found");

  await db
    .update(deals)
    .set({
      stageId: stage.id,
      ...statusFields(stage, existing),
      ...(stage.kind === "lost" ? { lostReason: lostReason?.trim() || "Unspecified" } : {}),
    })
    .where(and(eq(deals.id, dealId), eq(deals.orgId, org.id)));

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteDeal(formData) {
  const { org } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  await db.delete(deals).where(and(eq(deals.id, id), eq(deals.orgId, org.id)));
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  redirect("/deals");
}
