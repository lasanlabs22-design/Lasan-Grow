"use server";

import { z } from "zod";
import { and, asc, eq, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { emptyToNull } from "@/lib/guard";
import { scoreLead } from "@/lib/lead-score";

const { leads, companies, contacts, deals, stages, activities } = schema;
const STATUSES = ["new", "contacted", "qualified", "unqualified"];

const leadSchema = z.object({
  name: z.string().trim().min(2, "Add the lead's name"),
  email: z.union([z.email("Enter a valid email"), z.literal("")]),
  phone: z.string().trim(),
  companyName: z.string().trim(),
  source: z.string().trim(),
  status: z.enum(STATUSES),
  estimatedValue: z.coerce.number().int().min(0).max(2_000_000_000),
});

function refresh() {
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}

export async function saveLead(_prev, formData) {
  const { user, org } = await requireUser();
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim(),
    phone: formData.get("phone") ?? "",
    companyName: formData.get("companyName") ?? "",
    source: formData.get("source") ?? "",
    status: formData.get("status") || "new",
    estimatedValue: formData.get("estimatedValue") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const values = {
    name: parsed.data.name,
    email: emptyToNull(parsed.data.email),
    phone: emptyToNull(parsed.data.phone),
    companyName: emptyToNull(parsed.data.companyName),
    source: emptyToNull(parsed.data.source),
    status: parsed.data.status,
    estimatedValue: parsed.data.estimatedValue,
  };
  values.score = scoreLead(values).score;

  const db = await getDb();
  const id = emptyToNull(formData.get("id"));
  if (id) {
    const res = await db
      .update(leads)
      .set(values)
      .where(and(eq(leads.id, id), eq(leads.orgId, org.id)))
      .returning({ id: leads.id });
    if (!res.length) return { error: "Lead not found" };
  } else {
    await db.insert(leads).values({ ...values, orgId: org.id, ownerId: user.id });
  }
  refresh();
  return { ok: true };
}

export async function setLeadStatus(id, status) {
  const { org } = await requireUser();
  if (!STATUSES.includes(status)) throw new Error("Bad status");
  const db = await getDb();
  const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.orgId, org.id))).limit(1);
  if (!lead) throw new Error("Not found");
  const { score } = scoreLead({ ...lead, status });
  await db.update(leads).set({ status, score }).where(eq(leads.id, id));
  refresh();
  return { score };
}

export async function deleteLead(id) {
  const { org } = await requireUser();
  const db = await getDb();
  await db.delete(leads).where(and(eq(leads.id, id), eq(leads.orgId, org.id)));
  refresh();
}

// Lead → company (matched by name or created) + contact + open deal in the first stage.
export async function convertLead(id) {
  const { user, org } = await requireUser();
  const db = await getDb();

  const dealId = await db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(and(eq(leads.id, id), eq(leads.orgId, org.id))).limit(1);
    if (!lead) throw new Error("Not found");
    if (lead.status === "converted") throw new Error("Already converted");

    let companyId = null;
    if (lead.companyName) {
      const [existing] = await tx
        .select({ id: companies.id })
        .from(companies)
        .where(and(eq(companies.orgId, org.id), ilike(companies.name, lead.companyName)))
        .limit(1);
      companyId =
        existing?.id ??
        (await tx.insert(companies).values({ orgId: org.id, ownerId: user.id, name: lead.companyName }).returning({ id: companies.id }))[0].id;
    }

    const [first, ...rest] = lead.name.trim().split(/\s+/);
    const [contact] = await tx
      .insert(contacts)
      .values({
        orgId: org.id,
        ownerId: user.id,
        companyId,
        firstName: first,
        lastName: rest.join(" ") || null,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
      })
      .returning({ id: contacts.id });

    const [firstStage] = await tx
      .select()
      .from(stages)
      .where(and(eq(stages.orgId, org.id), eq(stages.kind, "open")))
      .orderBy(asc(stages.position))
      .limit(1);

    const [deal] = await tx
      .insert(deals)
      .values({
        orgId: org.id,
        ownerId: user.id,
        title: lead.companyName ? `New business — ${lead.companyName}` : `New business — ${lead.name}`,
        value: lead.estimatedValue,
        stageId: firstStage.id,
        status: "open",
        contactId: contact.id,
        companyId,
        source: lead.source,
      })
      .returning({ id: deals.id });

    // Carry the lead's history over to the new records.
    await tx
      .update(activities)
      .set({ dealId: deal.id, contactId: contact.id, companyId })
      .where(and(eq(activities.leadId, lead.id), eq(activities.orgId, org.id)));
    await tx.update(leads).set({ status: "converted" }).where(eq(leads.id, lead.id));
    return deal.id;
  });

  refresh();
  revalidatePath("/deals");
  revalidatePath("/contacts");
  revalidatePath("/companies");
  redirect(`/deals/${dealId}`);
}
