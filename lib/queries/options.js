import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// Select-box options shared by create/edit forms across modules.
export async function getFormOptions(orgId) {
  const db = await getDb();
  const { stages, contacts, companies, users } = schema;
  const [stageRows, contactRows, companyRows, userRows] = await Promise.all([
    db.select().from(stages).where(eq(stages.orgId, orgId)).orderBy(asc(stages.position)),
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, companyId: contacts.companyId })
      .from(contacts)
      .where(eq(contacts.orgId, orgId))
      .orderBy(asc(contacts.firstName)),
    db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.orgId, orgId)).orderBy(asc(companies.name)),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.orgId, orgId)).orderBy(asc(users.name)),
  ]);
  return {
    stages: stageRows,
    contacts: contactRows.map((c) => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" "), companyId: c.companyId })),
    companies: companyRows,
    users: userRows,
  };
}
