import Link from "next/link";
import { Logo } from "@/components/logo";
import { PoweredBy } from "@/components/powered-by";
import { ThemeToggle } from "@/components/theme-provider";
import { requirePlatformAdmin } from "@/lib/platform";
import { AccountMenu, ConsoleNav } from "../client";

export default async function ConsoleLayout({ children }) {
  const admin = await requirePlatformAdmin({ allowPasswordChange: true });
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-12 items-center gap-3 bg-suite px-3 text-suite-ink sm:px-6">
        <Link href="/platform" className="rounded-md px-1 py-1 hover:bg-white/5">
          <Logo size={26} product="Platform console" />
        </Link>
        <span className="rounded-sm border border-white/25 px-1.5 py-px text-[11px] font-semibold uppercase tracking-wide opacity-85">
          Lasan staff
        </span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle tone="suite" />
          <AccountMenu name={admin.name} email={admin.email} role={admin.role} />
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6">
        {!admin.mustChangePassword && <ConsoleNav isAdmin={admin.role === "admin"} />}
        <main className="pt-5">{children}</main>
      </div>
      <PoweredBy />
    </div>
  );
}
