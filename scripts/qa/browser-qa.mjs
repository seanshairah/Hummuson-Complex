/**
 * Browser QA sweep: loads every public route at mobile, tablet and desktop
 * widths and reports console errors, horizontal overflow, the homepage
 * statistics, a full Product Finder walkthrough and a search query.
 *
 * Usage:  npm run start   (in another shell)
 *         node scripts/qa/browser-qa.mjs
 * Env:    QA_BASE_URL       default http://localhost:3000
 *         QA_CHROME_PATH    explicit Chromium binary, when Playwright's
 *                           bundled revision is not present
 */
import { chromium, devices } from "@playwright/test";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const ROUTES = ["/", "/products", "/product-finder", "/crops", "/catalogue", "/knowledge",
  "/videos", "/projects", "/faq", "/about", "/contact", "/solutions", "/search",
  "/products/azofix-plus", "/crops/maize"];
const VIEWPORTS = [
  { name: "mobile",  width: 390,  height: 844 },
  { name: "tablet",  width: 820,  height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch({ executablePath: process.env.QA_CHROME_PATH, args: ["--no-sandbox"] });
const consoleErrors = [];
const overflow = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`[${vp.name}] ${page.url()} :: ${m.text().slice(0,160)}`); });
  page.on("pageerror", (e) => consoleErrors.push(`[${vp.name}] ${page.url()} :: PAGEERROR ${String(e).slice(0,160)}`));
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const o = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    if (o.scrollW > o.clientW + 1) overflow.push(`[${vp.name}] ${route} scrollW=${o.scrollW} clientW=${o.clientW}`);
  }
  await ctx.close();
}

// Homepage stats at each width
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const stats = await page.evaluate(() =>
  [...document.querySelectorAll("dl dd")].map((d) => d.textContent.trim()).filter(Boolean));
console.log("HOMEPAGE STATS (after animation):", JSON.stringify(stats));

// Product finder: full 4-answer walkthrough
await page.goto(BASE + "/product-finder", { waitUntil: "networkidle" });
const pick = async (label) => {
  const btn = page.locator("button", { hasText: label }).first();
  await btn.click(); await page.waitForTimeout(500);
};
await pick("Maize");
await pick("Root development");
await page.locator("button", { hasText: "Seed" }).first().click(); await page.waitForTimeout(500);
await page.locator("button", { hasText: "Not sure" }).first().click();
await page.waitForTimeout(2500);
const finderHeading = await page.locator("h2").first().textContent();
const finderCards = await page.locator("article, a[href^='/products/']").count();
console.log("FINDER maize/root/seed/not-sure ->", finderHeading?.trim(), "| product links:", finderCards);

// Search
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.keyboard.press("Control+k"); await page.waitForTimeout(400);
await page.keyboard.type("maize"); await page.waitForTimeout(1200);
const searchResults = await page.locator("[role=dialog] button, [role=dialog] a").count();
console.log("SEARCH 'maize' -> interactive results:", searchResults);

await ctx.close();
await browser.close();

console.log("\nCONSOLE ERRORS:", consoleErrors.length);
consoleErrors.slice(0, 15).forEach((e) => console.log("  " + e));
console.log("\nHORIZONTAL OVERFLOW:", overflow.length);
overflow.forEach((o) => console.log("  " + o));
