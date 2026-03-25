#!/usr/bin/env node
/**
 * Responsiveness check: run key pages at multiple viewports and assert
 * no horizontal overflow and that key layout elements are visible.
 * Usage: BASE_URL=http://127.0.0.1:8080 node scripts/check-responsive.js
 * Prerequisite: local server running on the BASE_URL port (e.g. python3 -m http.server 8080).
 */

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8080";

const VIEWPORTS = [
  { label: "1280", width: 1280, height: 800 },
  { label: "1024", width: 1024, height: 800 },
  { label: "768", width: 768, height: 1024 },
  { label: "375", width: 375, height: 812 },
];

const PAGES = [
  { path: "/", name: "index" },
  { path: "/selected-research.html", name: "selected-research" },
];

async function checkOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const scrollWidth = doc.scrollWidth;
    const clientWidth = doc.clientWidth;
    return scrollWidth <= clientWidth + 1;
  });
}

async function checkKeyElements(page, pageName) {
  const header = page.locator(".header-inner, .brand").first();
  const main = page.locator("main, #main").first();
  await header.waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
  await main.waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
  const headerOk = (await header.boundingBox()) !== null;
  const mainOk = (await main.boundingBox()) !== null;
  if (!headerOk || !mainOk) return { ok: false, msg: "header or main not visible" };
  if (pageName === "selected-research") {
    const card = page.locator(".writing-card").first();
    const cardBox = await card.boundingBox().catch(() => null);
    if (!cardBox || cardBox.width === 0) return { ok: false, msg: "no research card visible" };
  }
  return { ok: true };
}

async function checkResearchCardsNoOverflow(page, viewportWidth) {
  const overflow = await page.evaluate((vw) => {
    const cards = document.querySelectorAll(".writing-card");
    if (cards.length === 0) return null;
    const doc = document.documentElement;
    if (doc.scrollWidth > vw + 2) return "page overflow";
    for (const card of cards) {
      const plain = card.querySelector(".research-plain, .research-why, .writing-copy");
      if (plain && plain.scrollWidth > plain.clientWidth + 2) return "card text overflow";
    }
    return null;
  }, viewportWidth);
  return overflow;
}

async function run() {
  let playwright;
  try {
    playwright = require("playwright");
  } catch (e) {
    console.error("Playwright not found. Install with: npm install && npx playwright install");
    process.exit(2);
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const failures = [];

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const { path, name } of PAGES) {
        const url = BASE_URL.replace(/\/$/, "") + path;
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        } catch (e) {
          failures.push({ viewport: vp.label, page: name, assertion: "load", error: e.message });
          continue;
        }

        const noOverflow = await checkOverflow(page);
        if (!noOverflow) {
          failures.push({ viewport: vp.label, page: name, assertion: "no horizontal overflow" });
        }

        const keyOk = await checkKeyElements(page, name);
        if (!keyOk.ok) {
          failures.push({ viewport: vp.label, page: name, assertion: "key elements", error: keyOk.msg });
        }

        if (name === "selected-research" && vp.width <= 768) {
          const cardOverflow = await checkResearchCardsNoOverflow(page, vp.width);
          if (cardOverflow) {
            failures.push({ viewport: vp.label, page: name, assertion: cardOverflow });
          }
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error("Responsive check failures:");
    failures.forEach((f) => console.error(`  ${f.viewport} ${f.page}: ${f.assertion}${f.error ? " - " + f.error : ""}`));
    process.exit(1);
  }

  console.log("Responsive checks passed for", VIEWPORTS.length, "viewports and", PAGES.length, "pages.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
