import "server-only";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// Two ways into the database:
//
//   tenantDb(orgId)  Everything customers do. Each statement (or explicit transaction) runs as
//                    the restricted role lasan_grow_app with the workspace pinned, and Postgres
//                    row-level security (drizzle/0003_row_level_security.sql) hides and refuses
//                    every other workspace's rows, even if a query forgets its org filter.
//   getAdminDb()     The owner connection, which bypasses row-level security. Only for sign-in
//                    lookups, the platform console and migrations; eslint.config.mjs stops the
//                    rest of the app importing it.
//
// With DATABASE_URL set (Railway, production) we talk to real Postgres. Without it, local dev falls
// back to an embedded Postgres (PGlite) in ./.data; its migrations are applied automatically.
// DATABASE_APP_URL, when set, logs in as lasan_grow_app itself for tenantDb, so customer requests
// never hold owner credentials at all.

export const APP_ROLE = "lasan_grow_app";
const PIN = "select set_config('role', $1, true), set_config('app.org_id', $2, true)";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const g = globalThis;

// Railway's public proxy is on the internet: always encrypt. Local servers usually don't do TLS.
function sslFor(url) {
  const host = new URL(url).hostname;
  return host === "localhost" || host === "127.0.0.1" ? false : "require";
}

async function postgresClient(url) {
  const postgres = (await import("postgres")).default;
  return postgres(url, { max: 5, prepare: false, ssl: sslFor(url) });
}

async function connect() {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const owner = await postgresClient(process.env.DATABASE_URL);
    const app = process.env.DATABASE_APP_URL ? await postgresClient(process.env.DATABASE_APP_URL) : owner;
    return { kind: "postgres", drizzle, owner, app, admin: drizzle(owner, { schema }) };
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
  const admin = drizzle(client, { schema });
  await migrate(admin, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { kind: "pglite", drizzle, owner: client, app: client, admin };
}

function connection() {
  if (!g.__lgDb) {
    // Don't cache a failed connection; the next request should retry.
    g.__lgDb = connect().catch((err) => {
      g.__lgDb = undefined;
      throw err;
    });
  }
  return g.__lgDb;
}

/** The owner connection. Bypasses row-level security: sign-in, platform console and migrations only. */
export async function getAdminDb() {
  return (await connection()).admin;
}

// postgres.js client whose every query runs in its own transaction pinned to one workspace. Drizzle
// only calls unsafe() (awaited, or .values() for array rows) and begin() on it; explicit
// transactions pin once and run on the real transaction client.
function pinPostgres(base, orgId) {
  const pinned = (fn) =>
    base.begin(async (tx) => {
      await tx.unsafe(PIN, [APP_ROLE, orgId]);
      return fn(tx);
    });
  return {
    options: base.options,
    unsafe(query, params) {
      const run = (arrays) => pinned((tx) => (arrays ? tx.unsafe(query, params).values() : tx.unsafe(query, params)));
      return { values: () => run(true), then: (ok, bad) => run(false).then(ok, bad) };
    },
    begin: (fn) => pinned(fn),
  };
}

// The same for PGlite, whose driver calls query() and transaction().
function pinPglite(base, orgId) {
  const pinned = (fn) =>
    base.transaction(async (tx) => {
      await tx.query(PIN, [APP_ROLE, orgId]);
      return fn(tx);
    });
  return {
    query: (query, params, config) => pinned((tx) => tx.query(query, params, config)),
    transaction: (fn) => pinned(fn),
  };
}

/**
 * A database handle for one workspace, for everything customers do. Row-level security limits every
 * statement to rows of `orgId`, whatever the query itself says.
 */
export async function tenantDb(orgId) {
  if (typeof orgId !== "string" || !UUID.test(orgId)) throw new Error("tenantDb needs a workspace id");
  const c = await connection();
  const client = c.kind === "postgres" ? pinPostgres(c.app, orgId) : pinPglite(c.app, orgId);
  return c.drizzle({ client, schema });
}

export { schema };
