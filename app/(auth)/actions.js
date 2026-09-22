"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";
import { startSession, endSession } from "@/lib/auth";
import { createDefaultStages, seedDemoData } from "@/lib/seed";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name"),
  company: z.string().trim().min(2, "Name your workspace"),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Use at least 8 characters"),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED"]).default("INR"),
  demo: z.boolean(),
});

export async function signup(_prev, formData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    password: formData.get("password"),
    currency: formData.get("currency") || "INR",
    demo: formData.get("demo") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values: Object.fromEntries(formData) };
  }
  const { name, company, email, password, currency, demo } = parsed.data;

  const db = await getDb();
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing) {
    return { error: "An account with this email already exists", values: Object.fromEntries(formData) };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.transaction(async (tx) => {
    const [org] = await tx.insert(schema.organizations).values({ name: company, currency }).returning();
    const [u] = await tx
      .insert(schema.users)
      .values({ orgId: org.id, name, email, passwordHash, role: "owner" })
      .returning();
    const stageRows = await createDefaultStages(tx, org.id);
    if (demo) await seedDemoData(tx, org.id, u.id, stageRows);
    return u;
  });

  await startSession(user);
  redirect("/welcome?new=1");
}

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
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, parsed.data.email))
    .limit(1);
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return fail;

  await startSession(user);
  redirect("/welcome");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
