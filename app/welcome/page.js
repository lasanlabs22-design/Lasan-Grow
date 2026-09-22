import { and, eq, gte, lte, lt, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { WelcomeScreen } from "./welcome-screen";

export const metadata = { title: "Welcome" };

async function getWelcomeStats(orgId) {
  const db = await getDb();
  const { deals, activities } = schema;
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const weekAhead = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [[pipeline], [due], [closing]] = await Promise.all([
    db
      .select({ value: sql`coalesce(sum(${deals.value}), 0)`.mapWith(Number), count: sql`count(*)`.mapWith(Number) })
      .from(deals)
      .where(and(eq(deals.orgId, orgId), eq(deals.status, "open"))),
    db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(activities)
      .where(and(eq(activities.orgId, orgId), eq(activities.done, false), lt(activities.dueAt, endOfToday))),
    db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(deals)
      .where(
        and(
          eq(deals.orgId, orgId),
          eq(deals.status, "open"),
          gte(deals.expectedClose, today),
          lte(deals.expectedClose, weekAhead)
        )
      ),
  ]);

  return {
    pipelineValue: pipeline.value,
    openDeals: pipeline.count,
    tasksDue: due.count,
    closingThisWeek: closing.count,
  };
}

export default async function WelcomePage({ searchParams }) {
  const { user, org } = await requireUser();
  const [stats, params] = await Promise.all([getWelcomeStats(org.id), searchParams]);

  return (
    <WelcomeScreen
      firstName={user.name.split(" ")[0]}
      orgName={org.name}
      currency={org.currency}
      isNew={params?.new === "1"}
      stats={stats}
    />
  );
}
