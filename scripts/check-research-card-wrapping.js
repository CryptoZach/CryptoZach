/**
 * Playwright script: verify research card text wraps within each cell width.
 * Run (with server on 8080): node scripts/check-research-card-wrapping.js
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

async function checkResearchCardWrapping() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(BASE_URL + '/selected-research.html', { waitUntil: 'networkidle' });

  const cards = await page.locator('.writing-card').all();
  const results = { passed: 0, failed: [], overflow: [] };

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const title = await card.locator('.writing-title').first().textContent().catch(() => '');
    const textElements = await card.locator('.research-plain, .research-why, .research-audience, .writing-excerpt').all();
    let cardOk = true;
    for (const el of textElements) {
      const overflow = await el.evaluate((node) => node.scrollWidth > node.clientWidth);
      if (overflow) {
        cardOk = false;
        results.overflow.push({ cardIndex: i, title: (title && title.trim()) || 'Card ' + i });
      }
    }
    if (cardOk) results.passed++;
    else results.failed.push({ index: i, title: (title && title.trim()) || 'Card ' + i });
  }

  await browser.close();

  const total = cards.length;
  console.log('Research cards: ' + results.passed + '/' + total + ' have text within cell width');
  if (results.overflow.length) {
    console.log('Overflow:', results.overflow);
    process.exit(1);
  }
  console.log('OK: All card text wraps within cell width.');
}

checkResearchCardWrapping().catch((err) => {
  console.error(err);
  process.exit(1);
});
