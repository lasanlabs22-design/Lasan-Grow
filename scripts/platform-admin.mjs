/**
 * Creates or updates a platform console account. Use it for the first admin, and as the last resort
 * if every admin is locked out; otherwise admins manage the Lasan team from /platform/team.
 *
 *   npm run platform:admin -- --email you@lasan.in --name "Your Name" --password "Secret123"
 *   npm run platform:admin -- --email you@lasan.in --password "NewSecret456"   (reset password)
 *   npm run platform:admin -- --email you@lasan.in --role staff                (or admin)
 *   npm run platform:admin -- --email you@lasan.in --disable                   (or --enable)
 *   npm run platform:admin -- --list
 *
 * Reads DATABASE_URL like the app does (.env.local, then .env). Without it, it uses the embedded
 * development database in ./.data, which only works while `npm run dev` is stopped.
 */
import { parseArgs } from "node:util";
import path from "node:path";
import nextEnv from "@next/env";
import bcrypt from "bcryptjs";

nextEnv.loadEnvConfig(process.cwd());

const { values: a } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    password: { type: "string" },
    role: { type: "string" },
    disable: { type: "boolean", default: false },
    enable: { type: "boolean", default: false },
    list: { type: "boolean", default: false },
  },
});

// Same rule as lib/passwords.js.
const problem = (p) =>
  p.length < 8 ? "Use at least 8 characters" : !/[A-Za-z]/.test(p) || !/\d/.test(p) ? "Use at least one letter and one number" : null;

async function connect() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, { max: 1, onnotice: () => {} });
    console.log(`Database: ${new URL(url).host} (from DATABASE_URL)`);
    return { query: (text, params = []) => sql.unsafe(text, params), close: () => sql.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const db = new PGlite(path.join(process.cwd(), ".data", "pglite"));
  // The app migrates the embedded database on start-up; do the same so this works on a fresh checkout.
  await migrate(drizzle(db), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("Database: embedded development database (./.data)");
  return { query: async (text, params = []) => (await db.query(text, params)).rows, close: () => db.close() };
}

const db = await connect();
try {
  if (a.role && !["admin", "staff"].includes(a.role)) throw new Error("--role must be admin or staff");
  if (a.list) {
    console.table(
      await db.query(
        "select email, name, role, is_active, must_change_password, last_login_at, created_at from platform_admins order by created_at"
      )
    );
  } else {
    if (!a.email) throw new Error("Pass --email (or --list)");
    const email = a.email.trim().toLowerCase();
    if (a.password && problem(a.password)) throw new Error(`Password: ${problem(a.password)}`);
    const hash = a.password ? await bcrypt.hash(a.password, 12) : null;
    const [existing] = await db.query("select id from platform_admins where email = $1", [email]);

    if (!existing) {
      if (!a.name || !hash) throw new Error("A new account needs --name and --password");
      await db.query("insert into platform_admins (email, name, role, password_hash) values ($1, $2, $3, $4)", [
        email,
        a.name.trim(),
        a.role ?? "admin",
        hash,
      ]);
      console.log(`✓ Console ${a.role ?? "admin"} ${email} created. Sign in at /platform/login`);
    } else {
      // Any change signs them out everywhere and clears a lockout.
      const active = a.disable ? false : a.enable ? true : null;
      await db.query(
        `update platform_admins set
           name = coalesce($2, name),
           password_hash = coalesce($3, password_hash),
           must_change_password = case when $3::text is null then must_change_password else false end,
           role = coalesce($4::platform_role, role),
           is_active = coalesce($5, is_active),
           token_version = token_version + 1,
           failed_logins = 0,
           locked_until = null
         where id = $1`,
        [existing.id, a.name?.trim() ?? null, hash, a.role ?? null, active]
      );
      console.log(
        `✓ ${email} updated${hash ? " (new password)" : ""}${a.role ? ` (role: ${a.role})` : ""}${
          active === false ? " (disabled)" : active ? " (enabled)" : ""
        }`
      );
    }
  }
} catch (err) {
  console.error(err.message.includes("platform_admins") && err.message.includes("does not exist")
    ? "The platform_admins table is missing: run the migrations first (npm run db:migrate, or start the app once locally)."
    : err.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
