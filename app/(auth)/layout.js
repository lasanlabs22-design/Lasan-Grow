import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-provider";
import { PoweredBy } from "@/components/powered-by";

const BARS = [38, 52, 44, 61, 58, 72, 69, 84, 78, 92];

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 sm:px-10">
        <header className="flex h-16 items-center justify-between">
          <Link href="/" aria-label="Lasan Grow home">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
        <PoweredBy />
      </div>

      {/* Showcase panel */}
      <aside className="relative m-3 hidden overflow-hidden rounded-3xl border border-line bg-[#0b0b0b] p-12 dark:bg-[#161615] text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "radial-gradient(ellipse at 70% 30%, black 20%, transparent 75%)",
          }}
        />
        <div className="relative">
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">The sales CRM</p>
          <h2 className="mt-4 max-w-md font-display text-5xl font-semibold leading-[1.05] tracking-tight">
            Less admin.
            <br />
            <span className="font-serif text-6xl font-normal italic text-white/80">More closing.</span>
          </h2>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-white/50">Won this quarter</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular">₹48.6L</p>
            </div>
            <span className="rounded-full bg-[#0ca30c]/20 px-2 py-0.5 text-xs font-medium text-[#3ccf3c]">
              ▲ 24.8%
            </span>
          </div>
          <div className="mt-6 flex h-28 items-end gap-2" aria-hidden>
            {BARS.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-[4px]"
                style={{ height: `${h}%`, background: i === BARS.length - 1 ? "#3987e5" : "rgba(255,255,255,0.14)" }}
              />
            ))}
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-5 text-sm text-white/70">
            {["Drag-and-drop pipeline", "Lead scoring", "Revenue forecasts", "Tasks & follow-ups"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3987e5]" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
