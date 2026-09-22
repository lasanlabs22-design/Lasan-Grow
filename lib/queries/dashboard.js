import "server-only";
import { and, asc, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const { deals, stages, leads, activities, contacts, companies } = schema;

function monthStart(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

const sum = (col) => sql`coalesce(sum(${col}), 0)`.mapWith(Number);
const count = () => sql`count(*)`.mapWith(Number);

async function kpis(db, orgId) {
  const thisMonth = monthStart(0);
  const lastMonth = monthStart(-1);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

  const [[wonNow], [wonPrev], [pipeline], [weighted], closed, [leadsNow], [leadsPrev]] = await Promise.all([
    db.select({ v: sum(deals.value), n: count() }).from(deals)
      .where(and(eq(deals.orgId, orgId), eq(deals.status, "won"), gte(deals.closedAt, thisMonth))),
    db.select({ v: sum(deals.value), n: count() }).from(deals)
      .where(and(eq(deals.orgId, orgId), eq(deals.status, "won"), gte(deals.closedAt, lastMonth), lt(deals.closedAt, thisMonth))),
    db.select({ v: sum(deals.value), n: count() }).from(deals)
      .where(and(eq(deals.orgId, orgId), eq(deals.status, "open"))),
    db.select({ v: sql`coalesce(sum(${deals.value} * ${stages.probability} / 100.0), 0)`.mapWith(Number) })
      .from(deals).innerJoin(stages, eq(deals.stageId, stages.id))
      .where(and(eq(deals.orgId, orgId), eq(deals.status, "open"))),
    db.select({ status: deals.status, n: count(), v: sum(deals.value) }).from(deals)
      .where(and(eq(deals.orgId, orgId), isNotNull(deals.closedAt), gte(deals.closedAt, ninetyDaysAgo)))
      .groupBy(deals.status),
    db.select({ n: count() }).from(leads).where(and(eq(leads.orgId, orgId), gte(leads.createdAt, thisMonth))),
    db.select({ n: count() }).from(leads)
      .where(and(eq(leads.orgId, orgId), gte(leads.createdAt, lastMonth), lt(leads.createdAt, thisMonth))),
  ]);

  const won90 = closed.find((r) => r.status === "won") ?? { n: 0, v: 0 };
  const lost90 = closed.find((r) => r.status === "lost") ?? { n: 0, v: 0 };
  const change = (a, b) => (b ? ((a - b) / b) * 100 : null);

  return {
    wonThisMonth: wonNow.v,
    wonThisMonthCount: wonNow.n,
    wonChange: change(wonNow.v, wonPrev.v),
    pipelineValue: pipeline.v,
    pipelineCount: pipeline.n,
    weightedPipeline: Math.round(weighted.v),
    winRate: won90.n + lost90.n ? (won90.n / (won90.n + lost90.n)) * 100 : 0,
    closed90: won90.n + lost90.n,
    avgDealSize: won90.n ? Math.round(won90.v / won90.n) : 0,
    newLeads: leadsNow.n,
    leadsChange: change(leadsNow.n, leadsPrev.n),
  };
}

async function revenueTrend(db, orgId) {
  const from = monthStart(-11);
  const rows = await db
    .select({
      month: sql`to_char(date_trunc('month', ${deals.closedAt}), 'YYYY-MM')`,
      won: sql`coalesce(sum(${deals.value}) filter (where ${deals.status} = 'won'), 0)`.mapWith(Number),
      lost: sql`coalesce(sum(${deals.value}) filter (where ${deals.status} = 'lost'), 0)`.mapWith(Number),
    })
    .from(deals)
    .where(and(eq(deals.orgId, orgId), isNotNull(deals.closedAt), gte(deals.closedAt, from)))
    .groupBy(sql`1`);

  const byMonth = Object.fromEntries(rows.map((r) => [r.month, r]));
  return Array.from({ length: 12 }, (_, i) => {
    const d = monthStart(-11 + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: d.toLocaleDateString("en-US", { month: "short" }),
      won: byMonth[key]?.won ?? 0,
      lost: byMonth[key]?.lost ?? 0,
    };
  });
}

async function pipelineByStage(db, orgId) {
  const rows = await db
    .select({
      id: stages.id,
      name: stages.name,
      probability: stages.probability,
      position: stages.position,
      count: sql`count(${deals.id})`.mapWith(Number),
      value: sql`coalesce(sum(${deals.value}), 0)`.mapWith(Number),
    })
    .from(stages)
    .leftJoin(deals, and(eq(deals.stageId, stages.id), eq(deals.status, "open")))
    .where(and(eq(stages.orgId, orgId), eq(stages.kind, "open")))
    .groupBy(stages.id)
    .orderBy(asc(stages.position));
  return rows;
}

async function sourceMix(db, orgId) {
  const rows = await db
    .select({ source: sql`coalesce(${deals.source}, 'Unknown')`, value: sum(deals.value), count: count() })
    .from(deals)
    .where(and(eq(deals.orgId, orgId), eq(deals.status, "won")))
    .groupBy(sql`1`)
    .orderBy(desc(sql`2`));
  // Top 5 + Other keeps the categorical palette within its validated range.
  const top = rows.slice(0, 5);
  const rest = rows.slice(5);
  if (rest.length) {
    top.push({
      source: "Other",
      value: rest.reduce((a, r) => a + r.value, 0),
      count: rest.reduce((a, r) => a + r.count, 0),
    });
  }
  return top;
}

async function lostReasons(db, orgId) {
  return db
    .select({ reason: sql`coalesce(${deals.lostReason}, 'Unspecified')`, count: count() })
    .from(deals)
    .where(and(eq(deals.orgId, orgId), eq(deals.status, "lost")))
    .groupBy(sql`1`)
    .orderBy(desc(sql`2`))
    .limit(6);
}

async function activityHeatmap(db, orgId) {
  const weeks = 16;
  // Work in UTC days so grid keys line up with Postgres's to_char output.
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay() - (weeks - 1) * 7); // Sunday, `weeks` ago
  const rows = await db
    .select({ day: sql`to_char(${activities.completedAt}, 'YYYY-MM-DD')`, n: count() })
    .from(activities)
    .where(and(eq(activities.orgId, orgId), eq(activities.done, true), gte(activities.completedAt, start)))
    .groupBy(sql`1`);
  const byDay = Object.fromEntries(rows.map((r) => [r.day, r.n]));
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: byDay[key] ?? 0, future: d > new Date() });
  }
  return cells;
}

async function upcomingTasks(db, orgId) {
  return db
    .select({
      id: activities.id,
      subject: activities.subject,
      type: activities.type,
      dueAt: activities.dueAt,
      dealId: activities.dealId,
      dealTitle: deals.title,
    })
    .from(activities)
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .where(and(eq(activities.orgId, orgId), eq(activities.done, false)))
    .orderBy(asc(activities.dueAt))
    .limit(6);
}

async function topDeals(db, orgId) {
  return db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      expectedClose: deals.expectedClose,
      stageName: stages.name,
      probability: stages.probability,
      companyName: companies.name,
      contactFirst: contacts.firstName,
      contactLast: contacts.lastName,
    })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(and(eq(deals.orgId, orgId), eq(deals.status, "open")))
    .orderBy(desc(deals.value))
    .limit(5);
}

export async function getDashboard(orgId) {
  const db = await getDb();
  const [k, trend, stagesData, sources, reasons, heatmap, tasks, top] = await Promise.all([
    kpis(db, orgId),
    revenueTrend(db, orgId),
    pipelineByStage(db, orgId),
    sourceMix(db, orgId),
    lostReasons(db, orgId),
    activityHeatmap(db, orgId),
    upcomingTasks(db, orgId),
    topDeals(db, orgId),
  ]);
  return { kpis: k, trend, stages: stagesData, sources, reasons, heatmap, tasks, top };
}
