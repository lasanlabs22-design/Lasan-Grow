"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, CalendarClock, CircleDollarSign, Flame } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-provider";
import { PoweredBy } from "@/components/powered-by";
import { CountUp } from "@/components/client";

const subscribe = () => () => {};

function greetingFor(hour) {
  if (hour < 5) return { hello: "Burning the midnight oil", emoji: "🌙" };
  if (hour < 12) return { hello: "Good morning", emoji: "☀️" };
  if (hour < 17) return { hello: "Good afternoon", emoji: "🌤️" };
  if (hour < 21) return { hello: "Good evening", emoji: "🌆" };
  return { hello: "Working late", emoji: "🌙" };
}

const TAGLINES = [
  "Let's close something big today.",
  "Your pipeline missed you.",
  "Every follow-up is a future win.",
  "Today's calls are tomorrow's revenue.",
  "Momentum loves consistency.",
];

const CONFETTI_COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s7)"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 900,
        y: -Math.random() * 520 - 120,
        r: Math.random() * 720 - 360,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        delay: Math.random() * 0.25,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/2 z-0 flex justify-center" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-[2px]"
          style={{ width: p.w, height: p.h, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 700], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 2.6, delay: 0.9 + p.delay, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}

function Stat({ icon: Icon, label, children, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface/80 px-4 py-3.5 shadow-card backdrop-blur"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2">
        <Icon size={17} className="text-ink-2" />
      </span>
      <div className="text-left">
        <p className="font-display text-lg font-semibold leading-tight tabular">{children}</p>
        <p className="text-xs text-ink-3">{label}</p>
      </div>
    </motion.div>
  );
}

export function WelcomeScreen({ firstName, orgName, currency, isNew, stats }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const hour = mounted ? new Date().getHours() : 9;
  const { hello, emoji } = greetingFor(hour);
  const [taglineIndex, setTaglineIndex] = useState(0);

  const enter = () => router.push("/dashboard");

  useEffect(() => {
    router.prefetch("/dashboard");
    const onKey = (e) => e.key === "Enter" && enter();
    window.addEventListener("keydown", onKey);
    const t = setInterval(() => setTaglineIndex((i) => (i + 1) % TAGLINES.length), 3200);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline = isNew ? "Welcome aboard," : `${hello},`;
  const nameLetters = [...firstName];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Backdrop */}
      <div className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--s1) 22%, transparent), transparent 65%)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {isNew && mounted && <Confetti />}

      <header className="relative z-10 flex h-16 items-center justify-between px-4 sm:px-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-sm text-ink-3">{orgName}</span>
        </motion.div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: [0, 14, -8, 14, 0] }}
          transition={{ scale: { type: "spring", stiffness: 260, damping: 14 }, rotate: { delay: 0.5, duration: 1.2 } }}
          className="mb-6 text-5xl"
          aria-hidden
        >
          {isNew ? "🎉" : emoji}
        </motion.div>

        <h1 className="font-display text-[clamp(2.2rem,6vw,4.5rem)] font-semibold leading-[1] tracking-tight">
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {headline}
          </motion.span>
          <span className="mt-2 block font-serif text-[clamp(3.4rem,11vw,8.5rem)] font-normal italic leading-[1.02]" aria-label={firstName}>
            {nameLetters.map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="inline-block"
                initial={{ opacity: 0, y: 60, rotate: 8, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, rotate: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.35 + i * 0.07, type: "spring", stiffness: 200, damping: 18 }}
              >
                {ch === " " ? " " : ch}
              </motion.span>
            ))}
            <motion.span
              aria-hidden
              className="inline-block text-s1"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + nameLetters.length * 0.07, type: "spring" }}
            >
              .
            </motion.span>
          </span>
        </h1>

        <div className="mt-6 h-7 overflow-hidden text-lg text-ink-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={isNew ? "new" : taglineIndex}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {isNew ? `${orgName} is ready. Let's build your pipeline.` : TAGLINES[taglineIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
          <Stat icon={CircleDollarSign} label={`in ${stats.openDeals} open deals`} delay={1.1}>
            <CountUp value={stats.pipelineValue} currency={currency} compact duration={1400} />
          </Stat>
          <Stat icon={CalendarClock} label="tasks due today" delay={1.25}>
            <CountUp value={stats.tasksDue} duration={1000} />
          </Stat>
          <Stat icon={Flame} label="deals closing this week" delay={1.4}>
            <CountUp value={stats.closingThisWeek} duration={1000} />
          </Stat>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <button
            onClick={enter}
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-ink pl-6 pr-5 text-[15px] font-medium text-inverse shadow-pop transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Enter your workspace
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </button>
          <p className="text-xs text-ink-3">
            or press <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd>
          </p>
        </motion.div>
      </main>
      <PoweredBy className="relative z-10" />
    </div>
  );
}
