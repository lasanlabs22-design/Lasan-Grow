import { cx } from "@/components/ui";

// Two upward chevrons on the brand-blue square: up and to the right. The same drawing is the
// browser-tab icon (app/icon.svg).
const GLYPH =
  '<g fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 21.5 L16 14 L23.5 21.5" opacity=".6"/><path d="M8.5 14.5 L16 7 L23.5 14.5"/></g>';

export function LogoMark({ size = 28, className }) {
  return (
    <svg
      className={cx("shrink-0", className)}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: `<rect width="32" height="32" rx="6" fill="var(--brand)"/>${GLYPH}` }}
    />
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
