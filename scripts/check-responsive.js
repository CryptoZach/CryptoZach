/**
 * Playwright script: check responsiveness at key breakpoints.
 * Asserts no horizontal overflow, key elements visible, and research card text wrapping on selected-research.
 * Run (with server on 8080): BASE_URL=http://localhost:8080 node scripts/check-responsive.js
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

const VIEWPORTS = [
  { label: 'LargeDesktop', width: 1920, height: 1080 },
  { label: 'Desktop', width: 1280, height: 800 },
  { label: 'Tablet', width: 980, height: 800 },
  { label: 'Mobile', width: 768, height: 1024 },
  { label: 'Small', width: 480, height: 800 },
  { label: 'XSmall', width: 360, height: 640 },
];

const PAGES = [
  { path: '/index.html', name: 'index' },
  { path: '/selected-research.html', name: 'selected-research' },
  { path: '/focus.html', name: 'focus' },
];

async function runChecks() {
  const browser = await chromium.launch();
  const failures = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const p of PAGES) {
      const url = BASE_URL + p.path;
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      const ctx = `${vp.label} (${vp.width}px) / ${p.name}`;

      const noOverflow = await page.evaluate((w) => {
        const doc = document.documentElement;
        return doc.scrollWidth <= w;
      }, vp.width);
      if (!noOverflow) {
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const overflowNodes = await page.evaluate((vw) => {
          const out = [];
          const walk = (el) => {
            if (el.scrollWidth > Math.min(el.clientWidth, vw) + 1) {
              const tag = el.tagName.toLowerCase();
              const cls = (el.className && typeof el.className === 'string') ? el.className.split(/\s+/)[0] : '';
              const text = (el.textContent || '').slice(0, 40).replace(/\s+/g, ' ');
              out.push({ tag, class: cls, text });
            }
            for (let i = 0; i < el.children.length; i++) walk(el.children[i]);
          };
          walk(document.body);
          return out.slice(0, 5);
        }, vp.width).catch(() => []);
        const detail = overflowNodes.length
          ? `scrollWidth ${scrollWidth} > viewport ${vp.width}; sample nodes: ${JSON.stringify(overflowNodes)}`
          : `scrollWidth ${scrollWidth} > viewport ${vp.width}`;
        failures.push({ ctx, assertion: 'no horizontal overflow (text wrapping)', detail });
      }

      const headerVisible = await page.locator('.header-inner').first().evaluate((el) => el && el.getBoundingClientRect().width > 0).catch(() => false);
      if (!headerVisible) failures.push({ ctx, assertion: 'header visible', detail: '.header-inner not visible' });

      const mainVisible = await page.locator('main, #main').first().evaluate((el) => el && el.getBoundingClientRect().width > 0).catch(() => false);
      if (!mainVisible) failures.push({ ctx, assertion: 'main visible', detail: 'main/#main not visible' });

      if (p.name === 'index') {
        const heroPoints = page.locator('.hero-points').first();
        if (await heroPoints.count() > 0) {
          const heroPointsHorizontal = await heroPoints.evaluate((el) => {
            const cs = getComputedStyle(el);
            const display = cs.display;
            const gridCols = cs.gridTemplateColumns || '';
            const isGrid = display === 'grid';
            const threeCols = gridCols.split(' ').filter(Boolean).length >= 3;
            return isGrid && threeCols;
          }).catch(() => false);
          if (!heroPointsHorizontal) {
            failures.push({ ctx, assertion: 'hero points horizontal (3 columns)', detail: '.hero-points must be display:grid with 3 columns at all screen sizes' });
          }
        }
        const hero = page.locator('.hero').first();
        if (await hero.count() > 0) {
          const heroOverflow = await hero.evaluate((el) => {
            const textNodes = el.querySelectorAll('.hero-primary, .hero-points, .hero-point span, .hero-rail .rail-card p, .hero-rail .rail-note p');
            for (const node of textNodes) {
              if (node.scrollWidth > node.clientWidth) return true;
            }
            return false;
          }).catch(() => false);
          if (heroOverflow) {
            failures.push({ ctx, assertion: 'hero text within width', detail: 'hero text box has horizontal overflow' });
          }
        }
        const teaserGrid = page.locator('.teaser-grid').first();
        if (await teaserGrid.count() > 0) {
          const teaserOverflow = await teaserGrid.evaluate((el) => {
            const body = el.querySelector('.teaser-body');
            const rail = el.querySelector('.teaser-rail');
            if (body && body.scrollWidth > body.clientWidth) return true;
            if (rail && rail.scrollWidth > rail.clientWidth) return true;
            return false;
          }).catch(() => false);
          if (teaserOverflow) {
            failures.push({ ctx, assertion: 'start-here teaser within width', detail: 'teaser grid has horizontal overflow' });
          }
        }
      }

      if (p.name === 'selected-research') {
        const cardVisible = await page.locator('.writing-card').first().evaluate((el) => el && el.getBoundingClientRect().width > 0).catch(() => false);
        if (!cardVisible) failures.push({ ctx, assertion: 'research card visible', detail: 'no .writing-card visible' });

        const ctaStrip = page.locator('.cta-strip').first();
        if (await ctaStrip.count() > 0) {
          const ctaAlignOk = await ctaStrip.evaluate((strip) => {
            const textBlock = strip.querySelector(':scope > div');
            const btn = strip.querySelector(':scope > .action');
            if (!textBlock || !btn) return true;
            const textTop = textBlock.getBoundingClientRect().top;
            const btnTop = btn.getBoundingClientRect().top;
            return Math.abs(btnTop - textTop) <= 24;
          }).catch(() => true);
          if (!ctaAlignOk) failures.push({ ctx, assertion: 'CTA strip button top-aligned', detail: 'button top too far below text block' });
        }

        const cards = await page.locator('.writing-card').all();
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          const textElements = await card.locator('.research-plain, .research-why, .research-audience, .writing-excerpt').all();
          for (const el of textElements) {
            const overflow = await el.evaluate((node) => node.scrollWidth > node.clientWidth);
            if (overflow) {
              const title = await card.locator('.writing-title').first().textContent().catch(() => '');
              failures.push({ ctx, assertion: 'card text within width', detail: `card ${i}: ${(title && title.trim()) || 'untitled'} has overflow` });
              break;
            }
          }
        }
      }
    }

    await page.close();
  }

  await browser.close();
  return failures;
}

runChecks()
  .then((failures) => {
    if (failures.length) {
      console.error('Responsiveness check failed:');
      failures.forEach((f) => console.error(`  [${f.ctx}] ${f.assertion}: ${f.detail}`));
      process.exit(1);
    }
    console.log('OK: All viewports and pages passed (no overflow, key elements visible, card text wraps).');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
