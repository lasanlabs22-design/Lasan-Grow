// UAT: a new client's whole journey through Lasan Grow, as each real user would click it.
//   Lasan staff (console) → workspace owner → teammate → staff operating the client.
// One browser window plays every role in turn, so a watched run (E2E_HEADED) is easy to follow:
// the console session and the workspace session live side by side, and signing in as someone
// else replaces the workspace session. Each step attaches a screenshot of what it showed.
//
// Needs a console account: E2E_CONSOLE_EMAIL / E2E_CONSOLE_PASSWORD (defaults to the local
// development account). Everything it creates is named "E2E <stamp>" / *@example.invalid.
import { test, expect } from "@playwright/test";

// The public website and the console when they have their own addresses (lasangrow.com,
// ops.lasangrow.com); otherwise everything is on the base URL.
const SITE = process.env.E2E_SITE_URL || "";
const CONSOLE = process.env.E2E_CONSOLE_URL || "";
const CONSOLE_EMAIL = process.env.E2E_CONSOLE_EMAIL || "ops@lasan.test";
const CONSOLE_PASSWORD = process.env.E2E_CONSOLE_PASSWORD || "OpsPass123";
// A word that exists only in another workspace, to prove search can't reach it (optional).
const OTHER_WORKSPACE_TERM = process.env.E2E_OTHER_WORKSPACE_TERM;

const stamp = Date.now().toString(36);
const WORKSPACE = `E2E ${stamp}`;
const OWNER = `e2e-owner-${stamp}@example.invalid`;
const MATE = `e2e-mate-${stamp}@example.invalid`;
const OWNER_PASSWORD = "OwnerE2e2026";
const MATE_TEMP = "MateTemp2026";
const MATE_PASSWORD = "MateE2e2026";

test.describe.configure({ mode: "serial" });

const s = {}; // shared pages and values
let shown; // the page to screenshot after each step

async function newUser(browser, label = "Test") {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  // When watching (E2E_HEADED), each window says whose it is until its turn comes.
  await page.setContent(
    `<title>${label} window</title><body style="font:24px Segoe UI,sans-serif;display:grid;place-items:center;height:90vh;background:#f3f4f6;color:#1f2328"><div style="text-align:center"><b>${label} window</b><p style="font-size:16px;color:#6e757e">Lasan Grow end-to-end test. Please keep this window open; it will be used shortly.</p></div></body>`
  );
  page.on("dialog", (d) => d.accept());
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(`${new URL(page.url()).pathname}: ${e.message.slice(0, 120)}`));
  return page;
}
const dialog = (page) => page.getByRole("dialog").last();
async function go(page, url) {
  await page.goto(url);
  // Let client-side code settle, but don't fail a step because some background request lingers.
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
}
async function signIn(page, email, password) {
  // Signing in as someone else: drop the current workspace session (the console one stays).
  await page.context().clearCookies({ name: "lg_session" });
  await go(page, "/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}
async function shownPassword(page) {
  const values = dialog(page).locator("dd");
  await values.first().waitFor();
  return (await values.last().innerText()).trim();
}

test.beforeAll(async ({ browser }) => {
  const page = await newUser(browser, "Lasan Grow end-to-end test");
  s.visitor = s.staff = s.owner = s.mate = page;
});

test.afterEach(async ({}, testInfo) => {
  if (shown && !shown.isClosed()) {
    await testInfo.attach("screen", { body: await shown.screenshot({ fullPage: false }), contentType: "image/png" });
  }
});

test.afterAll(async () => {
  await s.owner?.context().close();
});

// ---------- Public site ----------

test("Public: home page offers sign-in and no self sign-up", async () => {
  const p = (shown = s.visitor);
  await go(p, SITE + "/");
  await expect(p.getByRole("link", { name: /Sign in/ }).first()).toBeVisible();
  await expect(p.locator('a[href="/signup"]')).toHaveCount(0);
});

test("Public: security headers are sent", async () => {
  const r = await s.visitor.request.get("/login");
  const h = r.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toContain("max-age");
});

test("Public: /signup forwards to sign-in and app pages need a sign-in", async () => {
  const p = (shown = s.visitor);
  await go(p, "/signup");
  await expect(p).toHaveURL(/\/login$/);
  await go(p, "/dashboard");
  await expect(p).toHaveURL(/\/login/);
});

// ---------- Lasan staff: set up the client ----------

test("Console: staff sign in", async () => {
  const p = (shown = s.staff);
  await go(p, CONSOLE + "/platform/login");
  await p.fill('input[name="email"]', CONSOLE_EMAIL);
  await p.fill('input[name="password"]', CONSOLE_PASSWORD);
  await p.click('button[type="submit"]');
  await expect(p).toHaveURL(/\/platform$/);
});

test("Console: create a workspace for a new client", async () => {
  const p = (shown = s.staff);
  await go(p, CONSOLE + "/platform");
  await p.getByRole("button", { name: "New workspace" }).click();
  await p.fill('input[name="company"]', WORKSPACE);
  await p.fill('input[name="ownerName"]', "Olivia Owner");
  await p.fill('input[name="ownerEmail"]', OWNER);
  await p.getByRole("button", { name: "Create workspace" }).click();
  s.ownerTemp = await shownPassword(p);
  expect(s.ownerTemp).toMatch(/^[A-Za-z]{4}-\d{4}-[A-Za-z]{4}$/);
  await dialog(p).getByRole("button", { name: "Done" }).click();
  await p.reload();
  await expect(p.locator("tr", { hasText: WORKSPACE }).first()).toBeVisible();
});

// ---------- The client's owner ----------

test("Owner: first sign-in with the temporary password asks for a new one", async () => {
  const p = (shown = s.owner);
  await signIn(p, OWNER, s.ownerTemp);
  await expect(p).toHaveURL(/\/change-password/);
  await go(p, "/dashboard");
  await expect(p).toHaveURL(/\/change-password/);
});

test("Owner: a weak new password is refused", async () => {
  const p = (shown = s.owner);
  await p.fill('input[name="current"]', s.ownerTemp);
  await p.fill('input[name="next"]', "abcdefgh");
  await p.fill('input[name="confirm"]', "abcdefgh");
  await p.click('button[type="submit"]');
  await expect(p.getByText("at least one letter and one number")).toBeVisible();
});

test("Owner: choosing a password opens the welcome screen", async () => {
  const p = (shown = s.owner);
  await p.fill('input[name="current"]', s.ownerTemp);
  await p.fill('input[name="next"]', OWNER_PASSWORD);
  await p.fill('input[name="confirm"]', OWNER_PASSWORD);
  await p.click('button[type="submit"]');
  await expect(p).toHaveURL(/\/welcome/);
  await expect(p.getByRole("heading", { name: "Welcome to Lasan Grow, Olivia" })).toBeVisible();
});

test("Owner: a new workspace starts empty", async () => {
  const p = (shown = s.owner);
  await go(p, "/dashboard");
  await expect(p.getByText("Your dashboard wakes up with your first deal")).toBeVisible();
});

test("Isolation: search never returns another workspace's data", async () => {
  test.skip(!OTHER_WORKSPACE_TERM, "Set E2E_OTHER_WORKSPACE_TERM to a word from another workspace");
  const p = (shown = s.owner);
  await p.keyboard.press("Control+k");
  await p.getByRole("textbox", { name: "Search" }).fill(OTHER_WORKSPACE_TERM);
  await p.waitForTimeout(2000);
  await expect(p.getByRole("dialog", { name: "Search" }).getByRole("option")).toHaveCount(0);
  await p.keyboard.press("Escape");
});

// ---------- Owner: settings ----------

test("Settings: change the currency, and it stays changed", async () => {
  const p = (shown = s.owner);
  await go(p, "/settings");
  const form = p.locator("form", { has: p.getByRole("button", { name: "Save workspace" }) });
  await form.locator('select[name="currency"]').selectOption("USD");
  await form.getByRole("button", { name: "Save workspace" }).click();
  await expect(p.getByText("Workspace saved")).toBeVisible();
  await expect(form.locator('select[name="currency"]')).toHaveValue("USD");
  await p.reload();
  await expect(p.locator('select[name="currency"]')).toHaveValue("USD");
});

test("Settings: add a pipeline stage", async () => {
  const p = (shown = s.owner);
  await p.fill('input[placeholder="New stage name"]', "Legal review");
  await p.locator("form", { has: p.locator('input[placeholder="New stage name"]') }).locator('button[type="submit"]').click();
  await expect(p.locator('input[aria-label="Stage name"][value="Legal review"]')).toBeVisible();
});

test("Settings: upload a profile photo, cropped in the browser", async () => {
  const p = (shown = s.owner);
  // A 2x2 PNG is enough for the cropper; it's scaled up to the 320px square that gets saved.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGPgz9nbtu09Q9u29/w5ewEtSgbHHd/w/AAAAABJRU5ErkJggg==", "base64");
  await p.locator('input[type="file"]').setInputFiles({ name: "me.png", mimeType: "image/png", buffer: png });
  await dialog(p).getByRole("button", { name: "Use photo" }).click();
  await expect(p.locator('header img[src^="/profile-photo/"]')).toBeVisible();
});

test("Team: add a teammate with a temporary password", async () => {
  const p = (shown = s.owner);
  await p.getByRole("link", { name: "Team", exact: true }).first().click();
  await expect(p).toHaveURL(/\/team/);
  await p.getByRole("button", { name: "Add teammate" }).click();
  const d = dialog(p);
  await d.locator('input[name="name"]').fill("Manu Member");
  await d.locator('input[name="email"]').fill(MATE);
  await d.locator('input[name="password"]').fill(MATE_TEMP);
  await d.getByRole("button", { name: "Add teammate" }).click();
  await expect(p.getByText("Manu Member can now sign in")).toBeVisible();
  await expect(p.getByText(MATE)).toBeVisible();
  await expect(p.getByRole("row", { name: /Manu Member/ }).getByText("Invited")).toBeVisible();
});

// ---------- Owner: companies, contacts, leads ----------

test("Companies: create a company", async () => {
  const p = (shown = s.owner);
  await go(p, "/companies");
  await p.getByRole("button", { name: "New company" }).click();
  await dialog(p).locator('input[name="name"]').fill("Acme E2E");
  await dialog(p).locator('input[name="domain"]').fill("acme-e2e.com");
  await dialog(p).locator('input[name="city"]').fill("Bengaluru");
  await dialog(p).getByRole("button", { name: /Create|Save|Add/ }).last().click();
  await expect(p.getByText("Acme E2E").first()).toBeVisible();
});

test("Contacts: create a contact linked to the company", async () => {
  const p = (shown = s.owner);
  await go(p, "/contacts");
  await p.getByRole("button", { name: "New contact" }).click();
  const d = dialog(p);
  await d.locator('input[name="firstName"]').fill("Priya");
  await d.locator('input[name="lastName"]').fill("Nair");
  await d.locator('input[name="email"]').fill("priya@acme-e2e.com");
  await d.locator('select[name="companyId"]').selectOption({ label: "Acme E2E" });
  await d.getByRole("button", { name: /Create|Save|Add/ }).last().click();
  await expect(p.getByText("Priya Nair").first()).toBeVisible();
});

test("Contacts: the contact shows on the company's page", async () => {
  const p = (shown = s.owner);
  await go(p, "/companies");
  await p.getByRole("link", { name: /Acme E2E/ }).first().click();
  await expect(p).toHaveURL(/\/companies\/[0-9a-f-]+/);
  await expect(p.getByText("Priya Nair").first()).toBeVisible();
});

test("Contacts: list search filters as you type", async () => {
  const p = (shown = s.owner);
  await go(p, "/contacts");
  await p.getByPlaceholder(/Search name/).fill("priya");
  await expect(p.locator("tbody tr")).toHaveCount(1);
});

test("Leads: add a lead and it gets a score", async () => {
  const p = (shown = s.owner);
  await go(p, "/leads");
  await p.getByRole("button", { name: "New lead" }).click();
  const d = dialog(p);
  await d.locator('input[name="name"]').fill("Rahul Verma");
  await d.locator('input[name="companyName"]').fill("Globex E2E");
  await d.locator('input[name="email"]').fill("rahul@globex-e2e.com");
  await d.locator('input[name="phone"]').fill("+91 98450 00000");
  await d.locator('input[name="estimatedValue"]').fill("250000");
  await d.getByRole("button", { name: "Add lead" }).click();
  await expect(p.locator("tr", { hasText: "Rahul Verma" })).toBeVisible();
});

test("Leads: change the status inline", async () => {
  const p = (shown = s.owner);
  await p.locator('select[aria-label="Status for Rahul Verma"]').selectOption("qualified");
  await p.waitForTimeout(1500);
  await p.reload();
  await expect(p.locator('select[aria-label="Status for Rahul Verma"]')).toHaveValue("qualified");
});

test("Leads: convert into contact, company and deal", async () => {
  const p = (shown = s.owner);
  await p.locator("tr", { hasText: "Rahul Verma" }).getByRole("button", { name: "Convert" }).click();
  await dialog(p).getByRole("button", { name: "Convert lead" }).click();
  await expect(p).toHaveURL(/\/deals\/[0-9a-f-]+/);
  await expect(p.getByText("Globex E2E").first()).toBeVisible();
  s.convertedDeal = p.url();
});

// ---------- Owner: deals ----------

test("Deals: create a deal", async () => {
  const p = (shown = s.owner);
  await go(p, "/deals");
  await p.getByRole("link", { name: "New deal" }).click();
  const d = dialog(p);
  await d.locator('input[name="title"]').fill("Acme annual license");
  await d.locator('input[name="value"]').fill("500000");
  await d.locator('select[name="contactId"]').selectOption({ label: "Priya Nair" });
  await d.getByRole("button", { name: "Create deal" }).click();
  await expect(p.getByText("Acme annual license").first()).toBeVisible();
});

test("Deals: move the deal along the stages", async () => {
  const p = (shown = s.owner);
  await p.getByRole("link", { name: /Acme annual license/ }).first().click();
  await expect(p).toHaveURL(/\/deals\/[0-9a-f-]+/);
  await p.getByTitle("Move to Proposal sent").click();
  await p.waitForTimeout(1500);
  await p.reload();
  await expect(p.getByText("Proposal sent").first()).toBeVisible();
});

test("Deals: log a note", async () => {
  const p = (shown = s.owner);
  await p.locator('input[name="subject"]').fill("Pricing call went well");
  await p.getByRole("button", { name: "Log it" }).click();
  await expect(p.getByText("Pricing call went well")).toBeVisible();
});

test("Deals: add a follow-up task", async () => {
  const p = (shown = s.owner);
  await p.getByRole("button", { name: "Task" }).first().click();
  await p.locator('input[name="subject"]').fill("Send revised quote E2E");
  const due = new Date(Date.now() + 86_400_000);
  const pad = (n) => String(n).padStart(2, "0");
  await p.locator('input[name="dueAt"]').fill(`${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}T10:00`);
  await p.getByRole("button", { name: "Add task" }).click();
  await expect(p.getByText("Send revised quote E2E")).toBeVisible();
});

test("Deals: mark the deal won", async () => {
  const p = (shown = s.owner);
  await p.getByRole("button", { name: /Mark won/ }).click();
  await p.waitForTimeout(1500);
  await p.reload();
  await expect(p.getByText(/^Won$/).first()).toBeVisible();
});

test("Deals: mark the converted deal lost, with a reason", async () => {
  const p = (shown = s.owner);
  await go(p, s.convertedDeal);
  await p.getByRole("button", { name: /^Lost$/ }).click();
  await dialog(p).locator('input[name="reason"]').fill("Chose competitor");
  await dialog(p).getByRole("button", { name: "Mark lost" }).click();
  await p.waitForTimeout(1500);
  await p.reload();
  await expect(p.getByText(/^Lost$/).first()).toBeVisible();
});

test("Dashboard: shows the won revenue and the lost reason", async () => {
  const p = (shown = s.owner);
  await go(p, "/dashboard");
  await expect(p.getByText("Won this month")).toBeVisible();
  await expect(p.locator("main")).toContainText("$5");
  await expect(p.locator("main")).toContainText("Chose competitor");
});

// ---------- Owner: tasks, search, themes ----------

test("Tasks: the task is in the inbox and can be completed", async () => {
  const p = (shown = s.owner);
  await go(p, "/tasks");
  await expect(p.getByText("Send revised quote E2E")).toBeVisible();
  await p.getByRole("button", { name: 'Complete "Send revised quote E2E"' }).click();
  await expect(p.getByRole("button", { name: 'Mark "Send revised quote E2E" as not done' })).toBeVisible();
});

test("Tasks: create a task from the Tasks page", async () => {
  const p = (shown = s.owner);
  await p.getByRole("button", { name: "New task" }).click();
  await dialog(p).locator('input[name="subject"]').fill("Quarterly review E2E");
  await dialog(p).getByRole("button", { name: "Add task" }).click();
  await expect(p.getByText("Quarterly review E2E")).toBeVisible();
});

test("Search: Ctrl+K finds records across modules and opens one", async () => {
  const p = (shown = s.owner);
  await go(p, "/dashboard");
  await p.keyboard.press("Control+k");
  await p.getByRole("textbox", { name: "Search" }).fill("acme");
  const options = p.getByRole("dialog", { name: "Search" }).getByRole("option");
  await expect(options.first()).toBeVisible();
  const all = (await options.allInnerTexts()).join(" | ");
  expect(all).toMatch(/Company/i);
  expect(all).toMatch(/Deal/i);
  await p.keyboard.press("Enter");
  await expect(p).toHaveURL(/\/(deals|companies|contacts)\//);
});

test("UI: switch to the black theme and back", async () => {
  const p = (shown = s.owner);
  await go(p, "/dashboard");
  await p.getByRole("button", { name: "Switch to black theme" }).click();
  await expect(p.locator("html")).toHaveClass(/dark/);
  await p.getByRole("button", { name: "Switch to white theme" }).click();
  await expect(p.locator("html")).not.toHaveClass(/dark/);
});

// ---------- Teammate ----------

test("Teammate: first sign-in, own password, sees the shared workspace", async () => {
  const p = (shown = s.mate);
  await signIn(p, MATE, MATE_TEMP);
  await expect(p).toHaveURL(/\/change-password/);
  await p.fill('input[name="current"]', MATE_TEMP);
  await p.fill('input[name="next"]', MATE_PASSWORD);
  await p.fill('input[name="confirm"]', MATE_PASSWORD);
  await p.click('button[type="submit"]');
  await expect(p).toHaveURL(/\/welcome/);
  await go(p, "/deals?view=list&status=all");
  await expect(p.getByText("Acme annual license").first()).toBeVisible();
});

test("Teammate: members can't manage the team", async () => {
  const p = (shown = s.mate);
  await go(p, "/team");
  await expect(p.getByText(MATE)).toBeVisible();
  await expect(p.getByRole("button", { name: "Add teammate" })).toHaveCount(0);
  await expect(p.getByRole("button", { name: /Make (admin|member)/ })).toHaveCount(0);
});

test("Security: 5 wrong passwords lock the account", async () => {
  test.setTimeout(180_000); // six sign-ins against the live site
  const p = (shown = s.mate);
  for (let i = 0; i < 5; i++) {
    await signIn(p, MATE, `Wrong${i}pass`);
    await expect(p.getByText("Wrong email or password")).toBeVisible();
  }
  await signIn(p, MATE, MATE_PASSWORD);
  await expect(p.getByText("Too many failed attempts")).toBeVisible();
});

// ---------- Lasan staff: operate the client ----------

test("Console: the workspace list shows the client's 2 people and 2 deals", async () => {
  const p = (shown = s.staff);
  await go(p, CONSOLE + "/platform");
  // Columns: Company, Owner, Status, People, Deals, …
  const row = p.locator("tr", { hasText: WORKSPACE }).first();
  await expect(row.locator("td").nth(3)).toHaveText("2");
  await expect(row.locator("td").nth(4)).toHaveText("2");
});

test("Console: suspending signs the client out and blocks sign-in", async () => {
  const p = (shown = s.staff);
  // The owner is signed in, then staff suspend the workspace from the console.
  await signIn(s.owner, OWNER, OWNER_PASSWORD);
  await expect(s.owner).toHaveURL(/\/welcome/);
  await go(p, CONSOLE + "/platform");
  const row = p.locator("tr", { hasText: WORKSPACE }).first();
  await row.getByRole("button", { name: "Suspend" }).click();
  await expect(row.getByText("Suspended")).toBeVisible();
  await go(s.owner, "/dashboard");
  await expect(s.owner).toHaveURL(/\/login/);
  await signIn(s.owner, OWNER, OWNER_PASSWORD);
  await expect(s.owner.getByText("This workspace is suspended")).toBeVisible();
});

test("Console: reactivating lets the client back in", async () => {
  const p = (shown = s.staff);
  await go(p, CONSOLE + "/platform");
  const row = p.locator("tr", { hasText: WORKSPACE }).first();
  await row.getByRole("button", { name: "Reactivate" }).click();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();
  await signIn(s.owner, OWNER, OWNER_PASSWORD);
  await expect(s.owner).toHaveURL(/\/welcome/);
});

test("Console: resetting the owner's password revokes the old one", async () => {
  const p = (shown = s.staff);
  await go(p, CONSOLE + "/platform");
  const row = p.locator("tr", { hasText: WORKSPACE }).first();
  await row.getByRole("button", { name: "Reset owner password" }).click();
  const fresh = await shownPassword(p);
  await dialog(p).getByRole("button", { name: "Done" }).click();
  await go(s.owner, "/dashboard");
  await expect(s.owner).toHaveURL(/\/login/);
  await signIn(s.owner, OWNER, OWNER_PASSWORD);
  await expect(s.owner.getByText("Wrong email or password")).toBeVisible();
  await signIn(s.owner, OWNER, fresh);
  await expect(s.owner).toHaveURL(/\/change-password/);
});

// ---------- Phone and wrap-up ----------

test("Phone: the site fits a phone screen", async () => {
  const p = (shown = s.visitor);
  // As a signed-out visitor: signed-in people see "Open Lasan Grow" instead of "Sign in".
  await p.context().clearCookies({ name: "lg_session" });
  await p.setViewportSize({ width: 390, height: 844 });
  await go(p, SITE + "/");
  await expect(p.getByRole("link", { name: /Sign in/ }).first()).toBeVisible();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await p.setViewportSize({ width: 1440, height: 900 });
  expect(overflow).toBe(false);
});

test("Console: sign out", async () => {
  const p = (shown = s.staff);
  await go(p, CONSOLE + "/platform");
  await p.getByRole("button", { name: /Account:/ }).click();
  await p.getByRole("button", { name: "Sign out" }).click();
  await expect(p).toHaveURL(/\/platform\/login/);
});

test("Runtime: no browser errors on any page", async () => {
  shown = null;
  const errors = s.owner.errors;
  expect(errors, errors.join("\n")).toEqual([]);
});
