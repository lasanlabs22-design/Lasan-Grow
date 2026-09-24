"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input, cx } from "@/components/ui";

// Search box for list pages: updates `?q=` as you type, keeping the page's other params (tab, sort, view).
export function LiveSearch({ path, q = "", params = {}, placeholder, className }) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const [sent, setSent] = useState(q);
  const [pending, startTransition] = useTransition();

  // Follow the URL when it changes from elsewhere (e.g. a tab link), but never clobber what's being typed.
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    if (q !== sent) {
      setValue(q);
      setSent(q);
    }
  }

  const go = (next) => {
    const term = next.trim();
    setSent(term);
    const search = new URLSearchParams(Object.entries({ ...params, ...(term && { q: term }) }).filter(([, v]) => v));
    startTransition(() => router.replace(search.size ? `${path}?${search}` : path, { scroll: false }));
  };

  useEffect(() => {
    if (value.trim() === sent) return;
    const t = setTimeout(() => go(value), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form
      role="search"
      className={cx("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() !== sent) go(value);
      }}
    >
      {pending ? (
        <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-ink-3" />
      ) : (
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
      )}
      <Input
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && value && (e.preventDefault(), setValue(""))}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className="h-9 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          <X size={14} />
        </button>
      )}
    </form>
  );
}
