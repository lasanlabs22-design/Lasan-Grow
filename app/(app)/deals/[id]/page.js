import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, Building2, CalendarDays, Mail, Megaphone, Phone, User, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getFormOptions } from "@/lib/queries/options";
import { money, longDate, fullName, relativeTime } from "@/lib/format";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui";
import { ActivityComposer, ActivityTimeline } from "@/components/activity";
import { DealActions, StageStepper } from "./deal-controls";

const { deals, stages, contacts, companies, users, activities } = schema;

export const metadata = { title: "Deal" };

function Detail({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-ink-3" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-3">{label}</p>
        <div className="truncate text-sm">{children ?? <span className="text-ink-3">—</span>}</div>
      </div>
    </div>
  );
}

export default async function DealPage({ params }) {
  const { id } = await params;
  const { org } = await requireUser();
  const db = await getDb();

  const [row] = await db
    .select({ deal: deals, stage: stages, contact: contacts, company: companies, owner: { name: users.name } })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(users, eq(deals.ownerId, users.id))
    .where(and(eq(deals.id, id), eq(deals.orgId, org.id)))
    .limit(1)
    .catch(() => []);
  if (!row) notFound();

  const [timeline, options] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(and(eq(activities.dealId, id), eq(activities.orgId, org.id)))
      .orderBy(desc(activities.dueAt)),
    getFormOptions(org.id),
  ]);

  const { deal, stage, contact, company, owner } = row;
  const cur = org.currency;
  const weighted = deal.status === "open" ? Math.round((deal.value * stage.probability) / 100) : deal.status === "won" ? deal.value : 0;
  const openCount = timeline.filter((a) => !a.done).length;

  return (
    <>
      <Link href="/deals" className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
        <ArrowLeft size={15} /> Deals
      </Link>

      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={deal.status === "won" ? "good" : deal.status === "lost" ? "bad" : "outline"}>
              {deal.status === "open" ? stage.name : deal.status === "won" ? "Won" : "Lost"}
            </Badge>
            {company && <span className="text-sm text-ink-3">{company.name}</span>}
          </div>
          <h1 className="mt-2 font-display text-[30px] font-semibold leading-tight tracking-tight">{deal.title}</h1>
          <p className="mt-2 font-display text-3xl font-semibold tabular">
            {money(deal.value, cur)}
            <span className="ml-3 text-sm font-normal text-ink-3">
              {deal.status === "open" ? `${money(weighted, cur, { compact: true })} weighted at ${stage.probability}%` : deal.status === "won" ? `closed ${longDate(deal.closedAt)}` : `lost ${longDate(deal.closedAt)} · ${deal.lostReason ?? "no reason"}`}
            </span>
          </p>
        </div>
        <DealActions deal={deal} options={options} />
      </div>

      <StageStepper key={`${deal.stageId}-${deal.status}`} deal={{ id: deal.id, stageId: deal.stageId, status: deal.status, title: deal.title }} stages={options.stages} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Details" />
            <div className="divide-y divide-line px-5 pb-3 pt-2">
              <Detail icon={User} label="Contact">
                {contact && (
                  <Link href={`/contacts/${contact.id}`} className="flex items-center gap-2 hover:underline">
                    <Avatar name={fullName(contact)} size={20} /> {fullName(contact)}
                  </Link>
                )}
              </Detail>
              {contact?.email && (
                <Detail icon={Mail} label="Email">
                  <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                </Detail>
              )}
              {contact?.phone && (
                <Detail icon={Phone} label="Phone">
                  <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                </Detail>
              )}
              <Detail icon={Building2} label="Company">
                {company && <Link href={`/companies/${company.id}`} className="hover:underline">{company.name}</Link>}
              </Detail>
              <Detail icon={CalendarDays} label="Expected close">{deal.expectedClose && longDate(deal.expectedClose)}</Detail>
              <Detail icon={Megaphone} label="Source">{deal.source}</Detail>
              <Detail icon={User} label="Owner">{owner?.name}</Detail>
              <Detail icon={Clock} label="Created">
                {longDate(deal.createdAt)}
                <span suppressHydrationWarning className="ml-1.5 text-ink-3">
                  {Date.now() - new Date(deal.createdAt).getTime() < 30 * 86400000 && `· ${relativeTime(deal.createdAt)}`}
                </span>
              </Detail>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Activity" subtitle={`${timeline.length} entries · ${openCount} open`} />
          <div className="space-y-5 p-5">
            <ActivityComposer links={{ dealId: deal.id, contactId: deal.contactId, companyId: deal.companyId }} />
            <ActivityTimeline items={timeline} emptyText="Nothing logged yet. Start with a note or schedule the next step." />
          </div>
        </Card>
      </div>
    </>
  );
}
