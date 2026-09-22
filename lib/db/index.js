import "server-only";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// With DATABASE_URL set (Railway, production) we talk to real Postgres.
// Without it, local dev falls back to an embedded Postgres (PGlite) stored in
// ./.data so the app runs with zero setup. Migrations are applied automatically
// for the embedded database only; run `npm run db:migrate` against Railway.

const g = globalThis;

async function connect() {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const client = postgres(process.env.DATABASE_URL, {
      max: 5,
      prepare: false,
    });
    return drizzle(client, { schema });
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(path.join(dataDir, "pglite"));
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

export function getDb() {
  if (!g.__lgDb) {
    // Don't cache a failed connection; the next request should retry.
    g.__lgDb = connect().catch((err) => {
      g.__lgDb = undefined;
      throw err;
    });
  }
  return g.__lgDb;
}

export { schema };
