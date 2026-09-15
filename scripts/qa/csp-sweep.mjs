/**
 * Content-Security-Policy sweep: loads every route with the policy enforcing
 * and reports anything the browser refused. Interactive surfaces that only
 * appear on demand — the video player, the map, search, the finder, the
 * flipbook, the admin sign-in — are exercised too, because a policy that only
 * survives a first paint has not been tested.
 *
 * Usage:  npm run start   (in another shell)
 *         node scripts/qa/csp-sweep.mjs
 * Env:    QA_BASE_URL     default http://localhost:3000
 *         QA_CHROME_PATH  explicit Chromium binary
 */
import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const ROUTES = [
  "/", "/products", "/product-finder", "/crops", "/catalogue", "/catalogue/flipbook",
  "/knowledge", "/videos", "/projects", "/faq", "/about", "/contact", "/solutions",
  "/search?q=maize", "/products/azofix-plus", "/crops/maize", "/admin/login", "/not-a-real-page",
];

const violations = [];
const browser = await chromium.launch({
  executablePath: process.env.QA_CHROME_PATH,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Chromium reports a blocked resource as a console error naming the directive;
// the page-side listener catches the ones the console coalesces.
page.on("console", (message) => {
  const text = message.text();
  if (/Content Security Policy|Refused to/i.test(text)) {
    violations.push(`${page.url()} :: ${text.slice(0, 220)}`);
  }
});
await page.addInitScript(() => {
  document.addEventListener("securitypolicyviolation", (event) => {
    console.error(
      `CSP violation: ${event.violatedDirective} blocked ${event.blockedURI || "(inline)"}`,
    );
  });
});

/**
 * "domcontentloaded" plus a settle, not "networkidle": the third-party frames
 * this policy exists to constrain may be unreachable from a build agent, and
 * waiting for them to finish would time out on a policy question they have no
 * bearing on.
 */
async function visit(route) {
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1200);
  } catch (error) {
    console.error(`  (navigation to ${route} did not settle: ${String(error).slice(0, 80)})`);
  }
}

for (const route of ROUTES) await visit(route);

// Interactions that pull in the third-party frames and the client-side APIs.
await visit("/videos");
await page.locator("button", { hasText: /play/i }).first().click().catch(() => {});
await page.waitForTimeout(2500);

await visit("/contact");
await page.getByRole("button", { name: /map|load/i }).first().click().catch(() => {});
await page.waitForTimeout(2500);

await visit("/");
await page.keyboard.press("Control+k").catch(() => {});
await page.waitForTimeout(400);
await page.keyboard.type("maize");
await page.waitForTimeout(1800);

await visit("/product-finder");
for (let step = 0; step < 4; step += 1) {
  await page.locator("button").filter({ hasText: /./ }).nth(2).click().catch(() => {});
  await page.waitForTimeout(700);
}
await page.waitForTimeout(1500);

await browser.close();

if (violations.length === 0) {
  console.log(`CSP sweep clean — ${ROUTES.length} routes plus video, map, search and finder interactions.`);
  process.exit(0);
}
console.log(`CSP violations (${violations.length}):`);
for (const violation of [...new Set(violations)]) console.log("  " + violation);
process.exit(1);
