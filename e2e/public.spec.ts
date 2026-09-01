import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("homepage renders the hero with real data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Healthy soil.");
    await expect(page.getByText("Products in range").last()).toBeVisible();
    await expect(page.getByRole("link", { name: /explore products/i }).first()).toBeVisible();
  });

  test("products page filters by benefit via URL", async ({ page }) => {
    await page.goto("/products?benefit=root-development");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Products");
    const cards = page.locator('a[href^="/products/"]');
    await expect(cards.first()).toBeVisible();
  });

  test("product detail shows verified facts and confirm-note", async ({ page }) => {
    await page.goto("/products/in5");
    await expect(page.getByRole("heading", { name: "IN5", exact: true })).toBeVisible();
    await expect(page.getByText("Package sizes")).toBeVisible();
    await expect(page.getByText(/confirm the recommended application/i).first()).toBeVisible();
  });

  test("crop page renders the growth timeline", async ({ page }) => {
    await page.goto("/crops/maize");
    await expect(page.getByRole("heading", { name: "Maize", exact: true })).toBeVisible();
    await expect(page.getByRole("tablist", { name: /growth stages/i })).toBeVisible();
  });

  test("faq page answers are searchable", async ({ page }) => {
    await page.goto("/faq");
    await page.getByRole("textbox", { name: /search frequently asked/i }).fill("shelf life");
    await expect(page.getByRole("button", { name: /shelf life/i })).toBeVisible();
  });

  test("legacy WordPress URLs redirect to new destinations", async ({ page }) => {
    const response = await page.goto("/product/in5-2/");
    expect(response?.url()).toContain("/products/in5");
    const shop = await page.goto("/shop/");
    expect(shop?.url()).toContain("/products");
  });

  test("404 page offers useful next actions", async ({ page }) => {
    await page.goto("/definitely-not-a-page");
    await expect(page.getByText(/404/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /back home/i })).toBeVisible();
  });
});

test.describe("knowledge engine APIs", () => {
  test("search returns ranked results for maize root", async ({ request }) => {
    const response = await request.get("/api/search?q=maize+root");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].href).toContain("/products/");
  });

  test("ask answers a rate question with real guidance", async ({ request }) => {
    const response = await request.post("/api/ask", {
      data: { question: "How do I apply IN5?" },
    });
    const data = await response.json();
    expect(data.matched).toBe(true);
    expect(data.answerHtml).toContain("1L – 3L");
  });

  test("ask refuses to invent answers", async ({ request }) => {
    const response = await request.post("/api/ask", {
      data: { question: "Can I mix this with rocket fuel additive XYZ?" },
    });
    const data = await response.json();
    expect(data.matched).toBe(false);
  });

  test("finder recommends products for maize root development", async ({ request }) => {
    const response = await request.post("/api/finder", {
      data: { cropSlug: "maize", benefitSlug: "root-development", stageKey: "seed" },
    });
    const data = await response.json();
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0].reasons.length).toBeGreaterThan(0);
  });
});

test.describe("catalogue", () => {
  test("explore mode lists chapters and links products", async ({ page }) => {
    await page.goto("/catalogue");
    await expect(page.getByRole("navigation", { name: /catalogue chapters/i })).toBeVisible();
    const productLink = page.locator('a[href^="/products/"]').first();
    await expect(productLink).toBeVisible();
  });

  test("flipbook deep link opens the right spread", async ({ page }) => {
    await page.goto("/catalogue/flipbook?page=4");
    await expect(page.getByText(/4–5 \/ \d+/)).toBeVisible();
  });
});
