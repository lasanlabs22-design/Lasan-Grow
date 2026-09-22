import Link from "next/link";
import { initials } from "@/lib/format";

// Server-safe UI primitives (no hooks). Interactive pieces live in ./client.js.

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const BUTTON_VARIANTS = {
  primary: "bg-ink text-inverse hover:opacity-85 shadow-card",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2 hover:border-line-strong",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-bad-bg text-bad hover:brightness-95",
};
const BUTTON_SIZES = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-3.5 text-sm",
  lg: "h-11 px-5 text-[15px]",
  icon: "h-8 w-8",
};

export function buttonClass({ variant = "primary", size = "md", className } = {}) {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export function Button({ variant, size, className, ...props }) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}

export function LinkButton({ variant, size, className, ...props }) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface shadow-card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cx("flex items-start justify-between gap-4 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  good: "bg-good-bg text-good border-transparent",
  bad: "bg-bad-bg text-bad border-transparent",
  warn: "bg-warn-bg text-warn border-transparent",
  ink: "bg-ink text-inverse border-transparent",
  outline: "bg-transparent text-ink-2 border-line-strong",
};

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium",
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const AVATAR_TONES = ["bg-s1", "bg-s2", "bg-s3", "bg-s4", "bg-s5", "bg-s7"];

export function Avatar({ name = "", size = 32, className }) {
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        tone,
        className
      )}
    >
      {initials(name) || "?"}
    </span>
  );
}

const FIELD_BASE =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors hover:border-line-strong focus:border-ink focus:outline-none";

export function Input({ className, ...props }) {
  return <input className={cx(FIELD_BASE, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cx(FIELD_BASE, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx(FIELD_BASE, "h-10 appearance-none bg-no-repeat pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-2">
          <Icon size={20} className="text-ink-2" />
        </div>
      )}
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, children }) {
  return (
    <th
      className={cx(
        "border-b border-line px-4 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-wider text-ink-3 first:pl-5 last:pr-5",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ className, children }) {
  return (
    <td className={cx("border-b border-line px-4 py-3 first:pl-5 last:pr-5", className)}>{children}</td>
  );
}
