import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
const exe = ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const browser = await chromium.launch(exe ? { executablePath: exe, args: ["--no-sandbox"] } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = process.env.OUT_DIR ?? ".";

// 1. Unauthenticated /admin should redirect to login
await page.goto(`${base}/admin`, { waitUntil: "load" });
console.log("redirected to:", page.url());

// 2. Login
await page.fill('input[name="email"]', "admin@humusoncomplex.com");
await page.fill('input[name="password"]', "humuson-dev-admin");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin", { timeout: 20000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/admin-overview.png` });
console.log("logged in:", page.url());

// 3. Products list
await page.goto(`${base}/admin/products`, { waitUntil: "load" });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/admin-products.png` });

// 4. Edit first product
const first = await page.locator("tbody tr td a").first().getAttribute("href");
await page.goto(`${base}${first}`, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/admin-product-edit.png` });
console.log("edit page:", first);

// 5. FAQ list with test panel
await page.goto(`${base}/admin/faqs`, { waitUntil: "load" });
await page.fill('input[aria-label="Test question"]', "How do I use IN5?");
await page.click('button[aria-label="Test"]');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/admin-faqs.png` });

await browser.close();
console.log("smoke ok");
