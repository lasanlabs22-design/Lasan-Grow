import Link from "next/link";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { money } from "@/lib/format";
import { matchWords } from "@/lib/search";
import { Card, PageHeader, cx } from "@/components/ui";
import { LiveSearch } from "@/components/live-search";
import { LeadsTable, NewLeadButton } from "./leads-table";

export const metadata = { title: "Leads" };

const { leads } = schema;

const TABS = [
  ["active", "Active"],
  ["new", "New"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["unqualified", "Unqualified"],
  ["converted", "Converted"],
];

export default async function LeadsPage({ searchParams }) {
  const { org } = await requireUser();
  const params = await searchParams;
  const status = TABS.some(([s]) => s === params.status) ? params.status : "active";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const db = await getDb();

  const filters = [eq(leads.orgId, org.id)];
  if (status === "active") filters.push(ne(leads.status, "converted"), ne(leads.status, "unqualified"));
  else filters.push(eq(leads.status, status));
  if (q) filters.push(matchWords(q, [leads.name, leads.companyName, leads.email, leads.phone]));

  const [rows, [stats]] = await Promise.all([
    db.select().from(leads).where(and(...filters)).orderBy(desc(leads.score), desc(leads.createdAt)).limit(300),
    db
      .select({
        total: sql`count(*)`.mapWith(Number),
        active: sql`count(*) filter (where ${leads.status} in ('new','contacted','qualified'))`.mapWith(Number),
        hot: sql`count(*) filter (where ${leads.score} >= 70 and ${leads.status} in ('new','contacted','qualified'))`.mapWith(Number),
        converted: sql`count(*) filter (where ${leads.status} = 'converted')`.mapWith(Number),
        pipeline: sql`coalesce(sum(${leads.estimatedValue}) filter (where ${leads.status} in ('new','contacted','qualified')), 0)`.mapWith(Number),
        week: sql`count(*) filter (where ${leads.createdAt} > now() - interval '7 days')`.mapWith(Number),
      })
      .from(leads)
      .where(eq(leads.orgId, org.id)),
  ]);

  const tiles = [
    ["Active leads", stats.active, `${stats.week} new this week`],
    ["Hot leads", stats.hot, "score 70 or higher"],
    ["Potential value", money(stats.pipeline, org.currency, { compact: true }), "across active leads"],
    ["Converted", stats.total ? `${Math.round((stats.converted / stats.total) * 100)}%` : "0%", `${stats.converted} of ${stats.total} leads`],
  ];

  return (
    <>
      <PageHeader title="Leads" description="Score, qualify and convert. Hottest leads float to the top.">
        <NewLeadButton autoOpen={params.new === "1"} />
      </PageHeader>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([label, value, sub]) => (
          <Card key={label} className="p-4">
            <p className="text-[13px] text-ink-3">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular">{value}</p>
            <p className="mt-0.5 text-xs text-ink-3">{sub}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {TABS.map(([s, label]) => (
              <Link
                key={s}
                href={`/leads?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                  status === s ? "bg-ink text-inverse" : "text-ink-2 hover:bg-surface-2"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
          <LiveSearch path="/leads" q={q} params={{ status }} placeholder="Search leads…" className="w-full lg:w-64" />
        </div>
        <LeadsTable leads={rows} currency={org.currency} openId={typeof params.open === "string" ? params.open : null} />
      </Card>
    </>
  );
}
