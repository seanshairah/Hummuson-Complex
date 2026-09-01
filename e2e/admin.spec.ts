import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

/**
 * Unique per run, so tests that lock accounts out or enrol a second factor
 * cannot interfere with each other or with the shared admin account.
 *
 * crypto rather than Math.random(): these values become passwords, and a
 * predictable password is a predictable password whatever generated it.
 */
function unique(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

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
    // Scoped to the result, not the page: the instructions above the form say
    // "preview what Ask Humuson would answer", so a page-wide match passed by
    // finding those words in the hint and then broke once the real answer
    // rendered alongside them.
    const preview = page.getByTestId("ask-preview-result");
    await expect(preview).toBeVisible({ timeout: 15000 });
    await expect(preview).toHaveText(/would answer|no confident match/i);
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
    const target = `lockout-${unique()}@example.test`;

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
    const stamp = unique();
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

test.describe("audit log", () => {
  test("records a sign-in and a content change, and shows them to an admin", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin");

    // A content change that should be attributable afterwards.
    const label = `Audit probe ${Date.now()}`;
    await page.goto("/admin/testimonials");
    await page.getByRole("button", { name: /new testimonial/i }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[name="name"]').fill(label);
    await dialog.locator('textarea[name="quote"], input[name="quote"]').first().fill("Probe quote.");
    await dialog.getByRole("button", { name: "Save" }).click();
    // Wait for the save to land before navigating: under parallel load,
    // leaving the page first can abort it and there is then nothing to find.
    await expect(page.getByText(label).first()).toBeVisible();

    await page.goto("/admin/audit");
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
    await expect(page.getByText("auth.signed_in").first()).toBeVisible();
    await expect(page.getByText(label).first()).toBeVisible();
    // The entry has to name who did it, or it is not an audit log.
    await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible();
  });
});

test.describe("two-factor authentication", () => {
  // Walks the whole thing through the real interface: enrol, sign out, sign in
  // with a password and then a code, and confirm a wrong code is refused.
  // The code is generated the way an authenticator app would, from the secret
  // the enrolment screen hands over.
  test("enrolling adds a second step to sign-in", async ({ browser }) => {
    const { TOTP, Secret } = await import("otpauth");
    const stamp = unique();
    const email = `mfa-${stamp}@example.test`;
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
    await dialog.locator('input[name="name"]').fill(`MFA probe ${stamp}`);
    await dialog.locator('input[name="email"]').fill(email);
    await dialog.locator('input[name="password"]').fill(password);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(admin.getByText(email)).toBeVisible();
    await adminContext.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin");

    // Enrol, taking the secret the way a person copying it by hand would.
    await page.goto("/admin/security");
    await expect(page.getByText(/not yet set up/i)).toBeVisible();
    const secret = (await page.locator("code").first().innerText()).trim();
    const totp = new TOTP({
      issuer: "Humuson Complex",
      label: email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    });
    await page.locator('input[name="code"]').fill(totp.generate());
    await page.getByRole("button", { name: /turn on two-factor/i }).click();
    await expect(page.getByText(/save these recovery codes/i)).toBeVisible();

    // Sign out, then back in — the password alone must no longer be enough.
    await context.clearCookies();
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByText(/enter the 6-digit code/i)).toBeVisible();

    // A wrong code is refused and the step stays open.
    await page.locator('input[name="code"]').fill("000000");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText(/code wasn.t right/i)).toBeVisible();

    // The right one gets through. React clears the field after the action
    // settles, so wait for that before typing — otherwise the reset lands on
    // top of the value and an empty code is submitted.
    await expect(page.locator('input[name="code"]')).toHaveValue("");
    await page.locator('input[name="code"]').fill(totp.generate());
    await expect(page.locator('input[name="code"]')).not.toHaveValue("");
    await page.getByRole("button", { name: "Verify" }).click();
    await page.waitForURL("**/admin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    await context.close();
  });
});
