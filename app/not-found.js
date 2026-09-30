import { LogoMark } from "@/components/logo";
import { LinkButton } from "@/components/ui";
import { PoweredBy } from "@/components/powered-by";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <LogoMark size={40} />
        <p className="mt-6 text-sm font-semibold text-ink-3">Error 404</p>
        <h1 className="mt-1 text-2xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-3">It may have been deleted, or the link is mistyped.</p>
        <LinkButton href="/dashboard" className="mt-6">
          Back to dashboard
        </LinkButton>
      </main>
      <PoweredBy />
    </div>
  );
}
