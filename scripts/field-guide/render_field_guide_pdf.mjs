#!/usr/bin/env node
// Render the Tokenization Systems Field Guide PDF from scripts/field-guide/field_guide.html.
//
//   node scripts/field-guide/render_field_guide_pdf.mjs [--out field-guide/Tokenization_Systems_Field_Guide_YYYY-MM-DD.pdf]
//
// Uses the repo's Playwright Chromium (the e2e suite's dependency). Letter, printed
// margins, a footer carrying the version, date, brand domain, and page number. The
// version and date below are the single source for the footer stamp; bump both when
// the HTML changes. Page breaks live in the HTML (.page sections), so a rebuild never
// orphans a section tail the way the 2026-09-18 ReportLab edition did.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const VERSION = 'v1.1';
const DATE = '2026-09-22';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const src = path.join(here, 'field_guide.html');
let out = path.join(root, 'field-guide', `Tokenization_Systems_Field_Guide_${DATE}.pdf`);
const i = process.argv.indexOf('--out');
if (i > -1 && process.argv[i + 1]) out = path.resolve(root, process.argv[i + 1]);

const footer = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:7.5px;color:#6b7280;width:100%;padding:0 0.85in;display:flex;justify-content:space-between;align-items:center;">
  <span>Tokenization Systems &middot; Field Guide &middot; ${VERSION} &middot; ${DATE} &middot; Tokenization.Systems</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;

// Launch the pinned Chromium if it is installed; otherwise fall back to any
// Playwright headless shell already in the user cache (the revision pin does not
// matter for a print-to-PDF), so a rebuild never depends on a 150 MB download.
async function launch() {
  try {
    return await chromium.launch();
  } catch (err) {
    const cache = path.join(process.env.HOME || '', 'Library', 'Caches', 'ms-playwright');
    const shells = fs.existsSync(cache)
      ? fs.readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse()
      : [];
    for (const d of shells) {
      const exe = path.join(cache, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
      if (fs.existsSync(exe)) {
        console.error(`render_field_guide_pdf: pinned Chromium missing; using ${exe}`);
        return chromium.launch({ executablePath: exe });
      }
    }
    throw err;
  }
}

const browser = await launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(src).href, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.pdf({
    path: out,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: footer,
    margin: { top: '0.8in', right: '0.85in', bottom: '0.85in', left: '0.85in' },
  });
  const bytes = fs.statSync(out).size;
  console.log(`render_field_guide_pdf: wrote ${path.relative(root, out)} (${bytes} bytes, ${VERSION}, ${DATE})`);
} finally {
  await browser.close();
}
