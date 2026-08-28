/**
 * Visual QA helper: node scripts/dev/screenshot.mjs <url> <out.png> [w] [h] [full] [waitMs]
 * Uses the environment's preinstalled Chromium when the Playwright-managed
 * build is unavailable (CHROMIUM_PATH overrides).
 */
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";

const [url, out, width = "1440", height = "900", full = "0", waitMs = "1400"] = process.argv.slice(2);

const candidates = [
  process.env.CHROMIUM_PATH,
  "/opt/pw-browsers/chromium",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));

const browser = await chromium.launch(
  executablePath ? { executablePath, args: ["--no-sandbox"] } : {},
);
const page = await browser.newPage({ viewport: { width: +width, height: +height } });
await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
await page.waitForTimeout(+waitMs);
await page.screenshot({ path: out, fullPage: full === "1" });
await browser.close();
console.log("saved", out);
