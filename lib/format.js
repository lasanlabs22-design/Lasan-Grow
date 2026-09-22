const LOCALE_BY_CURRENCY = { INR: "en-IN", USD: "en-US", EUR: "de-DE", GBP: "en-GB", AED: "en-AE" };

export function localeFor(currency) {
  return LOCALE_BY_CURRENCY[currency] ?? "en-US";
}

export function money(value, currency = "INR", { compact = false } = {}) {
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(value ?? 0);
}

export function number(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export function percent(value, digits = 0) {
  return `${(value ?? 0).toFixed(digits)}%`;
}

export function fullName(c) {
  return [c?.firstName, c?.lastName].filter(Boolean).join(" ");
}

export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function shortDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function longDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeTime(d) {
  if (!d) return "—";
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return longDate(d);
}
