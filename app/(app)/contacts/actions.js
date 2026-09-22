"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { ownedId, emptyToNull } from "@/lib/guard";

const { contacts, companies } = schema;

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim(),
  email: z.union([z.email("Enter a valid email"), z.literal("")]),
  phone: z.string().trim(),
  title: z.string().trim(),
  source: z.string().trim(),
  companyId: z.string(),
});

export async function saveContact(_prev, formData) {
  const { user, org } = await requireUser();
  const parsed = contactSchema.safeParse({
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    email: String(formData.get("email") ?? "").trim(),
    phone: formData.get("phone") ?? "",
    title: formData.get("title") ?? "",
    source: formData.get("source") ?? "",
    companyId: formData.get("companyId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const db = await getDb();

  let companyId;
  try {
    companyId = await ownedId(db, companies, emptyToNull(d.companyId), org.id);
  } catch {
    return { error: "That company isn't in this workspace" };
  }
  const values = {
    firstName: d.firstName,
    lastName: emptyToNull(d.lastName),
    email: emptyToNull(d.email),
    phone: emptyToNull(d.phone),
    title: emptyToNull(d.title),
    source: emptyToNull(d.source),
    companyId,
  };

  const id = emptyToNull(formData.get("id"));
  if (id) {
    const res = await db
      .update(contacts)
      .set(values)
      .where(and(eq(contacts.id, id), eq(contacts.orgId, org.id)))
      .returning({ id: contacts.id });
    if (!res.length) return { error: "Contact not found" };
    revalidatePath(`/contacts/${id}`);
  } else {
    await db.insert(contacts).values({ ...values, orgId: org.id, ownerId: user.id });
  }
  revalidatePath("/contacts");
  if (companyId) revalidatePath(`/companies/${companyId}`);
  return { ok: true };
}

export async function deleteContact(formData) {
  const { org } = await requireUser();
  const db = await getDb();
  await db.delete(contacts).where(and(eq(contacts.id, String(formData.get("id"))), eq(contacts.orgId, org.id)));
  revalidatePath("/contacts");
  redirect("/contacts");
}
