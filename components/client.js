"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { buttonClass, cx } from "@/components/ui";
import { money } from "@/lib/format";

export function SubmitButton({ children, pendingText, variant, size, className }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass({ variant, size, className })}>
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? pendingText ?? children : children}
    </button>
  );
}

// Controlled-or-trigger modal. Pass `trigger` (a render fn receiving open) or control via open/onClose.
export function Modal({ trigger, title, description, children, open: openProp, onClose, wide }) {
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const close = () => (controlled ? onClose?.() : setOpenState(false));
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector("input, select, textarea")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      {trigger?.(() => setOpenState(true))}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
                <motion.div
                  className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={close}
                />
                <motion.div
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={title}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className={cx(
                    "relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface p-6 shadow-pop sm:rounded-2xl",
                    wide ? "sm:max-w-2xl" : "sm:max-w-lg"
                  )}
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
                      {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {typeof children === "function" ? children(close) : children}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

// Animated count-up for KPI numbers. Props are serializable so server components can use it.
export function CountUp({ value, currency, compact, suffix = "", decimals = 0, duration = 900 }) {
  const format = (v) =>
    currency
      ? money(v, currency, { compact })
      : `${v.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}${suffix}`;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(display)}</>;
}
