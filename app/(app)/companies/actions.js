"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { emptyToNull } from "@/lib/guard";

const { companies } = schema;

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  domain: z.string().trim().toLowerCase().transform((d) => d.replace(/^https?:\/\//, "").replace(/\/.*$/, "")),
  industry: z.string().trim(),
  size: z.string().trim(),
  city: z.string().trim(),
});

export async function saveCompany(_prev, formData) {
  const { user, org } = await requireUser();
  const parsed = companySchema.safeParse({
    name: formData.get("name") ?? "",
    domain: formData.get("domain") ?? "",
    industry: formData.get("industry") ?? "",
    size: formData.get("size") ?? "",
    city: formData.get("city") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const values = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, k === "name" ? v : emptyToNull(v)]));

  const db = await getDb();
  const id = emptyToNull(formData.get("id"));
  if (id) {
    const res = await db
      .update(companies)
      .set(values)
      .where(and(eq(companies.id, id), eq(companies.orgId, org.id)))
      .returning({ id: companies.id });
    if (!res.length) return { error: "Company not found" };
    revalidatePath(`/companies/${id}`);
  } else {
    await db.insert(companies).values({ ...values, orgId: org.id, ownerId: user.id });
  }
  revalidatePath("/companies");
  return { ok: true };
}

export async function deleteCompany(formData) {
  const { org } = await requireUser();
  const db = await getDb();
  await db.delete(companies).where(and(eq(companies.id, String(formData.get("id"))), eq(companies.orgId, org.id)));
  revalidatePath("/companies");
  redirect("/companies");
}
