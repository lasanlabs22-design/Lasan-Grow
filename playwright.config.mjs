import { defineConfig, devices } from "@playwright/test";

// End-to-end / UAT suite. Runs against any deployment:
//   npm run test:e2e        local dev server (http://localhost:3000, start it first)
//   npm run test:e2e:live   the live site, with a temporary console account that is removed afterwards
// Open the visual report with: npm run test:report
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: process.env.E2E_HEADED ? 180_000 : 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    // E2E_HEADED=1 shows the browser windows, slowed down so a person can follow each click.
    headless: !process.env.E2E_HEADED,
    launchOptions: { slowMo: process.env.E2E_HEADED ? Number(process.env.E2E_SLOWMO ?? 350) : 0 },
    screenshot: "on",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
