import { cx } from "@/components/ui";

export function LogoMark({ size = 28, className }) {
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-md bg-brand text-on-brand", className)}
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

// `product` adds the app name after a divider, as in "Lasan Grow | Sales".
export function Logo({ className, size, product }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="text-[16px] font-semibold">Lasan Grow</span>
      {/* Phones have room for the brand only. */}
      {product && (
        <>
          <span className="hidden h-4 w-px bg-current opacity-30 sm:block" aria-hidden />
          <span className="hidden text-[15px] font-normal opacity-85 sm:inline">{product}</span>
        </>
      )}
    </span>
  );
}
