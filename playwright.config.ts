import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const chromiumCandidates = [
  process.env.CHROMIUM_PATH,
  "/opt/pw-browsers/chromium",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
].filter((p): p is string => Boolean(p));
const executablePath = chromiumCandidates.find((p) => existsSync(p));

const PORT = Number(process.env.E2E_PORT ?? 3111);

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...(executablePath ? { launchOptions: { executablePath, args: ["--no-sandbox"] } } : {}),
  },
  /*
   * The read-only public journeys run first, in parallel, on both profiles.
   * The admin specs run after them, because they write: the editorial flow
   * edits a product and the price import applies a change, and under
   * `fullyParallel` those landed in the middle of public assertions reading the
   * same rows. The result was three tests that failed in a full run and passed
   * every time in isolation — the shape of a race, not of a bug, and the sort
   * that gets re-run rather than read.
   *
   * Splitting by file rather than serialising the whole suite keeps the public
   * run parallel, which is where most of the tests are.
   */
  projects: [
    {
      name: "desktop",
      testIgnore: /admin\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testIgnore: /admin\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "admin-desktop",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["desktop", "mobile"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin-mobile",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["desktop", "mobile"],
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      // Every profile signs in from the same address and the suite is run
      // repeatedly inside one 15-minute window, so the shared-address ceiling
      // would otherwise stop the run. The per-account limit — the one the
      // lockout test actually asserts against — is left at its default.
      LOGIN_IP_ATTEMPT_LIMIT: "500",
    },
  },
});
