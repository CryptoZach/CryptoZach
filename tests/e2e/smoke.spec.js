// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("CryptoZach smoke", () => {
  test("home loads with expected title and hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Zach Zukowski/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Independent research on dollar infrastructure and tokenization/i,
      }),
    ).toBeVisible();
    await expect(page.locator("#hero .hero-subtitle")).toContainText(
      /Eight papers/i,
    );
  });

  test("research page shows Track A and Track B", async ({ page }) => {
    await page.goto("/research/");
    await expect(
      page.getByRole("heading", { name: /track a/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /track b/i }).first(),
    ).toBeVisible();
  });

  test("Frameworks page fragment #clii is present", async ({ page }) => {
    await page.goto("/frameworks/#clii");
    const clii = page.locator("#clii");
    await expect(clii).toBeAttached();
    await clii.scrollIntoViewIfNeeded();
    await expect(clii).toBeVisible();
  });

  test("frameworks.html redirects to /frameworks with hash preserved", async ({
    page,
  }) => {
    await page.goto("/frameworks.html#clii");
    await expect(page).toHaveURL(/\/frameworks\/?#clii/);
  });

  test("overview loads (Start Here)", async ({ page }) => {
    await page.goto("/overview/");
    await expect(page).toHaveURL(/\/overview\/?/);
    await expect(page).toHaveTitle(/Start Here/i);
  });

  test("routing-the-dollar paper layout", async ({ page }) => {
    await page.goto("/papers/routing-the-dollar/");
    await expect(page).toHaveTitle(/Routing the Dollar/i);
    await expect(page.locator("main")).toBeVisible();
  });

  test("MVEP paper layout", async ({ page }) => {
    await page.goto("/papers/mvep/");
    await expect(page).toHaveTitle(/Minimum Viable Equivalence/i);
    await expect(page.locator("main")).toBeVisible();
  });
});
