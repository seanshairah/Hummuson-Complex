import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("homepage renders the hero with real data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Healthy soil.");
    await expect(page.getByText("Products in range").last()).toBeVisible();
    await expect(page.getByRole("link", { name: /explore products/i }).first()).toBeVisible();
  });

  /**
   * Open a products URL and read the slugs the grid is showing.
   *
   * `domcontentloaded`, not the default `load`: the grid is server-rendered, so
   * every link is in the first response, while `load` also waits on each
   * product photograph — and the first request for one makes a cold Next server
   * optimise it. On a two-core runner already busy with a second browser
   * project that pushed past the 45s test budget, which is a fact about the
   * runner rather than about the filter under test.
   *
   * Scoped to #main so the header and footer can never contribute a link.
   *
   * The results count is what tells us the grid has finished arriving. Reading
   * the links straight after `domcontentloaded` returned a partial grid once
   * the run got busy enough — the page streams, so "the document has parsed" is
   * not "the grid is here". That produced a total smaller than the filtered
   * subset it was being compared against: a failure that looked like a broken
   * filter and was a half-read page.
   */
  async function gridSlugs(page: import("@playwright/test").Page, url: string) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("product-results")).toBeVisible();
    return page
      .locator('#main a[href^="/products/"]')
      .evaluateAll((links) =>
        links.map((a) => a.getAttribute("href")!).filter((h) => h.split("/").length === 3),
      );
  }

  test("products page filters by purpose via URL", async ({ page }) => {
    const all = await gridSlugs(page, "/products");
    expect(all.length).toBeGreaterThan(0);

    const filtered = await gridSlugs(page, "/products?benefit=root-development");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(all.length);
  });

  test("a range filter narrows the grid, and a renamed range still resolves", async ({ page }) => {
    const current = await gridSlugs(page, "/products?category=crop-nutrition");
    expect(current.length).toBeGreaterThan(0);

    // "Value" was renamed to Crop Nutrition; links to the old one are in the
    // wild and have to land on the same products rather than the whole shop.
    expect(await gridSlugs(page, "/products?category=value")).toEqual(current);
  });

  test("a multi-range product is listed once under each of its ranges", async ({ page }) => {
    // NPK 12-11-30+TE is both a liquid foliar fertiliser and crop nutrition.
    for (const range of ["liquid-fertilisers", "crop-nutrition"]) {
      const slugs = await gridSlugs(page, `/products?category=${range}`);
      expect(slugs.filter((s) => s === "/products/npk-12-11-30-te")).toHaveLength(1);
    }
  });

  test("a crop group returns more than one of its crops does", async ({ page }) => {
    const group = await gridSlugs(page, "/products?crop=brassicas");
    const child = await gridSlugs(page, "/products?crop=cabbage");
    expect(group.length).toBeGreaterThan(0);
    // Everything listed for a single brassica is listed across the group.
    for (const slug of child) expect(group).toContain(slug);
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

  /**
   * A delisted product has two live URLs to answer for: the old WordPress one
   * and the one this site published itself. Both have to land somewhere rather
   * than 404, or every link to a withdrawn product in a WhatsApp thread or a
   * printed price list becomes a dead end.
   */
  test("delisted products redirect instead of 404ing", async ({ page }) => {
    const own = await page.goto("/products/azofix-plus", { waitUntil: "domcontentloaded" });
    expect(own?.url()).toMatch(/\/products$/);
    expect(own?.status()).toBe(200);

    const legacy = await page.goto("/product/bactoforce/", { waitUntil: "domcontentloaded" });
    expect(legacy?.url()).toMatch(/\/products$/);
    expect(legacy?.status()).toBe(200);
  });

  test("where to buy: pick a town, see its stockists, link each one out", async ({ page }) => {
    await page.goto("/where-to-buy", { waitUntil: "domcontentloaded" });

    // The town picker is a searchable combobox, not a row of chips: twenty-one
    // towns as buttons buried most of them.
    const picker = page.getByRole("button", { name: "Town" });
    await expect(picker).toBeVisible();

    await picker.click();
    await page.getByPlaceholder("Search towns").fill("Mutare");
    await page.getByRole("option", { name: /Mutare/ }).first().click();

    // The summary counts the actual results, not a hardcoded number.
    await expect(page.getByText(/stockists in\s+Mutare/)).toBeVisible();

    const farmline = page
      .locator("li")
      .filter({ has: page.getByRole("heading", { name: /Farmline Supplies/i }) });
    await expect(farmline).toContainText("9 First Street, Mutare");

    // Every directions link leaves for Google Maps — an internal one would mean
    // the page is pretending to know where the shop is.
    const directions = page.locator('#main a:has-text("Get directions")');
    expect(await directions.count()).toBeGreaterThan(0);
    for (const href of await directions.evaluateAll((links) =>
      links.map((a) => a.getAttribute("href") ?? ""),
    )) {
      expect(href).toContain("google.com/maps");
    }

    // Switching town switches the results with it.
    await picker.click();
    await page.getByPlaceholder("Search towns").fill("Bulawayo");
    await page.getByRole("option", { name: /Bulawayo/ }).first().click();
    await expect(page.getByRole("heading", { name: /Bulawayo Seed Centre/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Farmline Supplies/i })).toHaveCount(0);

    // A shop held back as a draft never reaches the page.
    await expect(page.getByText(/Unnamed outlet/i)).toHaveCount(0);
  });

  test("where to buy: the town picker is usable from the keyboard", async ({ page }) => {
    await page.goto("/where-to-buy", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Town" }).click();
    const search = page.getByPlaceholder("Search towns");
    await search.fill("kw");
    // Typing filters, arrows move, Enter chooses — without focus ever leaving
    // the search box, which is what makes typing mid-search work.
    await search.press("Enter");
    await expect(page.getByText(/stockists in\s+Kwekwe/)).toBeVisible();
  });

  /**
   * Regression: the mobile menu panel used to live inside <header>, and the
   * scrolled header carries `backdrop-filter` (its frosted glass). A filtered
   * element is a containing block for `position: fixed` descendants, so
   * `inset-0` resolved against the 64px bar instead of the viewport and the
   * menu collapsed to a strip with the page showing through beneath it. It only
   * happened once scrolled, which is why opening it at the top of the page
   * looked fine — so this test scrolls first, and asserts on geometry rather
   * than on visibility, which stayed true throughout the bug.
   */
  test("mobile menu covers the viewport after scrolling", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the menu and its toggle are mobile-only");
    await page.goto("/products");
    await page.mouse.wheel(0, 900);
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

    await page.getByRole("button", { name: /open menu/i }).click();
    const panel = page.locator("#mobile-menu");
    await expect(panel).toBeVisible();

    const covers = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.height >= window.innerHeight - 2 && r.width >= window.innerWidth - 2;
    });
    expect(covers).toBe(true);

    // The bar stays on top of the panel so the menu can be closed again.
    await expect(page.getByRole("button", { name: /close menu/i })).toBeVisible();

    // And the links inside it are actually reachable.
    await page
      .getByRole("link", { name: /^Crops/ })
      .first()
      .click();
    await page.waitForURL("**/crops");
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
