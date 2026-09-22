import { LogoMark } from "@/components/logo";
import { LinkButton } from "@/components/ui";
import { PoweredBy } from "@/components/powered-by";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="dot-grid flex flex-1 flex-col items-center justify-center px-4 text-center">
        <LogoMark size={40} />
        <p className="mt-8 font-display text-7xl font-semibold tracking-tight">404</p>
        <h1 className="mt-2 font-serif text-3xl italic text-ink-2">This page wandered off the pipeline.</h1>
        <p className="mt-3 max-w-sm text-sm text-ink-3">It may have been deleted, or the link is mistyped.</p>
        <LinkButton href="/dashboard" className="mt-8 rounded-full px-5">
          Back to dashboard
        </LinkButton>
      </main>
      <PoweredBy />
    </div>
  );
}
