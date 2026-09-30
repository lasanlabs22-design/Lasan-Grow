"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, CalendarClock, CircleDollarSign, Flag } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-provider";
import { PoweredBy } from "@/components/powered-by";
import { CountUp } from "@/components/client";

const subscribe = () => () => {};

function greetingFor(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const rise = (delay) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] },
});

function Stat({ icon: Icon, label, children, delay }) {
  return (
    <motion.div {...rise(delay)} className="rounded-md border border-line border-t-[3px] border-t-brand bg-surface p-4 text-left shadow-card">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
        <Icon size={15} className="text-brand" /> {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tabular">{children}</p>
    </motion.div>
  );
}

export function WelcomeScreen({ firstName, orgName, currency, isNew, stats }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const hello = greetingFor(mounted ? new Date().getHours() : 9);

  const enter = () => router.push("/dashboard");

  useEffect(() => {
    router.prefetch("/dashboard");
    const onKey = (e) => e.key === "Enter" && enter();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-12 items-center justify-between bg-suite px-4 text-suite-ink sm:px-6">
        <Logo size={26} product="Sales" />
        <ThemeToggle tone="suite" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <motion.p {...rise(0)} className="text-sm font-semibold text-brand-ink">
          {orgName}
        </motion.p>
        <motion.h1 {...rise(0.1)} className="mt-2 text-[clamp(1.9rem,4.5vw,2.75rem)] font-semibold leading-tight">
          {isNew ? `Welcome to Lasan Grow, ${firstName}` : `${hello}, ${firstName}`}
        </motion.h1>
        <motion.p {...rise(0.2)} className="mt-2 text-base text-ink-2">
          {isNew ? "Your workspace is ready. Here's where things stand." : "Here's where things stand today."}
        </motion.p>

        <div className="mt-9 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
          <Stat icon={CircleDollarSign} label={`Open pipeline · ${stats.openDeals} deals`} delay={0.35}>
            <CountUp value={stats.pipelineValue} currency={currency} compact duration={1200} />
          </Stat>
          <Stat icon={CalendarClock} label="Tasks due today" delay={0.45}>
            <CountUp value={stats.tasksDue} duration={900} />
          </Stat>
          <Stat icon={Flag} label="Closing this week" delay={0.55}>
            <CountUp value={stats.closingThisWeek} duration={900} />
          </Stat>
        </div>

        <motion.div {...rise(0.7)} className="mt-9 flex flex-col items-center gap-2.5">
          <button
            onClick={enter}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover"
          >
            Go to dashboard <ArrowRight size={16} />
          </button>
          <p className="text-xs text-ink-3">
            or press <kbd className="rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd>
          </p>
        </motion.div>
      </main>
      <PoweredBy />
    </div>
  );
}
