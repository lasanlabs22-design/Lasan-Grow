import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { ArrowLeft, Globe, MapPin, Users, Factory, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { fullName, money } from "@/lib/format";
import { Avatar, Badge, Card, CardHeader, LinkButton } from "@/components/ui";
import { ActivityComposer, ActivityTimeline } from "@/components/activity";
import { RecordFormButton, DeleteRecordButton } from "@/components/record-forms";
import { RelatedDeals } from "@/components/related-deals";

export const metadata = { title: "Company" };

const { companies, contacts, deals, stages, activities } = schema;

export default async function CompanyPage({ params }) {
  const { id } = await params;
  const { org } = await requireUser();
  const db = await getDb();

  const [company] = await db
    .select()
    .from(companies)
    .where(and(eq(companies.id, id), eq(companies.orgId, org.id)))
    .limit(1)
    .catch(() => []);
  if (!company) notFound();

  const [people, dealRows, companyOptions] = await Promise.all([
    db.select().from(contacts).where(and(eq(contacts.companyId, id), eq(contacts.orgId, org.id))).orderBy(asc(contacts.firstName)),
    db
      .select({
        id: deals.id,
        title: deals.title,
        value: deals.value,
        status: deals.status,
        expectedClose: deals.expectedClose,
        closedAt: deals.closedAt,
        stageName: stages.name,
      })
      .from(deals)
      .innerJoin(stages, eq(deals.stageId, stages.id))
      .where(and(eq(deals.companyId, id), eq(deals.orgId, org.id)))
      .orderBy(desc(deals.createdAt)),
    db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.orgId, org.id)).orderBy(asc(companies.name)),
  ]);

  // Account activity rolls up everything logged on the company, its people and its deals.
  const related = [eq(activities.companyId, id)];
  if (people.length) related.push(inArray(activities.contactId, people.map((p) => p.id)));
  if (dealRows.length) related.push(inArray(activities.dealId, dealRows.map((d) => d.id)));
  const peopleById = Object.fromEntries(people.map((p) => [p.id, fullName(p)]));
  const timeline = (
    await db
      .select()
      .from(activities)
      .where(and(eq(activities.orgId, org.id), or(...related)))
      .orderBy(desc(activities.dueAt))
      .limit(60)
  ).map((a) => ({ ...a, context: a.contactId ? peopleById[a.contactId] : undefined }));

  const sum = (s) => dealRows.filter((d) => d.status === s).reduce((a, d) => a + d.value, 0);
  const closed = dealRows.filter((d) => d.status !== "open").length;
  const winRate = closed ? Math.round((dealRows.filter((d) => d.status === "won").length / closed) * 100) : null;
  const stats = [
    ["Open pipeline", money(sum("open"), org.currency, { compact: true })],
    ["Revenue won", money(sum("won"), org.currency, { compact: true })],
    ["Win rate", winRate == null ? "—" : `${winRate}%`],
    ["People", people.length],
  ];

  return (
    <>
      <Link href="/companies" className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
        <ArrowLeft size={15} /> Companies
      </Link>

      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink font-display text-3xl font-semibold text-inverse">
            {company.name.trim()[0]?.toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">{company.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
              {company.domain && (
                <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-ink">
                  <Globe size={14} /> {company.domain}
                </a>
              )}
              {company.industry && (
                <span className="flex items-center gap-1">
                  <Factory size={14} /> {company.industry}
                </span>
              )}
              {company.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {company.city}
                </span>
              )}
              {company.size && (
                <span className="flex items-center gap-1">
                  <Users size={14} /> {company.size} employees
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href="/deals?new=1" variant="secondary">
            <Plus size={15} /> Deal
          </LinkButton>
          <RecordFormButton kind="company" record={company} iconOnly />
          <DeleteRecordButton kind="company" id={company.id} name={company.name} />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-ink-3">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="People"
              subtitle={`${people.length} contacts`}
              action={<RecordFormButton kind="contact" companies={companyOptions} defaultCompanyId={company.id} />}
            />
            <ul className="mt-3 divide-y divide-line">
              {people.length === 0 && <li className="px-5 py-8 text-center text-sm text-ink-3">No contacts at this company yet.</li>}
              {people.map((p) => (
                <li key={p.id}>
                  <Link href={`/contacts/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
                    <Avatar name={fullName(p)} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{fullName(p)}</p>
                      <p className="truncate text-xs text-ink-3">{[p.title, p.email].filter(Boolean).join(" · ")}</p>
                    </div>
                    {p.title && /ceo|founder|vp|head/i.test(p.title) && <Badge tone="outline">Decision maker</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Deals" subtitle={`${dealRows.length} total`} />
            <div className="mt-3">
              <RelatedDeals deals={dealRows} currency={org.currency} />
            </div>
          </Card>
        </div>
        <Card>
          <CardHeader title="Account activity" subtitle="Everything logged across this company" />
          <div className="space-y-5 p-5">
            <ActivityComposer links={{ companyId: company.id }} />
            <ActivityTimeline items={timeline} emptyText="No activity on this account yet." />
          </div>
        </Card>
      </div>
    </>
  );
}
