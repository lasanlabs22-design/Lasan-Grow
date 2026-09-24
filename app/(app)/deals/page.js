import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Columns3, List, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getFormOptions } from "@/lib/queries/options";
import { money, shortDate, longDate, fullName } from "@/lib/format";
import { matchWords } from "@/lib/search";
import { Badge, Card, EmptyState, LinkButton, PageHeader, Table, Td, Th, cx } from "@/components/ui";
import { LiveSearch } from "@/components/live-search";
import { DealsBoard } from "./board";

export const metadata = { title: "Deals" };

const { deals, stages, companies, contacts } = schema;

async function loadDeals(orgId, { status, q }) {
  const db = await getDb();
  const filters = [eq(deals.orgId, orgId)];
  if (status && status !== "all") filters.push(eq(deals.status, status));
  if (q) filters.push(matchWords(q, [deals.title, companies.name, contacts.firstName, contacts.lastName]));
  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      status: deals.status,
      stageId: deals.stageId,
      stageName: stages.name,
      probability: stages.probability,
      expectedClose: deals.expectedClose,
      closedAt: deals.closedAt,
      createdAt: deals.createdAt,
      companyName: companies.name,
      contactFirst: contacts.firstName,
      contactLast: contacts.lastName,
    })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(and(...filters))
    .orderBy(desc(deals.value))
    .limit(500);
  return rows.map((r) => ({
    ...r,
    contactName: r.contactFirst ? fullName({ firstName: r.contactFirst, lastName: r.contactLast }) : null,
  }));
}

function ViewToggle({ view }) {
  const item = (v, Icon, label) => (
    <Link
      href={v === "board" ? "/deals" : "/deals?view=list"}
      className={cx(
        "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors",
        view === v ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink"
      )}
    >
      <Icon size={14} /> {label}
    </Link>
  );
  return (
    <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
      {item("board", Columns3, "Board")}
      {item("list", List, "List")}
    </div>
  );
}

const STATUS_TABS = [
  ["open", "Open"],
  ["won", "Won"],
  ["lost", "Lost"],
  ["all", "All"],
];

export default async function DealsPage({ searchParams }) {
  const { org } = await requireUser();
  const params = await searchParams;
  const view = params.view === "list" ? "list" : "board";
  const status = view === "board" ? "open" : STATUS_TABS.some(([s]) => s === params.status) ? params.status : "open";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const [rows, options] = await Promise.all([loadDeals(org.id, { status, q: view === "list" ? q : "" }), getFormOptions(org.id)]);
  const total = rows.reduce((a, d) => a + d.value, 0);
  const weighted = rows.reduce((a, d) => a + (d.status === "open" ? (d.value * d.probability) / 100 : 0), 0);
  const cur = org.currency;

  return (
    <>
      <PageHeader
        title="Deals"
        description={`${rows.length} ${status === "all" ? "" : status} deals · ${money(total, cur, { compact: true })}${
          status === "open" ? ` · ${money(weighted, cur, { compact: true })} weighted` : ""
        }`}
      >
        <ViewToggle view={view} />
        <LinkButton href="/deals?new=1">
          <Plus size={15} /> New deal
        </LinkButton>
      </PageHeader>

      {view === "board" ? (
        <DealsBoard stages={options.stages} deals={rows} currency={cur} options={options} />
      ) : (
        <Card>
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1">
              {STATUS_TABS.map(([s, label]) => (
                <Link
                  key={s}
                  href={`/deals?view=list&status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className={cx(
                    "rounded-lg px-3 py-1.5 text-[13px] transition-colors",
                    status === s ? "bg-ink text-inverse" : "text-ink-2 hover:bg-surface-2"
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
            <LiveSearch path="/deals" q={q} params={{ view: "list", status }} placeholder="Search deals…" className="w-full sm:w-64" />
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={Columns3} title="No deals here" description="Try another filter, or create a new deal." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Deal</Th>
                  <Th>Stage</Th>
                  <Th className="text-right">Value</Th>
                  <Th>Contact</Th>
                  <Th>{status === "open" ? "Expected close" : "Closed"}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="group transition-colors hover:bg-surface-2">
                    <Td>
                      <Link href={`/deals/${d.id}`} className="font-medium group-hover:underline">
                        {d.title}
                      </Link>
                      {d.companyName && <p className="text-xs text-ink-3">{d.companyName}</p>}
                    </Td>
                    <Td>
                      <Badge tone={d.status === "won" ? "good" : d.status === "lost" ? "bad" : "neutral"}>{d.stageName}</Badge>
                    </Td>
                    <Td className="text-right font-medium tabular">{money(d.value, cur)}</Td>
                    <Td className="text-ink-2">{d.contactName ?? "—"}</Td>
                    <Td className="text-ink-2 tabular">{d.status === "open" ? shortDate(d.expectedClose) : longDate(d.closedAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </>
  );
}
