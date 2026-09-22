"use server";

import { and, eq, ilike, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

// Global search used by the ⌘K command palette.
export async function searchAll(query) {
  const { org } = await requireUser();
  const q = String(query ?? "").trim();
  if (q.length < 2) return [];

  const db = await getDb();
  const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
  const { deals, contacts, companies, leads } = schema;

  const [d, c, co, l] = await Promise.all([
    db
      .select({ id: deals.id, title: deals.title, value: deals.value, status: deals.status })
      .from(deals)
      .where(and(eq(deals.orgId, org.id), ilike(deals.title, like)))
      .limit(5),
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email })
      .from(contacts)
      .where(
        and(
          eq(contacts.orgId, org.id),
          or(ilike(contacts.firstName, like), ilike(contacts.lastName, like), ilike(contacts.email, like))
        )
      )
      .limit(5),
    db
      .select({ id: companies.id, name: companies.name, industry: companies.industry })
      .from(companies)
      .where(and(eq(companies.orgId, org.id), ilike(companies.name, like)))
      .limit(5),
    db
      .select({ id: leads.id, name: leads.name, companyName: leads.companyName })
      .from(leads)
      .where(and(eq(leads.orgId, org.id), or(ilike(leads.name, like), ilike(leads.companyName, like))))
      .limit(5),
  ]);

  return [
    ...d.map((x) => ({ type: "Deal", id: x.id, label: x.title, sub: x.status, href: `/deals/${x.id}` })),
    ...c.map((x) => ({
      type: "Contact",
      id: x.id,
      label: [x.firstName, x.lastName].filter(Boolean).join(" "),
      sub: x.email,
      href: `/contacts/${x.id}`,
    })),
    ...co.map((x) => ({ type: "Company", id: x.id, label: x.name, sub: x.industry, href: `/companies/${x.id}` })),
    ...l.map((x) => ({ type: "Lead", id: x.id, label: x.name, sub: x.companyName, href: `/leads?open=${x.id}` })),
  ];
}
