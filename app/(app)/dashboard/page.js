import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Mail,
  Phone,
  Plus,
  Users,
  CheckSquare,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/queries/dashboard";
import { money, number, percent, shortDate, relativeTime } from "@/lib/format";
import { Badge, Card, CardHeader, LinkButton, EmptyState, cx } from "@/components/ui";
import { CountUp } from "@/components/client";
import { RevenueChart, StageFunnel, SourceDonut, BarList, Heatmap, Sparkline } from "@/components/charts";

export const metadata = { title: "Dashboard" };

function Delta({ value }) {
  if (value == null) return <span className="text-xs text-ink-3">no prior data</span>;
  const up = value >= 0;
  return (
    <span className={cx("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-good" : "text-bad")}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(value).toFixed(1)}%<span className="ml-1 font-normal text-ink-3">vs last month</span>
    </span>
  );
}

function Kpi({ label, children, footer, spark }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] text-ink-3">{label}</p>
        {spark}
      </div>
      <p className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-tight tabular">{children}</p>
      <div className="mt-2">{footer}</div>
    </Card>
  );
}

const TASK_ICONS = { call: Phone, email: Mail, meeting: Users, task: CheckSquare, note: CheckSquare };

export default async function DashboardPage() {
  const { user, org } = await requireUser();
  const d = await getDashboard(org.id);
  const { kpis: k } = d;
  const cur = org.currency;
  const hasData = k.pipelineCount + k.closed90 > 0 || d.trend.some((t) => t.won > 0);

  return (
    <>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-3">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="mt-1 font-display text-[30px] font-semibold leading-tight tracking-tight">
            Hey {user.name.split(" ")[0]}, <span className="font-serif font-normal italic text-ink-2">here&apos;s your pulse.</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/leads?new=1" variant="secondary">
            <Plus size={15} /> Lead
          </LinkButton>
          <LinkButton href="/deals?new=1">
            <Plus size={15} /> New deal
          </LinkButton>
        </div>
      </div>

      {!hasData ? (
        <Card>
          <EmptyState
            icon={CalendarClock}
            title="Your dashboard wakes up with your first deal"
            description="Add a deal or import leads and this page fills with revenue trends, funnel health and forecasts."
          >
            <LinkButton href="/deals?new=1">
              <Plus size={15} /> Create a deal
            </LinkButton>
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Won this month"
              spark={<Sparkline values={d.trend.map((t) => t.won)} />}
              footer={<Delta value={k.wonChange} />}
            >
              <CountUp value={k.wonThisMonth} currency={cur} compact />
            </Kpi>
            <Kpi
              label="Open pipeline"
              footer={
                <span className="text-xs text-ink-3">
                  <span className="font-medium text-ink-2">{money(k.weightedPipeline, cur, { compact: true })}</span> weighted · {k.pipelineCount} deals
                </span>
              }
            >
              <CountUp value={k.pipelineValue} currency={cur} compact />
            </Kpi>
            <Kpi
              label="Win rate · 90 days"
              footer={<span className="text-xs text-ink-3">{k.closed90} deals closed · avg {money(k.avgDealSize, cur, { compact: true })}</span>}
            >
              <CountUp value={k.winRate} decimals={1} suffix="%" />
            </Kpi>
            <Kpi label="New leads this month" footer={<Delta value={k.leadsChange} />}>
              <CountUp value={k.newLeads} />
            </Kpi>
          </div>

          {/* Revenue + funnel */}
          <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
            <Card>
              <CardHeader
                title="Revenue"
                subtitle="Closed value per month, last 12 months"
                action={<Badge tone="outline">{money(d.trend.reduce((a, t) => a + t.won, 0), cur, { compact: true })} won</Badge>}
              />
              <RevenueChart data={d.trend} currency={cur} />
            </Card>
            <Card>
              <CardHeader
                title="Pipeline by stage"
                subtitle="Open deal value in each stage"
                action={
                  <Link href="/deals" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
                    Board <ArrowRight size={13} />
                  </Link>
                }
              />
              <StageFunnel stages={d.stages} currency={cur} />
            </Card>
          </div>

          {/* Sources, lost reasons, heatmap */}
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader title="Where wins come from" subtitle="Won value by source" />
              {d.sources.length ? (
                <SourceDonut data={d.sources} currency={cur} />
              ) : (
                <p className="px-5 py-10 text-center text-sm text-ink-3">No won deals yet.</p>
              )}
            </Card>
            <Card>
              <CardHeader title="Why deals are lost" subtitle="All-time, by count" />
              {d.reasons.length ? (
                <BarList data={d.reasons} labelKey="reason" valueKey="count" />
              ) : (
                <p className="px-5 py-10 text-center text-sm text-ink-3">No lost deals. Keep it that way.</p>
              )}
            </Card>
            <Card className="lg:col-span-2 xl:col-span-1">
              <CardHeader title="Team activity" subtitle="Completed calls, meetings & tasks" />
              <Heatmap cells={d.heatmap} />
            </Card>
          </div>

          {/* Lists */}
          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Biggest open deals"
                subtitle="Where the quarter will be won"
                action={
                  <Link href="/deals?view=list" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
                    All deals <ArrowRight size={13} />
                  </Link>
                }
              />
              <ul className="mt-3 divide-y divide-line">
                {d.top.map((deal) => (
                  <li key={deal.id}>
                    <Link href={`/deals/${deal.id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{deal.title}</p>
                        <p className="truncate text-xs text-ink-3">
                          {deal.stageName} · closes {shortDate(deal.expectedClose)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular">{money(deal.value, cur, { compact: true })}</p>
                        <p className="text-xs text-ink-3 tabular">{percent(deal.probability)} likely</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader
                title="Up next"
                subtitle="Your open follow-ups, soonest first"
                action={
                  <Link href="/tasks" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
                    All tasks <ArrowRight size={13} />
                  </Link>
                }
              />
              <ul className="mt-3 divide-y divide-line">
                {d.tasks.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-3">Inbox zero. Nice.</li>}
                {d.tasks.map((t) => {
                  const Icon = TASK_ICONS[t.type] ?? CheckSquare;
                  const overdue = t.dueAt && new Date(t.dueAt) < new Date();
                  return (
                    <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                        <Icon size={15} className="text-ink-2" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.subject}</p>
                        {t.dealTitle && <p className="truncate text-xs text-ink-3">{t.dealTitle}</p>}
                      </div>
                      <Badge tone={overdue ? "bad" : "neutral"}>{overdue ? "Overdue · " : ""}{relativeTime(t.dueAt)}</Badge>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
          <p className="text-center text-xs text-ink-3">{number(k.pipelineCount)} open deals tracked in {org.name}</p>
        </div>
      )}
    </>
  );
}
