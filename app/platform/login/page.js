import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { PoweredBy } from "@/components/powered-by";
import { ThemeToggle } from "@/components/theme-provider";
import { PlatformLoginForm } from "../client";

export const metadata = { title: "Platform console sign in" };

export default function PlatformLoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-12 items-center justify-between bg-suite px-4 text-suite-ink sm:px-6">
        <Logo size={26} product="Platform console" />
        <ThemeToggle tone="suite" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] rounded-md border border-line bg-surface p-6 shadow-card sm:p-9">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-warn/30 bg-warn-bg px-2 py-0.5 text-xs font-semibold text-warn">
            <ShieldCheck size={13} /> Lasan staff only
          </span>
          <h1 className="mt-4 text-2xl font-semibold">Platform console</h1>
          <p className="mb-6 mt-1.5 text-sm text-ink-3">
            Create and manage customer workspaces. Customers sign in on the regular Lasan Grow sign-in page.
          </p>
          <PlatformLoginForm />
        </div>
      </main>
      <PoweredBy />
    </div>
  );
}
