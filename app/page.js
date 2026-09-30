import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CheckSquare,
  Columns3,
  Gauge,
  LayoutDashboard,
  ListTodo,
  Magnet,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-provider";
import { PoweredBy } from "@/components/powered-by";
import { LinkButton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

const FEATURES = [
  { icon: Columns3, title: "Pipeline management", body: "Drag deals across stages. Weighted value and stage totals update instantly." },
  { icon: Gauge, title: "Lead scoring", body: "Every lead gets a 0–100 score so reps know who to call first." },
  { icon: BarChart3, title: "Sales analytics", body: "Revenue trend, funnel conversion, win rate and source mix, with no report builder needed." },
  { icon: Users, title: "Contacts & accounts", body: "One timeline per person and company, with every deal and follow-up attached." },
  { icon: ListTodo, title: "Activities & follow-ups", body: "Calls, meetings and tasks in an overdue-first inbox, so nothing slips." },
  { icon: Zap, title: "Fast and keyboard-first", body: "Global search and quick create on Ctrl K, in a white or black theme." },
];

const ASSURANCES = [
  "Set up for your company by the Lasan team",
  "Each company's data kept in its own workspace",
  "Forecasts and charts out of the box",
  "No per-module upsells",
];

const PREVIEW_NAV = [
  [LayoutDashboard, "Dashboard", true],
  [Magnet, "Leads"],
  [Columns3, "Deals"],
  [Users, "Contacts"],
  [Building2, "Companies"],
  [CheckSquare, "Tasks"],
];

const PREVIEW_ROWS = [
  ["Enterprise plan — Nimbus Cloud", "Proposal sent", "₹6,40,000"],
  ["Annual license — Vertex Motors", "Negotiation", "₹4,80,000"],
  ["Expansion — Lumen Finance", "Demo scheduled", "₹2,10,000"],
  ["Pilot — Orbit Health", "Qualified", "₹1,20,000"],
];

// An abstract, static picture of the app: the suite bar, navigation and a deals list.
function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface shadow-pop" aria-hidden>
      <div className="flex h-9 items-center gap-2 bg-suite px-3 text-suite-ink">
        <LogoMark size={16} />
        <span className="text-xs font-semibold">Lasan Grow</span>
        <span className="text-xs opacity-60">| Sales</span>
        <span className="mx-auto hidden h-5 w-40 rounded-sm bg-white/15 sm:block" />
      </div>
      <div className="flex">
        <div className="hidden w-36 shrink-0 space-y-0.5 border-r border-line p-2 sm:block">
          {PREVIEW_NAV.map(([Icon, label, active]) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-[11px] ${active ? "bg-brand-soft font-semibold text-brand-ink" : "text-ink-2"}`}
            >
              <Icon size={12} /> {label}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 bg-bg p-3">
          <p className="text-[13px] font-semibold">Open deals</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[["Open pipeline", "₹14.5L"], ["Win rate", "58%"], ["Due today", "6"]].map(([k, v]) => (
              <div key={k} className="rounded-sm border border-line top-rule bg-surface p-2">
                <p className="text-[10px] text-ink-3">{k}</p>
                <p className="text-sm font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 overflow-hidden rounded-sm border border-line bg-surface text-[11px]">
            <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-line-strong bg-surface-2 px-2 py-1.5 font-semibold text-ink-2 sm:grid-cols-[1fr_7rem_5rem]">
              <span>Deal</span>
              <span className="hidden sm:block">Stage</span>
              <span className="text-right">Value</span>
            </div>
            {PREVIEW_ROWS.map(([deal, stage, value]) => (
              <div key={deal} className="grid grid-cols-[1fr_auto] gap-2 border-b border-line px-2 py-1.5 last:border-0 sm:grid-cols-[1fr_7rem_5rem]">
                <span className="truncate text-brand-ink">{deal}</span>
                <span className="hidden text-ink-2 sm:block">{stage}</span>
                <span className="text-right tabular">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const current = await getCurrentUser();
  // On the public website (SITE_HOST) the app lives on its own address; locally it's this one.
  const app = process.env.APP_HOST ? `https://${process.env.APP_HOST}` : "";

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo product="Sales" />
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            {current ? (
              <LinkButton href={`${app}/dashboard`} size="sm">
                Open Lasan Grow <ArrowRight size={14} />
              </LinkButton>
            ) : (
              <>
                <LinkButton href={`${app}/login`} size="sm">
                  Sign in
                </LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-line bg-bg">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:py-20">
            <div>
              <p className="text-sm font-semibold text-brand-ink">Lasan Grow Sales</p>
              <h1 className="mt-3 text-[clamp(2rem,4.5vw,2.9rem)] font-semibold leading-[1.12]">
                The sales CRM for teams that close.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-2">
                Leads, deals, contacts, companies and follow-ups in one workspace, with the reporting to know
                where your next win is coming from.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <LinkButton href={`${app}${current ? "/dashboard" : "/login"}`} size="lg">
                  {current ? "Go to dashboard" : "Sign in to your workspace"} <ArrowRight size={16} />
                </LinkButton>
              </div>
              {!current && (
                <p className="mt-3 text-sm text-ink-3">Workspaces are set up for each company by the Lasan team.</p>
              )}
              <p className="mt-5 flex items-center gap-2 text-xs text-ink-3">
                <ShieldCheck size={14} className="text-good" /> Encrypted connections · Workspace-level data separation
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold">Everything a sales team needs</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-2">The modules that actually move revenue, done properly, not dozens bolted on.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-md border border-line bg-surface p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft">
                  <Icon size={18} className="text-brand" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Call to action */}
        <section className="bg-suite text-suite-ink">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold">Built for focus</h2>
              <p className="mt-2 max-w-md text-sm opacity-75">
                Suites bolt on dozens of modules. Lasan Grow concentrates on the few that close deals.
              </p>
              <LinkButton href={`${app}${current ? "/dashboard" : "/login"}`} size="lg" className="mt-6">
                {current ? "Open Lasan Grow" : "Sign in to your workspace"} <ArrowRight size={16} />
              </LinkButton>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {ASSURANCES.map((label) => (
                <li key={label} className="flex items-start gap-2.5 rounded-md border border-suite-line px-3.5 py-3 text-sm">
                  <CheckCircle2 size={17} className="mt-px shrink-0 text-[#7fbaf5]" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <PoweredBy className="border-t border-line bg-surface" />
    </div>
  );
}
