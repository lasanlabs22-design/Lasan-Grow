"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, eq, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminDb, schema } from "@/lib/db";
import { hashPassword, passwordProblem, temporaryPassword } from "@/lib/passwords";
import { createDefaultStages, seedDemoData } from "@/lib/seed";
import {
  customerSignInUrl,
  endPlatformSession,
  requirePlatformAdmin,
  startPlatformSession,
} from "@/lib/platform";

const { platformAdmins, organizations, users } = schema;

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
// Compared against when the email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "$2b$12$Phl7fabFXL60f99x1k2HKO2VQw5W6Qk3xU3yc91rltshBzi4LYjvK";

const fail = (error, fields) => ({ error, fields, at: Date.now() });

// Server actions that bail out with a thrown "Only console admins…" error return it instead.
async function asAdmin(fn) {
  try {
    await requirePlatformAdmin({ role: "admin" });
  } catch (e) {
    if (e?.message === "Only console admins can do that") return fail(e.message);
    throw e; // redirects
  }
  return fn();
}

// ---------- Sign in / out ----------

export async function platformLogin(_prev, formData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const wrong = fail("Wrong email or password", { email });
  if (!email || !password) return wrong;

  const db = await getAdminDb();
  const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.email, email)).limit(1);
  if (!admin) {
    await bcrypt.compare(password, DUMMY_HASH);
    return wrong;
  }
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    const minutes = Math.ceil((admin.lockedUntil - Date.now()) / 60000);
    return fail(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, { email });
  }
  if (!(await bcrypt.compare(password, admin.passwordHash)) || !admin.isActive) {
    const failed = admin.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db
      .update(platformAdmins)
      .set({ failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000) : null })
      .where(eq(platformAdmins.id, admin.id));
    return wrong;
  }

  await db
    .update(platformAdmins)
    .set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(platformAdmins.id, admin.id));
  await startPlatformSession(admin);
  redirect(admin.mustChangePassword ? "/platform/password" : "/platform");
}

export async function platformLogout() {
  await endPlatformSession();
  redirect("/platform/login");
}

// Own password. Bumps the token version (signing out other devices) and re-issues this device's cookie.
export async function changePlatformPassword(_prev, formData) {
  const me = await requirePlatformAdmin({ allowPasswordChange: true });
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return fail("The new passwords don't match");
  const problem = passwordProblem(next);
  if (problem) return fail(problem);
  if (next === current) return fail("Choose a password different from the current one");

  const db = await getAdminDb();
  const [row] = await db.select({ hash: platformAdmins.passwordHash }).from(platformAdmins).where(eq(platformAdmins.id, me.id));
  if (!(await bcrypt.compare(current, row.hash))) return fail("Current password is wrong");
  const [updated] = await db
    .update(platformAdmins)
    .set({
      passwordHash: await hashPassword(next),
      mustChangePassword: false,
      tokenVersion: sql`${platformAdmins.tokenVersion} + 1`,
    })
    .where(eq(platformAdmins.id, me.id))
    .returning();
  await startPlatformSession(updated);
  redirect("/platform?password=changed");
}

// ---------- Workspaces ----------

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];

const workspaceSchema = z.object({
  company: z.string().trim().min(2, "Enter the company name").max(120),
  currency: z.enum(CURRENCIES),
  ownerName: z.string().trim().min(2, "Enter the owner's name").max(120),
  ownerEmail: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  demo: z.boolean(),
});

export async function createWorkspace(_prev, formData) {
  const me = await requirePlatformAdmin();
  const values = {
    company: formData.get("company"),
    currency: formData.get("currency") || "INR",
    ownerName: formData.get("ownerName"),
    ownerEmail: String(formData.get("ownerEmail") ?? "").trim(),
    demo: formData.get("demo") === "on",
  };
  const parsed = workspaceSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue.message, values);
  }
  const { company, currency, ownerName, ownerEmail, demo } = parsed.data;

  // Blank means "make one up"; otherwise it has to meet the usual rule.
  const typed = String(formData.get("password") ?? "").trim();
  const problem = typed && passwordProblem(typed);
  if (problem) return fail(`Temporary password: ${problem.toLowerCase()}`, values);
  const password = typed || temporaryPassword();

  const db = await getAdminDb();
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, ownerEmail)).limit(1);
  if (taken) return fail("That email already has a Lasan Grow account", values);

  const passwordHash = await hashPassword(password);
  const org = await db.transaction(async (tx) => {
    const [o] = await tx.insert(organizations).values({ name: company, currency, createdBy: me.id }).returning();
    const [owner] = await tx
      .insert(users)
      .values({ orgId: o.id, name: ownerName, email: ownerEmail, passwordHash, role: "owner", mustChangePassword: true })
      .returning();
    const stageRows = await createDefaultStages(tx, o.id);
    if (demo) await seedDemoData(tx, o.id, owner.id, stageRows);
    return o;
  });

  revalidatePath("/platform");
  return {
    ok: true,
    at: Date.now(),
    credentials: { workspace: org.name, name: ownerName, email: ownerEmail, password, signInUrl: await customerSignInUrl() },
  };
}

export async function setWorkspaceStatus(orgId, status) {
  return asAdmin(async () => {
    if (!["active", "suspended"].includes(status)) return fail("Unknown status");
    const db = await getAdminDb();
    await db.update(organizations).set({ status }).where(eq(organizations.id, orgId));
    revalidatePath("/platform");
    return { ok: true, at: Date.now() };
  });
}

// Gives a workspace owner a new temporary password (they forgot theirs). They must replace it at sign-in.
export async function resetOwnerPassword(userId) {
  return asAdmin(async () => {
    const db = await getAdminDb();
    const password = temporaryPassword();
    const [owner] = await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), mustChangePassword: true, tokenVersion: sql`${users.tokenVersion} + 1`, failedLogins: 0, lockedUntil: null })
      .where(and(eq(users.id, userId), eq(users.role, "owner")))
      .returning({ name: users.name, email: users.email, orgId: users.orgId });
    if (!owner) return fail("Owner not found");
    const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, owner.orgId));
    return {
      ok: true,
      at: Date.now(),
      credentials: { workspace: org.name, name: owner.name, email: owner.email, password, signInUrl: await customerSignInUrl() },
    };
  });
}

// ---------- Lasan team ----------

const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(120),
  email: z.email("Enter a valid email").transform((e) => e.toLowerCase()),
  role: z.enum(["admin", "staff"]),
});

export async function addPlatformMember(_prev, formData) {
  return asAdmin(async () => {
    const me = await requirePlatformAdmin({ role: "admin" });
    const values = { name: formData.get("name"), email: String(formData.get("email") ?? "").trim(), role: formData.get("role") || "staff" };
    const parsed = memberSchema.safeParse(values);
    if (!parsed.success) return fail(parsed.error.issues[0].message, values);
    const db = await getAdminDb();
    const [taken] = await db.select({ id: platformAdmins.id }).from(platformAdmins).where(eq(platformAdmins.email, parsed.data.email));
    if (taken) return fail("That email already has a console account", values);
    const password = temporaryPassword();
    await db.insert(platformAdmins).values({
      ...parsed.data,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      createdBy: me.id,
    });
    revalidatePath("/platform/team");
    return { ok: true, at: Date.now(), credentials: { name: parsed.data.name, email: parsed.data.email, password } };
  });
}

// The console must always keep at least one active admin.
async function wouldLeaveNoAdmin(db, id) {
  const [{ n }] = await db
    .select({ n: sql`count(*)`.mapWith(Number) })
    .from(platformAdmins)
    .where(and(eq(platformAdmins.role, "admin"), eq(platformAdmins.isActive, true), ne(platformAdmins.id, id)));
  return n === 0;
}

export async function setPlatformMemberActive(id, active) {
  return asAdmin(async () => {
    const me = await requirePlatformAdmin({ role: "admin" });
    if (id === me.id) return fail("You can't deactivate yourself");
    const db = await getAdminDb();
    if (!active && (await wouldLeaveNoAdmin(db, id))) return fail("The console needs at least one active admin");
    await db
      .update(platformAdmins)
      .set({ isActive: active, tokenVersion: sql`${platformAdmins.tokenVersion} + 1`, failedLogins: 0, lockedUntil: null })
      .where(eq(platformAdmins.id, id));
    revalidatePath("/platform/team");
    return { ok: true, at: Date.now() };
  });
}

export async function setPlatformMemberRole(id, role) {
  return asAdmin(async () => {
    const me = await requirePlatformAdmin({ role: "admin" });
    if (!["admin", "staff"].includes(role)) return fail("Unknown role");
    if (id === me.id) return fail("Ask another admin to change your own role");
    const db = await getAdminDb();
    if (role === "staff" && (await wouldLeaveNoAdmin(db, id))) return fail("The console needs at least one active admin");
    await db.update(platformAdmins).set({ role, tokenVersion: sql`${platformAdmins.tokenVersion} + 1` }).where(eq(platformAdmins.id, id));
    revalidatePath("/platform/team");
    return { ok: true, at: Date.now() };
  });
}

export async function resetPlatformMemberPassword(id) {
  return asAdmin(async () => {
    const me = await requirePlatformAdmin({ role: "admin" });
    if (id === me.id) return fail("Change your own password from the account menu");
    const db = await getAdminDb();
    const password = temporaryPassword();
    const [member] = await db
      .update(platformAdmins)
      .set({
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        tokenVersion: sql`${platformAdmins.tokenVersion} + 1`,
        failedLogins: 0,
        lockedUntil: null,
      })
      .where(eq(platformAdmins.id, id))
      .returning({ name: platformAdmins.name, email: platformAdmins.email });
    if (!member) return fail("Account not found");
    revalidatePath("/platform/team");
    return { ok: true, at: Date.now(), credentials: { ...member, password } };
  });
}
