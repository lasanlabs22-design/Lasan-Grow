import Link from "next/link";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { Search, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { fullName, money, relativeTime } from "@/lib/format";
import { Avatar, Card, EmptyState, Input, PageHeader, Table, Td, Th } from "@/components/ui";
import { RecordFormButton } from "@/components/record-forms";

export const metadata = { title: "Contacts" };

const { contacts, companies, deals, activities } = schema;

export default async function ContactsPage({ searchParams }) {
  const { org } = await requireUser();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const db = await getDb();

  const filters = [eq(contacts.orgId, org.id)];
  if (q) {
    const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
    filters.push(
      or(ilike(contacts.firstName, like), ilike(contacts.lastName, like), ilike(contacts.email, like), ilike(companies.name, like))
    );
  }

  const [rows, companyOptions] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        title: contacts.title,
        companyId: contacts.companyId,
        companyName: companies.name,
        openDeals: sql`(select count(*) from ${deals} where ${deals.contactId} = ${contacts.id} and ${deals.status} = 'open')`.mapWith(Number),
        openValue: sql`(select coalesce(sum(${deals.value}), 0) from ${deals} where ${deals.contactId} = ${contacts.id} and ${deals.status} = 'open')`.mapWith(Number),
        lastActivity: sql`(select max(${activities.completedAt}) from ${activities} where ${activities.contactId} = ${contacts.id} and ${activities.done})`,
      })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(and(...filters))
      .orderBy(asc(contacts.firstName), asc(contacts.lastName))
      .limit(500),
    db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.orgId, org.id)).orderBy(asc(companies.name)),
  ]);

  return (
    <>
      <PageHeader title="Contacts" description={`${rows.length} ${q ? "matching" : ""} people you sell to`}>
        <RecordFormButton kind="contact" companies={companyOptions} autoOpen={params.new === "1"} />
      </PageHeader>

      <Card>
        <div className="flex items-center justify-end border-b border-line p-4">
          <form className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <Input name="q" defaultValue={q} placeholder="Search name, email or company…" className="h-9 pl-9" />
          </form>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title={q ? "No one matches that" : "No contacts yet"} description="Add the people you're talking to — or convert a lead." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Company</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th className="text-right">Open deals</Th>
                <Th>Last touch</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-surface-2">
                  <Td>
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-3">
                      <Avatar name={fullName(c)} size={32} />
                      <span>
                        <span className="block font-medium group-hover:underline">{fullName(c)}</span>
                        <span className="block text-xs text-ink-3">{c.title ?? "—"}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    {c.companyId ? (
                      <Link href={`/companies/${c.companyId}`} className="text-ink-2 hover:text-ink hover:underline">
                        {c.companyName}
                      </Link>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </Td>
                  <Td className="text-ink-2">{c.email ? <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a> : "—"}</Td>
                  <Td className="whitespace-nowrap text-ink-2 tabular">{c.phone ?? "—"}</Td>
                  <Td className="text-right tabular">
                    {c.openDeals ? (
                      <>
                        <span className="font-medium">{money(c.openValue, org.currency, { compact: true })}</span>
                        <span className="ml-1.5 text-xs text-ink-3">({c.openDeals})</span>
                      </>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-3">
                    <span suppressHydrationWarning>{c.lastActivity ? relativeTime(c.lastActivity) : "Never"}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
