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
    // iN3 is both a liquid foliar fertiliser and crop nutrition. Its slug is
    // still npk-12-11-30-te, from before the product carried its own name.
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

  test("the finder asks for a crop, not the class it is filed under", async ({ page }) => {
    // The classes still earn their place on the Crops pages and still resolve
    // as a filter — the test above covers both. What the finder must not do is
    // offer "Brassicas" alongside "Cabbage", "Broccoli" and "Cauliflower" as
    // four answers returning the same products. Asserting it here is the only
    // layer that reads the rendered question: the filter test passes either
    // way, so the class rows could come back without anything going red.
    await page.goto("/product-finder");
    await expect(page.getByRole("heading", { name: /what are you growing/i })).toBeVisible();

    // Each option's accessible name is its label followed by the product count
    // ("Cabbage13 products"), so these anchor at the start rather than matching
    // the whole string.
    const classes = ["Brassicas", "Cereals", "Cucurbits", "Fruits", "Legumes", "Solanaceous"];
    for (const name of classes) {
      await expect(page.getByRole("button", { name: new RegExp(`^${name}`) })).toHaveCount(0);
    }

    // The members are what a grower actually picks, so they have to be there —
    // otherwise "no classes offered" would also pass on an empty question.
    for (const name of ["Cabbage", "Broccoli", "Cauliflower", "Maize", "Tomato"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${name}`) })).toBeVisible();
    }
  });

  test("product detail shows verified facts and confirm-note", async ({ page }) => {
    await page.goto("/products/in5");
    await expect(
      page.getByRole("heading", { name: "iN5 NPK 3-30-0", exact: true }),
    ).toBeVisible();
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

  /**
   * Regression: the map panel is collapsed behind a toggle on a phone, so its
   * frame starts life inside `display: none`, where a `loading="lazy"` iframe is
   * never fetched. The timeout that gives up on a slow map used to start on
   * mount regardless — so it expired while the map was still hidden, dropped the
   * frame, and the tap that finally opened the panel found a failure that had
   * never been attempted. It failed on every phone, every time, and looked like
   * a network problem.
   *
   * This waits past that old 7s timeout before opening the map, which is what a
   * real visitor does while reading the page, and asserts the frame is there to
   * load. It does not assert the map paints — that depends on a third party and
   * on the network — only that we still intend to try.
   */
  test("where to buy: the map still loads when opened long after arrival", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "the map is only collapsed behind a toggle on a phone");
    await page.goto("/where-to-buy", { waitUntil: "domcontentloaded" });

    const toggle = page.getByRole("button", { name: /View map of/ });
    await expect(toggle).toBeVisible();

    // Longer than the timeout that used to run while the panel was hidden.
    await page.waitForTimeout(9000);

    await toggle.click();
    const frame = page.locator('iframe[title^="Map"]');
    await expect(frame).toHaveCount(1);
    // Anchored to the whole origin and path, not just the domain somewhere in
    // the string: an unanchored /openstreetmap\.org/ is happy with
    // https://somewhere-else.example/?ref=openstreetmap.org, so it would pass
    // while pointing at the wrong host entirely — which is both a weak
    // assertion and what CodeQL flags it for.
    await expect(frame).toHaveAttribute(
      "src",
      /^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?/,
    );
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

  /**
   * The homepage is a run of viewport-height screens the document snaps to,
   * with a dot navigation down the right edge on desktop. Each half of that is
   * a thing that could quietly stop being true — a section that grows past the
   * viewport, the `:has()` rule that switches snapping on going missing, the
   * nav losing its screens — without any other test noticing.
   */
  test("the homepage is a run of screens with a dot navigation", async ({ page, isMobile }) => {
    test.skip(isMobile, "the dot navigation is desktop-only");
    await page.goto("/");
    const screens = page.locator("[data-screen]");
    await expect(screens).toHaveCount(8);

    // Every screen fills the viewport, so a settled scroll never shows the
    // bottom of one and the top of the next.
    const shorterThanViewport = await screens.evaluateAll(
      (els) => els.filter((el) => el.getBoundingClientRect().height < window.innerHeight - 1).length,
    );
    expect(shorterThanViewport).toBe(0);

    // And the document snaps to them — gently. Chromium serialises the
    // computed value as plain "y" because proximity is the default strictness;
    // the pattern accepts that and would still catch a `mandatory`.
    const snap = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollSnapType,
    );
    expect(snap).toMatch(/^y(\s+proximity)?$/);

    const nav = page.getByRole("navigation", { name: "Sections" });
    await expect(nav.getByRole("button")).toHaveCount(8);
    await nav.getByRole("button", { name: "Go to Finder" }).click();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Math.round(document.getElementById("finder")!.getBoundingClientRect().top),
        ),
      )
      .toBeLessThanOrEqual(1);
    await expect(nav.getByRole("button", { name: "Go to Finder" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    // The screen's heading has actually revealed. A heading that stays clipped
    // is invisible to a person and visible to every other kind of check: it
    // has a box, it has text, it is "in the viewport". Only the clip says
    // otherwise, so the clip is what is read. (Chromium serialises the
    // resting inset in shorthand; the starting one still names 100%.)
    await expect
      .poll(() =>
        page.evaluate(
          () => getComputedStyle(document.querySelector("#finder .reveal-wipe")!).clipPath,
        ),
      )
      .not.toContain("100%");

    // And a photograph: same trap, same read. The crops photograph is desktop-only.
    await nav.getByRole("button", { name: "Go to Crops" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => getComputedStyle(document.querySelector("#crops .image-reveal")!).clipPath,
        ),
      )
      .not.toContain("100%");
  });

  /**
   * A navigation crosses through the route veil and the veil clears again.
   * The clearing is the half worth guarding: a veil that appears and never
   * leaves would be a page nobody can see, and the state machine that lets it
   * go has a branch for the route changing mid-fade that passed a first draft
   * by silently never firing.
   */
  test("a navigation passes through the veil and the veil clears", async ({ page }) => {
    await page.goto("/");
    const veil = page.locator("[data-route-veil]");
    await expect(veil).toHaveCount(0);

    await page.getByRole("link", { name: /explore products/i }).first().click();
    await expect(veil).toHaveCount(1);

    await page.waitForURL("**/products");
    await expect(veil).toHaveCount(0);
    await expect(page.getByTestId("product-results")).toBeVisible();
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
