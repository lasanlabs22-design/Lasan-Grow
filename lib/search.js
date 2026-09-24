import "server-only";
import { and, ilike, or } from "drizzle-orm";

// Splits a query into words so "aarav fernandes" or "aarav northwind" match across columns.
export function searchWords(q) {
  return String(q ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => `%${w.replace(/[\\%_]/g, "\\$&")}%`);
}

// Every word must appear in at least one of the columns.
export function matchWords(q, columns) {
  const words = searchWords(q);
  if (!words.length) return undefined;
  return and(...words.map((w) => or(...columns.map((c) => ilike(c, w)))));
}
