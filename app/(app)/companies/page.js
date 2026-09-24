import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { Building2, MapPin, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { money } from "@/lib/format";
import { matchWords } from "@/lib/search";
import { Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { RecordFormButton } from "@/components/record-forms";
import { LiveSearch } from "@/components/live-search";

export const metadata = { title: "Companies" };

const { companies, contacts, deals } = schema;

const SORTS = [
  ["pipeline", "Open pipeline"],
  ["won", "Revenue won"],
  ["name", "Name"],
];

function Monogram({ name }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 font-display text-lg font-semibold">
      {name.trim()[0]?.toUpperCase()}
    </span>
  );
}

export default async function CompaniesPage({ searchParams }) {
  const { org } = await requireUser();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const sort = SORTS.some(([s]) => s === params.sort) ? params.sort : "pipeline";
  const db = await getDb();

  const filters = [eq(companies.orgId, org.id)];
  if (q) filters.push(matchWords(q, [companies.name, companies.domain, companies.industry, companies.city]));

  // Drizzle drops the table prefix on single-table selects, so the outer row must be referenced explicitly.
  const companyRef = sql.raw(`"companies"."id"`);
  const openValue = sql`(select coalesce(sum(${deals.value}), 0) from ${deals} where ${deals.companyId} = ${companyRef} and ${deals.status} = 'open')`.mapWith(Number);
  const wonValue = sql`(select coalesce(sum(${deals.value}), 0) from ${deals} where ${deals.companyId} = ${companyRef} and ${deals.status} = 'won')`.mapWith(Number);

  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      industry: companies.industry,
      size: companies.size,
      city: companies.city,
      people: sql`(select count(*) from ${contacts} where ${contacts.companyId} = ${companyRef})`.mapWith(Number),
      openValue,
      wonValue,
    })
    .from(companies)
    .where(and(...filters))
    .orderBy(sort === "name" ? asc(companies.name) : sort === "won" ? sql`${wonValue} desc` : sql`${openValue} desc`)
    .limit(300);

  const qs = (patch) => {
    const p = new URLSearchParams({ ...(q && { q }), sort, ...patch });
    return `/companies?${p}`;
  };

  return (
    <>
      <PageHeader title="Companies" description={`${rows.length} accounts`}>
        <RecordFormButton kind="company" autoOpen={params.new === "1"} />
      </PageHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 text-[13px]">
          <span className="mr-1 text-ink-3">Sort</span>
          {SORTS.map(([s, label]) => (
            <Link
              key={s}
              href={qs({ sort: s })}
              className={cx("rounded-lg px-3 py-1.5 transition-colors", sort === s ? "bg-ink text-inverse" : "text-ink-2 hover:bg-surface-2")}
            >
              {label}
            </Link>
          ))}
        </div>
        <LiveSearch path="/companies" q={q} params={{ sort }} placeholder="Search companies…" className="w-full sm:w-72" />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Building2} title="No companies yet" description="Accounts appear here as you add them or convert leads." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Link
              key={c.id}
              href={`/companies/${c.id}`}
              data-card
              className="group rounded-2xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop"
            >
              <div className="flex items-start gap-3">
                <Monogram name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold group-hover:underline">{c.name}</p>
                  <p className="truncate text-xs text-ink-3">{c.domain ?? "no website"}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
                {c.industry && <span>{c.industry}</span>}
                {c.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {c.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={12} /> {c.people} {c.people === 1 ? "person" : "people"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-ink-3">Open</p>
                  <p className="font-display text-lg font-semibold tabular">{money(c.openValue, org.currency, { compact: true })}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-ink-3">Won</p>
                  <p className="font-display text-lg font-semibold tabular">{money(c.wonValue, org.currency, { compact: true })}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
