"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  CheckSquare,
  Columns3,
  LayoutDashboard,
  LogOut,
  Magnet,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  X,
  CornerDownLeft,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Avatar, cx } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-provider";
import { PoweredBy } from "@/components/powered-by";
import { logout } from "@/app/(auth)/actions";
import { searchAll } from "./search-action";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Magnet },
  { href: "/deals", label: "Deals", icon: Columns3 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

const QUICK_ACTIONS = [
  { label: "New deal", href: "/deals?new=1", icon: Columns3 },
  { label: "New lead", href: "/leads?new=1", icon: Magnet },
  { label: "New contact", href: "/contacts?new=1", icon: Users },
  { label: "New company", href: "/companies?new=1", icon: Building2 },
  { label: "New task", href: "/tasks?new=1", icon: CheckSquare },
];

function NavLinks({ onNavigate }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cx(
              "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors",
              active ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:bg-surface/60 hover:text-ink"
            )}
          >
            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
            <span className={active ? "font-medium" : ""}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ user, orgName, onNavigate }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col px-3 pb-3">
      <div className="flex h-16 items-center px-2">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>
      <div className="mb-4 rounded-xl border border-line bg-surface/60 px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-wider text-ink-3">Workspace</p>
        <p className="truncate text-sm font-medium">{orgName}</p>
      </div>
      <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-ink-3">Sell</p>
      <NavLinks onNavigate={onNavigate} />

      <div className="mt-auto space-y-0.5">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cx(
            "flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors",
            pathname.startsWith("/settings") ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:bg-surface/60 hover:text-ink"
          )}
        >
          <Settings size={17} /> Settings
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface/60 p-2.5">
          <Avatar name={user.name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-ink-3">{user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchAll(query));
        setActive(0);
      });
    }, 160);
    return () => clearTimeout(t);
  }, [query]);

  const items =
    query.trim().length < 2
      ? QUICK_ACTIONS.map((a) => ({ ...a, type: "Action", id: a.href }))
      : results;

  const go = (item) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Search"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={17} className="text-ink-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search deals, contacts, companies, leads…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
                aria-label="Search"
              />
              {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-ink" />}
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
              {query.trim().length < 2 && (
                <li className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-ink-3">Quick actions</li>
              )}
              {items.map((item, i) => {
                const Icon = item.icon ?? Search;
                return (
                  <li key={item.type + item.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={cx(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                        i === active ? "bg-surface-2" : ""
                      )}
                    >
                      {item.type === "Action" ? (
                        <Plus size={15} className="text-ink-3" />
                      ) : (
                        <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wider text-ink-3">{item.type}</span>
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                        {item.sub && <span className="ml-2 text-ink-3">{item.sub}</span>}
                      </span>
                      {i === active && <CornerDownLeft size={14} className="text-ink-3" />}
                      {item.type === "Action" && i !== active && <Icon size={15} className="text-ink-3" />}
                    </button>
                  </li>
                );
              })}
              {query.trim().length >= 2 && !pending && results.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-ink-3">No matches for “{query}”</li>
              )}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Shell({ user, orgName, children }) {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = NAV.find((n) => pathname.startsWith(n.href))?.label ?? (pathname.startsWith("/settings") ? "Settings" : "");

  return (
    <div className="min-h-screen lg:pl-[248px]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] border-r border-line bg-surface-2/60 lg:block">
        <SidebarBody user={user} orgName={orgName} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="absolute inset-y-0 left-0 w-[264px] border-r border-line bg-bg"
            >
              <button
                onClick={() => setDrawer(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-3 hover:bg-surface-2"
              >
                <X size={18} />
              </button>
              <SidebarBody user={user} orgName={orgName} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 lg:hidden"
          >
            <Menu size={18} />
          </button>
          <p className="hidden text-sm text-ink-3 sm:block">
            {orgName} <span className="mx-1.5 text-line-strong">/</span>
            <span className="font-medium text-ink">{current}</span>
          </p>
          <button
            onClick={() => setPalette(true)}
            className="ml-auto flex h-9 w-full max-w-[280px] items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink-3 transition-colors hover:border-line-strong"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Search or create…</span>
            <kbd className="hidden rounded border border-line bg-surface-2 px-1.5 font-mono text-[11px] sm:inline">Ctrl K</kbd>
          </button>
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        <PoweredBy />
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
