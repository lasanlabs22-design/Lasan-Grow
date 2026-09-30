/**
 * Runs the end-to-end suite against a deployed site (default: the live one) and cleans up after.
 *
 *   npm run test:e2e:live                         lasangrow.com, app. and ops.
 *   npm run test:e2e:live -- https://preview-url  any other deployment on the same database (one address)
 *   npm run test:e2e:live -- --watch              visible browser windows, slowed down to follow
 *
 * Creates a temporary console account (e2e-bot@example.invalid) in the database from DATABASE_URL,
 * runs Playwright, then deletes that account and every "E2E …" workspace the run created, even if
 * tests fail. Open the report afterwards with: npm run test:report
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

const args = process.argv.slice(2);
const watch = args.includes("--watch");
const custom = args.find((a) => !a.startsWith("--"));
const base = custom || "https://app.lasangrow.com";
const consoleBase = custom || "https://ops.lasangrow.com";
const siteBase = custom || "https://lasangrow.com";
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set: it must point at the database the site under test uses.");
  process.exit(1);
}
const BOT = "e2e-bot@example.invalid";
const password = `E2e${randomBytes(9).toString("hex")}9`;
// Only npx needs a shell on Windows; node gets its arguments untouched (names contain spaces).
const run = (cmd, args, env = {}) =>
  spawnSync(cmd, args, { stdio: "inherit", shell: cmd === "npx" && process.platform === "win32", env: { ...process.env, ...env } }).status;

const sql = postgres(url, { max: 1, onnotice: () => {}, ssl: new URL(url).hostname === "localhost" ? false : "require" });
async function cleanUp() {
  const spaces = await sql`delete from organizations where name like 'E2E %' returning name`;
  const bots = await sql`delete from platform_admins where email = ${BOT} returning email`;
  console.log(`\nCleaned up: ${spaces.length} test workspace(s), ${bots.length} temporary console account(s).`);
}

let status = 1;
try {
  await cleanUp(); // leftovers from an interrupted earlier run
  if (run("node", ["scripts/platform-admin.mjs", "--email", BOT, "--name", "E2E Bot", "--password", password]) !== 0) {
    throw new Error("Couldn't create the temporary console account");
  }
  console.log(`\nRunning the suite against ${base} (website: ${siteBase}, console: ${consoleBase})\n`);
  status = run("npx", ["playwright", "test"], {
    E2E_BASE_URL: base,
    E2E_SITE_URL: siteBase,
    E2E_CONSOLE_URL: consoleBase,
    E2E_CONSOLE_EMAIL: BOT,
    E2E_CONSOLE_PASSWORD: password,
    ...(watch ? { E2E_HEADED: "1" } : {}),
  });
} catch (e) {
  console.error(e.message);
} finally {
  await cleanUp();
  await sql.end();
}
console.log("Report: npm run test:report");
process.exit(status ?? 1);
