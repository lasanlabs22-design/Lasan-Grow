import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Columns3,
  Gauge,
  ListTodo,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-provider";
import { PoweredBy } from "@/components/powered-by";
import { LinkButton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

const FEATURES = [
  { icon: Columns3, title: "Pipeline you can feel", body: "Drag deals across stages. Weighted value and stage totals update instantly." },
  { icon: Gauge, title: "Lead scoring built in", body: "Every lead gets a 0–100 score so reps know who to call first." },
  { icon: BarChart3, title: "Charts that answer questions", body: "Revenue trend, funnel conversion, win rate and source mix — no report builder needed." },
  { icon: Users, title: "Contacts & companies", body: "One timeline per person and account, with every deal and follow-up attached." },
  { icon: ListTodo, title: "Follow-ups that happen", body: "Calls, meetings and tasks with an overdue-first inbox. Nothing slips." },
  { icon: Zap, title: "Fast, everywhere", body: "Keyboard-first, light & dark themes, and it loads before you finish blinking." },
];

const COMPARE = [
  ["Set up in minutes, not weeks", true],
  ["Clean UI with light & dark mode", true],
  ["Forecasts & charts out of the box", true],
  ["No per-module upsells", true],
];

const PREVIEW_STAGES = [
  { name: "Qualified", cards: [["Pilot — Orbit Health", "₹1.2L"], ["Renewal — Terra Foods", "₹80K"]] },
  { name: "Proposal", cards: [["Enterprise — Nimbus", "₹6.4L"], ["Expansion — Lumen", "₹2.1L"]] },
  { name: "Negotiation", cards: [["Annual — Vertex Motors", "₹4.8L"]] },
];

export default async function Home() {
  const current = await getCurrentUser();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[720px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />

      <header className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <ThemeToggle className="mr-1" />
          {current ? (
            <LinkButton href="/dashboard" size="sm">
              Open dashboard <ArrowRight size={14} />
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                Sign in
              </LinkButton>
              <LinkButton href="/signup" size="sm">
                Get started
              </LinkButton>
            </>
          )}
        </nav>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2 shadow-card">
            <Sparkles size={13} /> The sales CRM that gets out of your way
          </span>
          <h1 className="mt-7 font-display text-[clamp(2.6rem,7vw,5.2rem)] font-semibold leading-[0.98] tracking-tight">
            Grow revenue,
            <br />
            <span className="font-serif font-normal italic text-ink-2">not spreadsheets.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            Lasan Grow brings leads, deals, contacts and follow-ups into one calm, fast workspace — with the
            insight to know exactly where your next win is coming from.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href={current ? "/dashboard" : "/signup"} size="lg" className="rounded-full px-6">
              {current ? "Go to dashboard" : "Start free"} <ArrowRight size={16} />
            </LinkButton>
            {!current && (
              <LinkButton href="/login" size="lg" variant="secondary" className="rounded-full px-6">
                I have an account
              </LinkButton>
            )}
          </div>
        </section>

        {/* Product preview */}
        <section className="mx-auto max-w-5xl px-4">
          <div className="rounded-[22px] border border-line bg-surface p-2 shadow-pop">
            <div className="rounded-2xl border border-line bg-bg p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
                <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
                <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {PREVIEW_STAGES.map((s) => (
                  <div key={s.name} className="rounded-xl bg-surface-2 p-3">
                    <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-ink-3">{s.name}</p>
                    <div className="space-y-2">
                      {s.cards.map(([t, v]) => (
                        <div key={t} className="rounded-lg border border-line bg-surface p-3 text-left shadow-card">
                          <p className="text-[13px] font-medium">{t}</p>
                          <p className="mt-1 font-mono text-xs text-ink-3">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <h2 className="max-w-lg font-display text-4xl font-semibold tracking-tight">
            Everything a sales team needs. <span className="text-ink-3">Nothing it doesn&apos;t.</span>
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-surface p-7">
                <Icon size={20} className="text-ink" />
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-3">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid items-center gap-10 rounded-3xl bg-ink p-8 text-inverse sm:p-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-4xl font-semibold tracking-tight">Built for focus.</h2>
              <p className="mt-3 max-w-md opacity-70">
                Suites bolt on dozens of modules. We obsess over the few that actually move revenue.
              </p>
              <Link
                href={current ? "/dashboard" : "/signup"}
                className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--inverse)] px-6 text-[15px] font-medium text-[var(--ink)] transition-opacity hover:opacity-90"
              >
                {current ? "Open Lasan Grow" : "Create your workspace"} <ArrowRight size={16} />
              </Link>
            </div>
            <ul className="space-y-3">
              {COMPARE.map(([label]) => (
                <li key={label} className="flex items-center gap-3 rounded-xl border border-current/10 px-4 py-3 text-[15px]">
                  <CheckCircle2 size={18} className="shrink-0 opacity-80" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <PoweredBy className="border-t border-line" />
    </div>
  );
}
