#!/usr/bin/env node
/**
 * One-off: resize CoinGecko Hyperliquid token art to 330x330 WebP on disk.
 * Not used by npm run build:matrix-icons (raster + whiten() fills 32x32; matrix shows a solid square).
 * Run: node scripts/gen-hyperliquid-webp.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = path.join(process.cwd(), 'icons/matrix/build-sources/hyperliquid-logo-330x330.webp');
const SRC =
  'https://coin-images.coingecko.com/coins/images/50882/large/hyperliquid.jpg?1729431300';

async function fetchB64(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(String(r.status));
  const ab = await r.arrayBuffer();
  return Buffer.from(ab).toString('base64');
}

async function main() {
  const b64 = await fetchB64(SRC);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const webpB64 = await page.evaluate(async (jpegB64) => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(null);
      img.onerror = () => reject(new Error('jpeg decode'));
      img.src = `data:image/jpeg;base64,${jpegB64}`;
    });
    const c = document.createElement('canvas');
    c.width = 330;
    c.height = 330;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('no 2d');
    ctx.drawImage(img, 0, 0, 330, 330);
    const dataUrl = c.toDataURL('image/webp', 0.92);
    return dataUrl.replace(/^data:image\/webp;base64,/, '');
  }, b64);
  await browser.close();
  fs.writeFileSync(OUT, Buffer.from(webpB64, 'base64'));
  console.log(`wrote ${OUT} (${fs.statSync(OUT).size} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
