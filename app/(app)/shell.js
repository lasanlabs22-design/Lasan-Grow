"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  CheckSquare,
  ChevronDown,
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

function NavItem({ href, label, icon: Icon, active, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cx(
        "relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors",
        active ? "bg-brand-soft font-semibold text-brand-ink" : "text-ink hover:bg-surface-2"
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-sm bg-brand" aria-hidden />}
      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-brand" : "text-ink-3"} />
      {label}
    </Link>
  );
}

function SideNav({ orgName, onNavigate }) {
  const pathname = usePathname();
  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");
  return (
    <div className="flex h-full flex-col px-2 py-3">
      <div className="mb-3 flex items-center gap-2.5 border-b border-line px-3 pb-3" title={`Workspace: ${orgName}`}>
        <Building2 size={16} className="shrink-0 text-brand" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Workspace</p>
          <p className="truncate text-sm font-semibold">{orgName}</p>
        </div>
      </div>
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Sales</p>
      <nav className="space-y-0.5">
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto border-t border-line pt-2">
        <NavItem href="/settings" label="Settings" icon={Settings} active={isActive("/settings")} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function AccountMenu({ user, orgName }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Account: ${user.name}`}
        className="flex h-9 items-center gap-2 rounded-md px-1.5 text-suite-ink hover:bg-white/10"
      >
        <Avatar name={user.name} size={28} />
        <ChevronDown size={14} className={cx("hidden opacity-80 transition-transform sm:block", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-64 overflow-hidden rounded-md border border-line bg-surface text-ink shadow-pop">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Avatar name={user.name} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-ink-3">{user.email}</p>
              <p className="truncate text-xs text-ink-3">
                {orgName} · <span className="capitalize">{user.role}</span>
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface-2"
          >
            <Settings size={15} className="text-ink-3" /> Settings
          </Link>
          <form action={logout} className="border-t border-line">
            <button type="submit" className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface-2 hover:text-bad">
              <LogOut size={15} className="text-ink-3" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Bolds the parts of `text` that match any word of the query.
function Highlight({ text, query }) {
  const words = query.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return text;
  const re = new RegExp(`(${words.join("|")})`, "gi");
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="bg-transparent font-semibold text-ink">{part}</mark> : part));
}

function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState("");
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);
  const term = query.trim();

  useEffect(() => {
    if (term.length < 2) return; // quick actions show instead of results
    const t = setTimeout(() => {
      const id = ++latest.current;
      startTransition(async () => {
        const found = await searchAll(term);
        if (id !== latest.current) return; // a newer search has started; drop this answer
        setResults(found);
        setSearched(term);
        setActive(0);
      });
    }, 120);
    return () => clearTimeout(t);
  }, [term]);

  const items =
    term.length < 2
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
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Search"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="relative w-full max-w-xl overflow-hidden rounded-md border border-line bg-surface shadow-pop"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={17} className="text-ink-3" />
              <input
                // The palette remounts on every open (see `key` in Shell), so focus is immediate and state starts fresh.
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search deals, contacts, companies, leads…"
                className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
                aria-label="Search"
              />
              {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />}
            </div>
            <ul className="max-h-[50vh] overflow-y-auto py-1.5" role="listbox">
              {term.length < 2 && (
                <li className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Quick create</li>
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
                        "flex w-full items-center gap-3 border-l-[3px] px-4 py-2 text-left text-sm",
                        i === active ? "border-brand bg-brand-soft" : "border-transparent"
                      )}
                    >
                      {item.type === "Action" ? (
                        <Plus size={15} className="text-ink-3" />
                      ) : (
                        <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{item.type}</span>
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {item.type === "Action" ? item.label : <Highlight text={item.label} query={searched} />}
                        {item.sub && <span className="ml-2 text-ink-3">{item.sub}</span>}
                      </span>
                      {i === active && <CornerDownLeft size={14} className="text-ink-3" />}
                      {item.type === "Action" && i !== active && <Icon size={15} className="text-ink-3" />}
                    </button>
                  </li>
                );
              })}
              {term.length >= 2 && !pending && searched === term && results.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-ink-3">No matches for “{term}”</li>
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
  const [palette, setPaletteOpen] = useState(false);
  const [paletteSession, setPaletteSession] = useState(0);
  const setPalette = (next) =>
    setPaletteOpen((was) => {
      const open = typeof next === "function" ? next(was) : next;
      if (open && !was) setPaletteSession((n) => n + 1);
      return open;
    });

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

  return (
    <div className="min-h-screen pt-12 lg:pl-[232px]">
      {/* Suite bar: product, global search, account. Always on top, as in Dynamics 365 and SAP Fiori. */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-2 border-b border-suite-line bg-suite px-2 text-suite-ink sm:px-4">
        <button
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
          className="rounded-md p-2 hover:bg-white/10 lg:hidden"
        >
          <Menu size={18} />
        </button>
        <Link href="/dashboard" className="rounded-md px-1 py-1 hover:bg-white/5">
          <Logo size={26} product="Sales" />
        </Link>
        <button
          onClick={() => setPalette(true)}
          className="mx-auto hidden h-8 w-full max-w-[440px] items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-suite-ink/75 transition-colors hover:bg-white/15 md:flex"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Search or create</span>
          <kbd className="rounded-sm border border-white/25 px-1.5 font-mono text-[11px]">Ctrl K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button
            onClick={() => setPalette(true)}
            aria-label="Search"
            className="rounded-md p-2 hover:bg-white/10 md:hidden"
          >
            <Search size={18} />
          </button>
          <ThemeToggle tone="suite" />
          <AccountMenu user={user} orgName={orgName} />
        </div>
      </header>

      {/* Desktop navigation */}
      <aside className="fixed bottom-0 left-0 top-12 hidden w-[232px] border-r border-line bg-surface lg:block">
        <SideNav orgName={orgName} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
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
              transition={{ type: "tween", duration: 0.18 }}
              className="absolute inset-y-0 left-0 flex w-[264px] flex-col border-r border-line bg-surface"
            >
              <div className="flex h-12 items-center justify-between bg-suite px-3 text-suite-ink">
                <Logo size={24} />
                <button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-md p-1.5 hover:bg-white/10">
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <SideNav orgName={orgName} onNavigate={() => setDrawer(false)} />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-h-[calc(100vh-3rem)] flex-col">
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:py-6">{children}</main>
        <PoweredBy />
      </div>

      <CommandPalette key={paletteSession} open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
