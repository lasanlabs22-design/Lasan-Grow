import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, Briefcase, Building2, Clock, Mail, Megaphone, Phone } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { fullName, longDate, money } from "@/lib/format";
import { Avatar, Card, CardHeader } from "@/components/ui";
import { ActivityComposer, ActivityTimeline } from "@/components/activity";
import { RecordFormButton, DeleteRecordButton } from "@/components/record-forms";
import { RelatedDeals } from "@/components/related-deals";

export const metadata = { title: "Contact" };

const { contacts, companies, deals, stages, activities } = schema;

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-ink-3" />
      <div className="min-w-0">
        <p className="text-xs text-ink-3">{label}</p>
        <div className="truncate text-sm">{children || <span className="text-ink-3">—</span>}</div>
      </div>
    </div>
  );
}

export default async function ContactPage({ params }) {
  const { id } = await params;
  const { org } = await requireUser();
  const db = await getDb();

  const [row] = await db
    .select({ contact: contacts, company: companies })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(and(eq(contacts.id, id), eq(contacts.orgId, org.id)))
    .limit(1)
    .catch(() => []);
  if (!row) notFound();
  const { contact, company } = row;

  const [dealRows, timeline, companyOptions] = await Promise.all([
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
      .where(and(eq(deals.contactId, id), eq(deals.orgId, org.id)))
      .orderBy(desc(deals.createdAt)),
    db.select().from(activities).where(and(eq(activities.contactId, id), eq(activities.orgId, org.id))).orderBy(desc(activities.dueAt)),
    db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.orgId, org.id)).orderBy(asc(companies.name)),
  ]);

  const name = fullName(contact);
  const won = dealRows.filter((d) => d.status === "won").reduce((a, d) => a + d.value, 0);
  const open = dealRows.filter((d) => d.status === "open").reduce((a, d) => a + d.value, 0);

  return (
    <>
      <Link href="/contacts" className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
        <ArrowLeft size={15} /> Contacts
      </Link>

      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} size={60} />
          <div>
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">{name}</h1>
            <p className="text-sm text-ink-3">
              {[contact.title, company?.name].filter(Boolean).join(" at ") || "No title yet"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-sm hover:bg-surface-2">
              <Mail size={15} /> Email
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-sm hover:bg-surface-2">
              <Phone size={15} /> Call
            </a>
          )}
          <RecordFormButton kind="contact" record={contact} companies={companyOptions} iconOnly />
          <DeleteRecordButton kind="contact" id={contact.id} name={name} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <Card className="grid grid-cols-2 divide-x divide-line">
            <div className="p-4">
              <p className="text-xs text-ink-3">Open pipeline</p>
              <p className="mt-1 font-display text-xl font-semibold tabular">{money(open, org.currency, { compact: true })}</p>
            </div>
            <div className="p-4">
              <p className="text-xs text-ink-3">Lifetime won</p>
              <p className="mt-1 font-display text-xl font-semibold tabular">{money(won, org.currency, { compact: true })}</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="About" />
            <div className="divide-y divide-line px-5 pb-3 pt-2">
              <Row icon={Mail} label="Email">{contact.email}</Row>
              <Row icon={Phone} label="Phone">{contact.phone}</Row>
              <Row icon={Briefcase} label="Title">{contact.title}</Row>
              <Row icon={Building2} label="Company">
                {company && <Link href={`/companies/${company.id}`} className="hover:underline">{company.name}</Link>}
              </Row>
              <Row icon={Megaphone} label="Source">{contact.source}</Row>
              <Row icon={Clock} label="Added">{longDate(contact.createdAt)}</Row>
            </div>
          </Card>
          <Card>
            <CardHeader title="Deals" subtitle={`${dealRows.length} total`} />
            <div className="mt-3">
              <RelatedDeals deals={dealRows} currency={org.currency} />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Activity" subtitle="Every call, meeting and note with this person" />
          <div className="space-y-5 p-5">
            <ActivityComposer links={{ contactId: contact.id, companyId: contact.companyId }} />
            <ActivityTimeline items={timeline} emptyText="No history yet. Log your first touchpoint." />
          </div>
        </Card>
      </div>
    </>
  );
}
