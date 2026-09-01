import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@humusoncomplex.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "humuson-dev-admin";

test.describe("admin", () => {
  test("unauthenticated admin visits redirect to login", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("full editorial flow: login → edit product → publish state visible", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin");

    // Overview shows live stat cards
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Products \d+ published/ })).toBeVisible();

    // Products table lists the migrated range
    await page.goto("/admin/products");
    await expect(page.getByRole("link", { name: /IN5/ }).first()).toBeVisible();

    // FAQ test tool answers a known question
    await page.goto("/admin/faqs");
    await page.getByRole("textbox", { name: "Test question" }).fill("What is the shelf life?");
    await page.getByRole("button", { name: "Test" }).click();
    await expect(page.getByText(/would answer|no confident match/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test("signs in when autofill leaves whitespace or odd case in the email", async ({ page }) => {
    // Reported from production: a pasted/autofilled address with a stray space
    // failed .email() validation and surfaced as "invalid email or password".
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', `  ${ADMIN_EMAIL.toUpperCase()} `);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  test("a rejected sign-in keeps the email so it need not be retyped", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', "wrong-password");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page.locator('input[name="email"]')).toHaveValue(ADMIN_EMAIL);
    await expect(page.locator('input[name="password"]')).toHaveValue("");
  });

  test("repeated wrong passwords lock the account out", async ({ page }) => {
    // A unique address per run, so this test cannot lock out the shared admin
    // account that every other test signs in with.
    const target = `lockout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await page.goto("/admin/login");
      await page.fill('input[name="email"]', target);
      await page.fill('input[name="password"]', `guess-${attempt}`);
      await page.click('button[type="submit"]');
      await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    }

    // The sixth attempt is refused by the limiter, and must say so rather than
    // claiming the password was wrong.
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', target);
    await page.fill('input[name="password"]', "guess-6");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/too many sign-in attempts/i)).toBeVisible();
    await expect(page.getByText(/try again in about/i)).toBeVisible();
  });

  test("wrong credentials are rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', "wrong-password");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});

test.describe("session revocation", () => {
  // Two browser contexts: an administrator in one, the account being acted on
  // in the other. A JWT session has no server-side record to delete, so the
  // only way to know revocation works is to watch a live session stop working.
  test("deactivating an account ends the session it is already signed in on", async ({
    browser,
  }) => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `revoked-${stamp}@example.test`;
    const password = `Temp-${stamp}-password`;

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await admin.goto("/admin/login");
    await admin.fill('input[name="email"]', ADMIN_EMAIL);
    await admin.fill('input[name="password"]', ADMIN_PASSWORD);
    await admin.click('button[type="submit"]');
    await admin.waitForURL("**/admin");

    await admin.goto("/admin/users");
    await admin.getByRole("button", { name: "New user" }).click();
    const dialog = admin.locator('[role="dialog"]');
    await dialog.locator('input[name="name"]').fill(`Revocation probe ${stamp}`);
    await dialog.locator('input[name="email"]').fill(email);
    await dialog.locator('input[name="password"]').fill(password);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByText(email)).toBeVisible();

    // The new account signs in and reaches the dashboard.
    const staffContext = await browser.newContext();
    const staff = await staffContext.newPage();
    await staff.goto("/admin/login");
    await staff.fill('input[name="email"]', email);
    await staff.fill('input[name="password"]', password);
    await staff.click('button[type="submit"]');
    await staff.waitForURL("**/admin");
    await expect(staff.getByRole("heading", { name: "Overview" })).toBeVisible();

    // The administrator deactivates it while that session is live.
    const row = admin.locator("tr").filter({ hasText: email });
    await row.getByRole("button", { name: "Deactivate" }).click();
    await expect(row.getByText("Deactivated")).toBeVisible();

    // The already-signed-in session must stop working on its very next
    // request, not whenever its token next happens to be re-checked.
    await staff.goto("/admin");
    await expect(staff).toHaveURL(/\/admin\/login/);

    await adminContext.close();
    await staffContext.close();
  });
});
