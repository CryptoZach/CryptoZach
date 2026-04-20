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

    /* Mobile menu collapses below 900px (raised from 768px) so the desktop
       nav has room to fit on tablet portrait widths without overlap. */
    if (w <= 900) {
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
        name: /Classify the token\. Audit the operator\./i,
      }),
    ).toBeVisible();
    await expect(page.locator("#hero .hero-subtitle")).toContainText(
      /Eight papers/i,
    );
  });
});

/**
 * Pixel tolerance for visual overlap checks. 1px allows for sub-pixel
 * rounding; anything more is treated as a real layout regression.
 */
const OVERLAP_SLACK_PX = 1;

/**
 * Probe header/footer geometry to detect text overlap. Returns nullable boxes
 * for elements that may not exist at this viewport width (for example, the
 * desktop nav on mobile).
 *
 * @param {import('@playwright/test').Page} page
 */
async function probeHeaderFooter(page) {
  return page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        display: cs.display,
        visibility: cs.visibility,
      };
    };
    return {
      vw: window.innerWidth,
      headerInner: rect(".header-inner"),
      brand: rect("header .brand"),
      brandStrong: rect("header .brand strong"),
      navDesktop: rect("header .nav-desktop"),
      firstDesktopNavLink: rect(
        "header .nav-links--desktop .navlink",
      ),
      themeToggle: rect("header .theme-toggle"),
      menuToggle: rect("header .menu-toggle"),
      footerCopy: rect("footer.site-footer .footer-copy"),
      footerNav: rect("footer.site-footer .footer-nav"),
      footerLinks: rect("footer.site-footer .footer-links"),
    };
  });
}

/**
 * Treat a probe rect as rendered when it has any non-zero dimension. Elements
 * inside a `display:none` ancestor (the desktop nav on mobile) report 0/0 here,
 * which is the most reliable cross-browser signal of "not actually drawn".
 */
const isRendered = (r) => r != null && (r.width > 0 || r.height > 0);

test.describe("Header and footer overlap", () => {
  test("header brand does not overlap nav at this viewport", async ({
    page,
  }) => {
    await page.goto("/");
    const data = await probeHeaderFooter(page);
    const w = data.vw;

    if (isRendered(data.firstDesktopNavLink)) {
      const brandRight = data.brandStrong.right;
      const navLeft = data.firstDesktopNavLink.left;
      expect(
        brandRight,
        `vw=${w}: brand <strong> right (${brandRight}) overlaps first nav link left (${navLeft})`,
      ).toBeLessThanOrEqual(navLeft + OVERLAP_SLACK_PX);
    } else {
      expect(
        isRendered(data.menuToggle),
        `vw=${w}: desktop nav is hidden but menu toggle is not rendered`,
      ).toBeTruthy();
    }
  });

  test("header inner does not overflow horizontally", async ({ page }) => {
    await page.goto("/");
    const data = await probeHeaderFooter(page);
    const w = data.vw;

    const rightAnchor = isRendered(data.themeToggle)
      ? data.themeToggle.right
      : isRendered(data.menuToggle)
        ? data.menuToggle.right
        : null;
    if (rightAnchor !== null) {
      expect(
        rightAnchor,
        `vw=${w}: rightmost header control (${rightAnchor}) extends past header right (${data.headerInner.right})`,
      ).toBeLessThanOrEqual(data.headerInner.right + OVERLAP_SLACK_PX);
    }
  });

  test("header brand stays on a single visual line", async ({ page }) => {
    await page.goto("/");
    const data = await probeHeaderFooter(page);
    const w = data.vw;

    const lineHeight = await page.evaluate(() => {
      const el = document.querySelector("header .brand strong");
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight);
      const fs = parseFloat(cs.fontSize);
      return Number.isFinite(lh) ? lh : fs * 1.4;
    });
    expect(
      data.brandStrong.height,
      `vw=${w}: brand <strong> wraps to multiple lines (height=${data.brandStrong.height}, lineHeight=${lineHeight})`,
    ).toBeLessThanOrEqual(lineHeight * 1.6);
  });

  test("footer copy does not overlap footer nav", async ({ page }) => {
    await page.goto("/");
    const data = await probeHeaderFooter(page);
    const w = data.vw;

    const sameRow = (a, b) =>
      isRendered(a) &&
      isRendered(b) &&
      Math.abs(a.top - b.top) < Math.min(a.height, b.height);

    if (sameRow(data.footerCopy, data.footerNav)) {
      expect(
        data.footerCopy.right,
        `vw=${w}: footer copy right (${data.footerCopy.right}) overlaps footer nav left (${data.footerNav.left})`,
      ).toBeLessThanOrEqual(data.footerNav.left + OVERLAP_SLACK_PX);
    }

    if (sameRow(data.footerNav, data.footerLinks)) {
      expect(
        data.footerNav.right,
        `vw=${w}: footer nav right (${data.footerNav.right}) overlaps footer links left (${data.footerLinks.left})`,
      ).toBeLessThanOrEqual(data.footerLinks.left + OVERLAP_SLACK_PX);
    }
  });
});

/**
 * The footer is full-bleed: its dark band must reach both viewport edges on
 * every page, regardless of the <main> max-width that constrains article
 * content. Verified on a sub-page (speaker-and-advisory) where <main> caps at
 * 1480px and the body background would otherwise show on the sides above
 * 1280px viewports.
 */
test.describe("Footer full-bleed", () => {
  for (const path of ["/", "/speaker-and-advisory/", "/frameworks/"]) {
    test(`footer spans full viewport width on ${path}`, async ({ page }) => {
      await page.goto(path);
      const data = await page.evaluate(() => {
        const footer = document.querySelector("footer.site-footer");
        const html = document.documentElement;
        if (!footer) return null;
        const rect = footer.getBoundingClientRect();
        return {
          vw: window.innerWidth,
          docWidth: html.clientWidth,
          left: rect.left,
          right: rect.right,
        };
      });
      expect(data, `${path}: footer not found`).not.toBeNull();
      const w = data.vw;
      /* Allow 1px slack on both sides for sub-pixel rounding. */
      expect(
        data.left,
        `vw=${w} ${path}: footer left=${data.left} should be <= 1`,
      ).toBeLessThanOrEqual(1);
      expect(
        data.right,
        `vw=${w} ${path}: footer right=${data.right} should be >= viewport ${w}-1`,
      ).toBeGreaterThanOrEqual(w - 1);
    });
  }
});
