import { cx } from "@/components/ui";

/** Footer credit shown at the bottom of every page. */
export function PoweredBy({ className }) {
  return (
    // Baseline, not centre: the two words use different fonts.
    <footer className={cx("flex items-baseline justify-center gap-1.5 py-5 text-xs text-ink-3", className)}>
      <span>Powered by</span>
      <span className="lasan-signature font-semibold">Lasan Labs</span>
    </footer>
  );
}
