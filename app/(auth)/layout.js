import Link from "next/link";
import { BarChart3, Columns3, Gauge, KeyRound, ListTodo, Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-provider";
import { PoweredBy } from "@/components/powered-by";

// Left: what the product does, in plain enterprise terms (no invented figures). Right: the form.
const CAPABILITIES = [
  { icon: Columns3, title: "Pipeline management", text: "Every deal by stage, with weighted value and forecasts." },
  { icon: Gauge, title: "Lead scoring", text: "A 0–100 score on every lead so the team calls the right people first." },
  { icon: BarChart3, title: "Sales analytics", text: "Revenue trend, funnel, win rate and sources on one dashboard." },
  { icon: ListTodo, title: "Activities & follow-ups", text: "Calls, meetings and tasks in an overdue-first inbox." },
];

const TRUST = [
  { icon: Lock, label: "Encrypted connections" },
  { icon: KeyRound, label: "Protected sign-in" },
  { icon: ShieldCheck, label: "Separate workspaces" },
];

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(480px,1fr)]">
      <aside className="hidden flex-col justify-between bg-suite p-12 text-suite-ink lg:flex">
        <Link href="/" aria-label="Lasan Grow home" className="self-start">
          <Logo product="Sales" />
        </Link>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Sales CRM for your whole team</h2>
          <p className="mt-3 text-sm opacity-75">Leads, deals, contacts, companies and follow-ups in one workspace.</p>
          <ul className="mt-8 space-y-5">
            {CAPABILITIES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-sm opacity-70">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-suite-line pt-6 text-xs opacity-75">
          {TRUST.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5">
              <Icon size={13} /> {label}
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex flex-col bg-bg px-4 sm:px-10">
        <header className="flex h-16 items-center justify-between">
          <Link href="/" aria-label="Lasan Grow home" className="lg:invisible">
            <Logo />
          </Link>
          <ThemeToggle withLabel />
        </header>
        <main className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[420px] rounded-md border border-line bg-surface p-6 shadow-card sm:p-9">{children}</div>
        </main>
        <PoweredBy />
      </div>
    </div>
  );
}
