import { cx } from "@/components/ui";

export function LogoMark({ size = 28, className }) {
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-[9px] bg-ink text-inverse", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none">
        <path d="M5 19V5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M5 19h6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="M13 15.5l3-4 2.2 2.2L21 8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ className }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[17px] font-semibold tracking-tight">
        Lasan<span className="text-ink-3">Grow</span>
      </span>
    </span>
  );
}
