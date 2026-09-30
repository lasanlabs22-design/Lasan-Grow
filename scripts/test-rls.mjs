/**
 * Proves row-level security keeps workspaces apart, at the database level.
 *
 * Creates two throwaway workspaces (A and B) with a user, stage, company, contact, lead, deal and
 * activity each, then acts as the app's restricted role pinned to A and tries to read, change,
 * delete and forge B's data. Everything runs in one transaction that is rolled back, so it leaves
 * nothing behind and is safe to run against production.
 *
 *   npm run test:rls                      (DATABASE_URL from .env.local / .env, else ./.data)
 *
 * Exits non-zero if any check fails.
 */
import path from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const ROLE = "lasan_grow_app";
const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";
const id = (org, n) => `${org.slice(0, 8)}-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function connect() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const postgres = (await import("postgres")).default;
    const host = new URL(url).hostname;
    const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {}, ssl: host === "localhost" ? false : "require" });
    console.log(`Database: ${host} (rolled back afterwards)\n`);
    return {
      run: (fn) => sql.begin((tx) => fn((text, params = []) => tx.unsafe(text, params))),
      close: () => sql.end(),
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const db = new PGlite(path.join(process.cwd(), ".data", "pglite"));
  await migrate(drizzle(db), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("Database: embedded development database (rolled back afterwards)\n");
  return {
    run: (fn) => db.transaction((tx) => fn(async (text, params = []) => (await tx.query(text, params)).rows)),
    close: () => db.close(),
  };
}

class Rollback extends Error {}
let passed = 0;
let failed = 0;
const check = (name, ok, detail = "") => {
  ok ? passed++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  (${detail})` : ""}`);
};

const db = await connect();
try {
  await db.run(async (q) => {
    // --- Fixtures, as the owner ---
    for (const [org, name] of [[A, "RLS test A"], [B, "RLS test B"]]) {
      await q("insert into organizations (id, name) values ($1, $2)", [org, name]);
      await q("insert into users (id, org_id, name, email, password_hash, role) values ($1, $2, $3, $4, 'x', 'owner')", [
        id(org, 1), org, `${name} owner`, `rls-${org.slice(0, 8)}@example.invalid`,
      ]);
      await q("insert into stages (id, org_id, name, position) values ($1, $2, 'Open', 0)", [id(org, 2), org]);
      await q("insert into companies (id, org_id, name) values ($1, $2, $3)", [id(org, 3), org, `${name} Co`]);
      await q("insert into contacts (id, org_id, first_name, company_id) values ($1, $2, 'Pat', $3)", [id(org, 4), org, id(org, 3)]);
      await q("insert into leads (id, org_id, name) values ($1, $2, 'Lead')", [id(org, 5), org]);
      await q("insert into deals (id, org_id, title, stage_id) values ($1, $2, 'Deal', $3)", [id(org, 6), org, id(org, 2)]);
      await q("insert into activities (id, org_id, subject) values ($1, $2, 'Call')", [id(org, 7), org]);
    }

    // --- From here on we are the app, signed in to workspace A ---
    const as = async (org, fn) => {
      await q("savepoint probe");
      try {
        await q("select set_config('role', $1, true), set_config('app.org_id', $2, true)", [ROLE, org ?? ""]);
        return { ok: true, value: await fn() };
      } catch (e) {
        return { ok: false, error: e.message };
      } finally {
        await q("rollback to savepoint probe");
      }
    };
    const tables = ["users", "companies", "contacts", "leads", "stages", "deals", "activities"];

    for (const t of tables) {
      const r = await as(A, () => q(`select org_id from ${t} where org_id in ($1, $2)`, [A, B]));
      check(`${t}: A sees only its own rows, even when asking for B's`, r.ok && r.value.length === 1 && r.value[0].org_id === A, JSON.stringify(r));
    }
    for (const t of tables) {
      const r = await as(A, () => q(`select count(*)::int n from ${t} where org_id = $1`, [B]));
      check(`${t}: a query filtered to B returns nothing`, r.ok && r.value[0].n === 0, JSON.stringify(r));
    }
    for (const t of ["companies", "contacts", "leads", "deals", "activities"]) {
      const r = await as(A, () => q(`update ${t} set org_id = org_id where id = $1 returning id`, [id(B, { companies: 3, contacts: 4, leads: 5, deals: 6, activities: 7 }[t])]));
      check(`${t}: A can't update B's row`, r.ok && r.value.length === 0, JSON.stringify(r));
    }
    {
      const r = await as(A, () => q("delete from deals where id = $1 returning id", [id(B, 6)]));
      check("deals: A can't delete B's deal", r.ok && r.value.length === 0, JSON.stringify(r));
    }
    {
      const r = await as(A, () => q("insert into companies (org_id, name) values ($1, 'Planted')", [B]));
      check("companies: A can't create a row inside B", !r.ok && /row-level security/.test(r.error), JSON.stringify(r));
    }
    {
      const r = await as(A, () => q("update deals set org_id = $1 where id = $2 returning id", [B, id(A, 6)]));
      check("deals: A can't move its own deal into B", !r.ok && /row-level security/.test(r.error), JSON.stringify(r));
    }
    {
      const r = await as(A, () => q("update users set password_hash = 'owned' where email like 'rls-%' returning org_id"));
      check("users: A can't change B's passwords", r.ok && r.value.every((u) => u.org_id === A), JSON.stringify(r));
    }
    {
      const r = await as(A, () => q("select id from organizations where id in ($1, $2)", [A, B]));
      check("organizations: A sees only its own workspace", r.ok && r.value.length === 1 && r.value[0].id === A, JSON.stringify(r));
    }
    {
      const r = await as(A, () => q("update organizations set status = 'active' where id = $1", [A]));
      check("organizations: A can't lift its own suspension", !r.ok && /permission denied/.test(r.error), JSON.stringify(r));
    }
    {
      const r = await as(A, () => q("select email from platform_admins"));
      check("platform_admins: unreachable from workspace code", !r.ok && /permission denied/.test(r.error), JSON.stringify(r));
    }
    {
      const r = await as(A, () => q("select id from drizzle.__drizzle_migrations"));
      check("migrations table: unreachable from workspace code", !r.ok && /permission denied/.test(r.error), JSON.stringify(r));
    }
    {
      const r = await as(null, () => q("select count(*)::int n from deals where org_id in ($1, $2)", [A, B]));
      check("no workspace pinned: sees no rows at all", r.ok && r.value[0].n === 0, JSON.stringify(r));
    }
    {
      // Only meaningful when the app logs in as the restricted role (DATABASE_APP_URL): a role
      // switched to from an owner login can switch back, so that fallback relies on queries being
      // parameterised. The real login is checked separately below.
      const r = await as(A, () => q("select set_config('role', 'postgres', true)"));
      if (r.ok) console.log("WARN  shared owner connection: the role switch is reversible by injected SQL. Set DATABASE_APP_URL in production.");
      else check("the app role can't switch itself back to the owner", /permission denied/.test(r.error), JSON.stringify(r));
    }
    {
      const r = await as(A, () => q("select rolbypassrls, rolsuper from pg_roles where rolname = $1", [ROLE]));
      check("the app role is neither superuser nor BYPASSRLS", r.ok && r.value[0] && !r.value[0].rolbypassrls && !r.value[0].rolsuper, JSON.stringify(r));
    }
    {
      const r = await as(B, () => q("select count(*)::int n from deals where org_id = $1", [A]));
      check("and the same holds the other way round (B can't see A)", r.ok && r.value[0].n === 0, JSON.stringify(r));
    }

    throw new Rollback();
  });
} catch (e) {
  if (!(e instanceof Rollback)) {
    console.error(e.message);
    failed++;
  }
} finally {
  await db.close();
}

// Logged in as the restricted role itself, as production does with DATABASE_APP_URL.
if (process.env.DATABASE_APP_URL) {
  const postgres = (await import("postgres")).default;
  const url = process.env.DATABASE_APP_URL;
  const app = postgres(url, { max: 1, prepare: false, onnotice: () => {}, ssl: new URL(url).hostname === "localhost" ? false : "require" });
  try {
    const [me] = await app`select current_user as u, session_user as s`;
    check("DATABASE_APP_URL logs in as the restricted role", me.u === ROLE && me.s === ROLE, JSON.stringify(me));
    const escape = await app.unsafe("set role postgres").then(() => "allowed", (e) => e.message);
    check("the restricted login can't become the owner", /permission denied/.test(escape), escape);
    const [{ n }] = await app`select count(*)::int as n from deals`;
    check("the restricted login with no workspace pinned sees no deals", n === 0, String(n));
    const admins = await app`select 1 from platform_admins`.then(() => "readable", (e) => e.message);
    check("the restricted login can't read console accounts", /permission denied/.test(admins), admins);
  } finally {
    await app.end();
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
