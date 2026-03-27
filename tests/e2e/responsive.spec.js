// @ts-check
const { test, expect } = require("@playwright/test");

/** Max horizontal overflow tolerance (subpixel rounding). */
const OVERFLOW_SLACK_PX = 2;

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 */
async function assertNoHorizontalOverflow(page, path) {
  await page.goto(path);
  const overflowPx = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(
    overflowPx,
    `horizontal overflow on ${path} (scrollWidth - clientWidth)`,
  ).toBeLessThanOrEqual(OVERFLOW_SLACK_PX);
}

test.describe("Responsive layout", () => {
  test("home: no horizontal overflow", async ({ page }) => {
    await assertNoHorizontalOverflow(page, "/");
  });

  test("research: no horizontal overflow", async ({ page }) => {
    await assertNoHorizontalOverflow(page, "/research/");
  });

  test("frameworks: no horizontal overflow", async ({ page }) => {
    await assertNoHorizontalOverflow(page, "/frameworks/");
  });

  test("overview: no horizontal overflow", async ({ page }) => {
    await assertNoHorizontalOverflow(page, "/overview/");
  });

  test("routing-the-dollar paper: no horizontal overflow", async ({
    page,
  }) => {
    await assertNoHorizontalOverflow(page, "/papers/routing-the-dollar/");
  });

  test("navigation matches viewport width", async ({ page }) => {
    await page.goto("/");
    const w = page.viewportSize()?.width ?? 1280;

    if (w <= 768) {
      const menuBtn = page.getByRole("button", { name: "Open menu" });
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();
      await expect(
        page.locator("#nav-mobile").getByRole("link", { name: "Research" }),
      ).toBeVisible();
    } else {
      await expect(
        page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name: "Research" }),
      ).toBeVisible();
    }
  });

  test("home hero H1 and subtitle visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Independent research on dollar infrastructure and tokenization/i,
      }),
    ).toBeVisible();
    await expect(page.locator("#hero .hero-subtitle")).toContainText(
      /Seven scholarly papers/i,
    );
  });
});
