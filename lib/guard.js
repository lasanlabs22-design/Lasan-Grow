import "server-only";
import { and, eq } from "drizzle-orm";

// Verifies that an optional foreign id belongs to the org before we write it.
// Returns the id, null for empty input, or throws for a foreign/unknown id.
export async function ownedId(db, table, id, orgId) {
  if (!id) return null;
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.orgId, orgId)))
    .limit(1);
  if (!row) throw new Error("Not found");
  return row.id;
}

export function emptyToNull(v) {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s === undefined ? null : s;
}
