import Link from "next/link";
import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { getFormOptions } from "@/lib/queries/options";
import { fullName } from "@/lib/format";
import { PageHeader, cx } from "@/components/ui";
import { TaskBoard, NewTaskButton } from "./task-list";

export const metadata = { title: "Tasks" };

const { activities, deals, contacts } = schema;
const TYPES = [
  ["all", "All"],
  ["call", "Calls"],
  ["meeting", "Meetings"],
  ["email", "Emails"],
  ["task", "To-dos"],
];

export default async function TasksPage({ searchParams }) {
  const { org } = await requireUser();
  const params = await searchParams;
  const type = TYPES.some(([t]) => t === params.type) ? params.type : "all";
  const db = await getDb();

  const base = [eq(activities.orgId, org.id), ne(activities.type, "note")];
  if (type !== "all") base.push(eq(activities.type, type));
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const select = {
    id: activities.id,
    type: activities.type,
    subject: activities.subject,
    notes: activities.notes,
    dueAt: activities.dueAt,
    done: activities.done,
    completedAt: activities.completedAt,
    dealId: activities.dealId,
    dealTitle: deals.title,
    contactId: activities.contactId,
    contactFirst: contacts.firstName,
    contactLast: contacts.lastName,
  };
  const withJoins = (q) =>
    q.leftJoin(deals, eq(activities.dealId, deals.id)).leftJoin(contacts, eq(activities.contactId, contacts.id));

  const [open, done, options, openDeals] = await Promise.all([
    withJoins(db.select(select).from(activities))
      .where(and(...base, eq(activities.done, false)))
      .orderBy(asc(activities.dueAt))
      .limit(300),
    withJoins(db.select(select).from(activities))
      .where(and(...base, eq(activities.done, true), gte(activities.completedAt, weekAgo)))
      .orderBy(desc(activities.completedAt))
      .limit(50),
    getFormOptions(org.id),
    db
      .select({ id: deals.id, title: deals.title })
      .from(deals)
      .where(and(eq(deals.orgId, org.id), eq(deals.status, "open")))
      .orderBy(asc(deals.title)),
  ]);

  const shape = (r) => ({
    ...r,
    contactName: r.contactFirst ? fullName({ firstName: r.contactFirst, lastName: r.contactLast }) : null,
  });

  return (
    <>
      <PageHeader title="Tasks" description="Your follow-ups, overdue first. Tick them off as you go.">
        <NewTaskButton
          autoOpen={params.new === "1"}
          deals={openDeals}
          contacts={options.contacts.map((c) => ({ id: c.id, name: c.name }))}
        />
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-1">
        {TYPES.map(([t, label]) => (
          <Link
            key={t}
            href={t === "all" ? "/tasks" : `/tasks?type=${t}`}
            className={cx("rounded-lg px-3 py-1.5 text-[13px] transition-colors", type === t ? "bg-ink text-inverse" : "text-ink-2 hover:bg-surface-2")}
          >
            {label}
          </Link>
        ))}
      </div>

      <TaskBoard open={open.map(shape)} done={done.map(shape)} />
    </>
  );
}
