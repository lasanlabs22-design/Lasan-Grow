"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, number } from "@/lib/format";

const SERIES = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s7)"];
const ORDINAL = ["var(--q1)", "var(--q2)", "var(--q3)", "var(--q4)", "var(--q5)"];

function TooltipBox({ title, rows }) {
  return (
    <div className="min-w-40 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] shadow-pop">
      <p className="mb-1.5 font-medium">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2 text-ink-2">
            <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
            {r.label}
          </span>
          <span className="font-medium tabular">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-ink-2">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-2">
          <span className={i.line ? "h-0.5 w-3.5 rounded" : "h-2.5 w-2.5 rounded-[3px]"} style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/* Revenue trend: won (area) vs lost (line), one shared axis. */
export function RevenueChart({ data, currency }) {
  const compact = (v) => money(v, currency, { compact: true });
  return (
    <div>
      <div className="px-5 pb-2 pt-3">
        <Legend items={[{ label: "Won", color: "var(--s1)" }, { label: "Lost", color: "var(--s2)", line: true }]} />
      </div>
      <div className="h-[260px] pr-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, left: 8, right: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="wonFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--s1)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--s1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--axis)" }}
              tick={{ fill: "var(--ink-3)", fontSize: 12 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--ink-3)", fontSize: 12 }}
              tickFormatter={compact}
              width={64}
            />
            <Tooltip
              cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={label}
                    rows={[
                      { label: "Won", value: money(payload[0].payload.won, currency), color: "var(--s1)" },
                      { label: "Lost", value: money(payload[0].payload.lost, currency), color: "var(--s2)" },
                    ]}
                  />
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="won"
              stroke="var(--s1)"
              strokeWidth={2}
              fill="url(#wonFill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
            />
            <Line
              type="monotone"
              dataKey="lost"
              stroke="var(--s2)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* Tiny trend line for KPI tiles. */
export function Sparkline({ values, color = "var(--s1)" }) {
  const data = values.map((v, i) => ({ i, v }));
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="h-10 w-24" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#${gid})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Pipeline funnel: ordinal blue ramp, bars sized by deal value. */
export function StageFunnel({ stages, currency }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <ul className="space-y-3.5 px-5 pb-5 pt-4">
      {stages.map((s, i) => (
        <li key={s.id} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="font-medium">{s.name}</span>
            <span className="text-ink-3 tabular">
              <span className="font-medium text-ink">{money(s.value, currency, { compact: true })}</span> · {s.count} {s.count === 1 ? "deal" : "deals"} ·{s.probability}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(2, (s.value / max) * 100)}%`, background: ORDINAL[Math.min(i, ORDINAL.length - 1)] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Won revenue by source: donut + legend table (direct values, never color alone). */
export function SourceDonut({ data, currency }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((a, d) => a + d.value, 0);
  const shown = active != null ? data[active] : null;
  return (
    <div className="flex flex-col items-center gap-5 px-5 pb-5 pt-2 sm:flex-row sm:items-center">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="source"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={1.5}
              cornerRadius={4}
              stroke="var(--surface)"
              strokeWidth={2}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((d, i) => (
                <Cell key={d.source} fill={SERIES[i % SERIES.length]} opacity={active == null || active === i ? 1 : 0.35} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-ink-3">{shown ? shown.source : "Won total"}</span>
          <span className="font-display text-lg font-semibold tabular">
            {money(shown ? shown.value : total, currency, { compact: true })}
          </span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-[13px]">
        {data.map((d, i) => (
          <li
            key={d.source}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-surface-2"
          >
            <span className="flex items-center gap-2 text-ink-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SERIES[i % SERIES.length] }} />
              {d.source}
            </span>
            <span className="tabular">
              <span className="font-medium">{total ? Math.round((d.value / total) * 100) : 0}%</span>
              <span className="ml-2 text-ink-3">{number(d.count)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Single-series horizontal bars (e.g. lost reasons). */
export function BarList({ data, labelKey, valueKey, color = "var(--s2)" }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <ul className="space-y-2.5 px-5 pb-5 pt-4">
      {data.map((d) => (
        <li key={d[labelKey]} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[13px]">
          <span className="text-ink-2">{d[labelKey]}</span>
          <span className="font-medium tabular">{d[valueKey]}</span>
          <div className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${(d[valueKey] / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Activity heatmap: sequential single hue (blue), weeks as columns. */
const HEAT = ["var(--surface-2)", "#cde2fb", "#86b6ef", "#3987e5", "#1c5cab"];
const HEAT_DARK = ["var(--surface-2)", "#0d366b", "#184f95", "#2a78d6", "#6da7ec"];

export function Heatmap({ cells }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...cells.map((c) => c.count));
  const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const total = cells.reduce((a, c) => a + c.count, 0);

  return (
    <div className="px-5 pb-5 pt-4">
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {w.map((c) => (
              <div
                key={c.date}
                onMouseEnter={() => setHover(c)}
                onMouseLeave={() => setHover(null)}
                aria-label={`${c.date}: ${c.count} activities`}
                className="h-[14px] w-[14px] rounded-[3px] ring-inset transition-transform hover:scale-125 hover:ring-1 hover:ring-ink"
                style={{
                  "--heat-l": HEAT[level(c.count)],
                  "--heat-d": HEAT_DARK[level(c.count)],
                  opacity: c.future ? 0.3 : 1,
                }}
                data-heat
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px] text-ink-3">
        <span className="tabular">
          {hover
            ? `${new Date(hover.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${hover.count} completed`
            : `${number(total)} activities completed in 16 weeks`}
        </span>
        <span className="flex items-center gap-1">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} data-heat className="h-2.5 w-2.5 rounded-[2px]" style={{ "--heat-l": HEAT[l], "--heat-d": HEAT_DARK[l] }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
