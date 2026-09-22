"use client";

import { ThemeProvider as NextThemes, useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeProvider({ children }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}

const subscribe = () => () => {};

export function ThemeToggle({ className = "" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border border-line bg-surface-2 p-0.5 transition-colors hover:border-line-strong ${className}`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-ink text-inverse shadow-card transition-transform duration-300 ${
          dark ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {dark ? <Moon size={13} /> : <Sun size={13} />}
      </span>
    </button>
  );
}
