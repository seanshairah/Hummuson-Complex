/**
 * Layout sweep: every route, four widths, checking for the one defect that is
 * invisible in a code review and obvious to a user — the page being wider than
 * the screen.
 *
 * Page-level horizontal overflow is almost always a shared cause (a fixed-width
 * child, a grid that will not shrink, a table outside its scroll container), so
 * a sweep that names every affected route at once tells you where the cause
 * lives. Per-page eyeballing does not.
 *
 * Admin routes are included when ADMIN_EMAIL and ADMIN_PASSWORD are set; they
 * are the screens with the wide tables, so they are the ones worth checking.
 *
 *   npm run qa:layout                 # against a running server
 *   QA_BASE_URL=http://localhost:3111 npm run qa:layout
 */
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const WIDTHS = {
  mobile: [390, 844],
  tablet: [820, 1180],
  laptop: [1280, 900],
  desktop: [1800, 1100],
};

const PUBLIC_ROUTES = [
  "/", "/products", "/products/in5", "/crops", "/crops/brassicas", "/product-finder",
  "/knowledge", "/videos", "/projects", "/faq", "/about", "/contact", "/solutions",
  "/where-to-buy", "/search?q=maize", "/catalogue", "/privacy", "/not-a-real-page",
];

const ADMIN_ROUTES = [
  "/admin", "/admin/products", "/admin/products/new", "/admin/categories", "/admin/crops",
  "/admin/distributors", "/admin/catalogue", "/admin/media", "/admin/faqs", "/admin/articles",
  "/admin/videos", "/admin/projects", "/admin/testimonials", "/admin/enquiries",
  "/admin/analytics", "/admin/settings", "/admin/users", "/admin/security", "/admin/audit",
];

const candidates = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium"].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));

const browser = await chromium.launch(
  executablePath ? { executablePath, args: ["--no-sandbox"] } : {},
);
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

const canAdmin = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
if (canAdmin) {
  const page = await context.newPage();
  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', process.env.ADMIN_EMAIL);
  await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 20000 }).catch(() => {});
  await page.close();
}

const routes = [...PUBLIC_ROUTES, ...(canAdmin ? ADMIN_ROUTES : [])];
const problems = [];

for (const route of routes) {
  const cells = [];
  for (const [name, [width, height]] of Object.entries(WIDTHS)) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height });
    const res = await page
      .goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" })
      .catch(() => null);
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) problems.push(`${route} @${name} (${width}px): ${overflow}px too wide`);
    cells.push(`${name}:${res?.status() ?? "ERR"}${overflow > 1 ? `+${overflow}` : ""}`);
    await page.close();
  }
  console.log(`${route.padEnd(24)} ${cells.join("  ")}`);
}

await browser.close();

if (!canAdmin) console.log("\n(admin routes skipped — set ADMIN_EMAIL and ADMIN_PASSWORD to include them)");
if (problems.length) {
  console.error(`\nFAIL — horizontal overflow on ${problems.length} route/width pairs:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`\nPASS — no horizontal overflow across ${routes.length} routes × 4 widths`);
