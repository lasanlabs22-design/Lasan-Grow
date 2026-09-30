"use client";

import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cx } from "@/components/ui";

// White is the default, as in most enterprise software; the black theme is one click away and
// remembered per browser.
export function ThemeProvider({ children }) {
  return (
    <NextThemes attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}

const subscribe = () => () => {};

// `tone="suite"` is for the dark suite bar at the top of the app.
export function ThemeToggle({ className, withLabel = false, tone }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Switch to white theme" : "Switch to black theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-xs font-medium transition-colors",
        tone === "suite"
          ? "text-suite-ink/85 hover:bg-white/10 hover:text-suite-ink"
          : "border border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink",
        className
      )}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
      {withLabel && <span>{dark ? "White theme" : "Black theme"}</span>}
    </button>
  );
}
