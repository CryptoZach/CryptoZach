// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("CryptoZach smoke", () => {
  test("home loads with expected title and hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Zach Zukowski/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Who routes the dollar matters more than which dollar is routed/i,
      }),
    ).toBeVisible();
    await expect(page.locator("#hero .hero-tagline")).toHaveText(
      /Decision frameworks for the people building and regulating digital money infrastructure/i,
    );
  });

  test("selected research shows Track A and Track B", async ({ page }) => {
    await page.goto("/selected-research.html");
    await expect(
      page.getByRole("heading", { name: /track a/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /track b/i }).first(),
    ).toBeVisible();
  });

  test("Structure page fragment #clii is present", async ({ page }) => {
    await page.goto("/Operating-Model.html#clii");
    const clii = page.locator("#clii");
    await expect(clii).toBeAttached();
    await clii.scrollIntoViewIfNeeded();
    await expect(clii).toBeVisible();
  });

  test("frameworks.html redirects to Operating-Model with hash preserved", async ({
    page,
  }) => {
    await page.goto("/frameworks.html#clii");
    await expect(page).toHaveURL(/Operating-Model\.html#clii/);
  });

  test("start-here.html loads Overview (Start Here)", async ({ page }) => {
    await page.goto("/start-here.html");
    await expect(page).toHaveURL(/start-here\.html/);
    await expect(page).toHaveTitle(/Start Here/i);
  });

  test("routing-the-dollar paper layout", async ({ page }) => {
    await page.goto("/papers/routing-the-dollar.html");
    await expect(page).toHaveTitle(/Routing the Dollar/i);
    await expect(page.locator("main")).toBeVisible();
  });

  test("minimum-viable-equivalence-packs paper layout", async ({ page }) => {
    await page.goto("/papers/minimum-viable-equivalence-packs.html");
    await expect(page).toHaveTitle(/Minimum Viable Equivalence/i);
    await expect(page.locator("main")).toBeVisible();
  });
});
