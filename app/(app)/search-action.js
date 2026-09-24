"use server";

import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { matchWords } from "@/lib/search";

// Best matches first: label starts with the query, then contains it, then word-by-word matches.
function rank(q, items) {
  const needle = q.toLowerCase();
  const score = (label) => {
    const l = label.toLowerCase();
    return l.startsWith(needle) ? 0 : l.includes(needle) ? 1 : 2;
  };
  return items.map((x, i) => ({ x, s: score(x.label), i })).sort((a, b) => a.s - b.s || a.i - b.i).map(({ x }) => x);
}

// Global search used by the ⌘K command palette.
export async function searchAll(query) {
  const { org } = await requireUser();
  const q = String(query ?? "").trim();
  if (q.length < 2) return [];

  const db = await getDb();
  const { deals, contacts, companies, leads } = schema;
  const LIMIT = 6;

  const [d, c, co, l] = await Promise.all([
    db
      .select({ id: deals.id, title: deals.title, status: deals.status, companyName: companies.name })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(and(eq(deals.orgId, org.id), matchWords(q, [deals.title, companies.name])))
      .limit(LIMIT),
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, companyName: companies.name })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(and(eq(contacts.orgId, org.id), matchWords(q, [contacts.firstName, contacts.lastName, contacts.email, companies.name])))
      .limit(LIMIT),
    db
      .select({ id: companies.id, name: companies.name, industry: companies.industry })
      .from(companies)
      .where(and(eq(companies.orgId, org.id), matchWords(q, [companies.name, companies.domain])))
      .limit(LIMIT),
    db
      .select({ id: leads.id, name: leads.name, companyName: leads.companyName })
      .from(leads)
      .where(and(eq(leads.orgId, org.id), matchWords(q, [leads.name, leads.companyName, leads.email])))
      .limit(LIMIT),
  ]);

  return [
    ...rank(q, d.map((x) => ({ type: "Deal", id: x.id, label: x.title, sub: x.status, href: `/deals/${x.id}` }))),
    ...rank(
      q,
      c.map((x) => ({
        type: "Contact",
        id: x.id,
        label: [x.firstName, x.lastName].filter(Boolean).join(" "),
        sub: x.companyName ?? x.email,
        href: `/contacts/${x.id}`,
      }))
    ),
    ...rank(q, co.map((x) => ({ type: "Company", id: x.id, label: x.name, sub: x.industry, href: `/companies/${x.id}` }))),
    ...rank(q, l.map((x) => ({ type: "Lead", id: x.id, label: x.name, sub: x.companyName, href: `/leads?open=${x.id}` }))),
  ];
}
