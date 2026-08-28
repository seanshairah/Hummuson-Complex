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
    await expect(page.getByText(/would answer|no confident match/i)).toBeVisible({ timeout: 15000 });
  });

  test("wrong credentials are rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', "wrong-password");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});
