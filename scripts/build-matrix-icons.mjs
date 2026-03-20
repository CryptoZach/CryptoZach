#!/usr/bin/env node
/**
 * White 32x32 PNGs for homepage matrix (script.js iconDefs).
 * Order per asset: jsDelivr simple-icons SVG, Iconify simple-icons SVG (legacy slugs),
 * optional Iconify paths (token/*, etc.), then spothq cryptocurrency-icons PNG.
 *
 * Run: npm run build:matrix-icons
 * Needs network. Uses Playwright Chromium to rasterize (no system Cairo).
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT_DIR = path.join(process.cwd(), 'icons', 'matrix');
const SI_VER = '16.12.0';
const siUrl = (slug) =>
  `https://cdn.jsdelivr.net/npm/simple-icons@${SI_VER}/icons/${slug}.svg`;
const iconifySi = (slug) => `https://api.iconify.design/simple-icons/${slug}.svg`;
const iconifyPath = (p) => `https://api.iconify.design/${p}.svg`;
const ccPng = (t) =>
  `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${t}.png`;

/**
 * si: Simple Icons slug list (tried in order)
 * cc: optional spothq ticker (lowercase and uppercase PNG tried)
 * iconifyExtra: extra Iconify "collection/icon" paths after SI attempts
 */
const ICONS = [
  { name: 'btc', si: ['bitcoin'], cc: 'btc' },
  { name: 'eth', si: ['ethereum'], cc: 'eth' },
  { name: 'sol', si: ['solana'], cc: 'sol' },
  { name: 'usdc', si: ['circle', 'usdc'], cc: 'usdc' },
  { name: 'usdt', si: ['tether'], cc: 'usdt' },
  { name: 'dai', si: ['dai'], cc: 'dai', iconifyExtra: ['cryptocurrency-color/dai'] },
  { name: 'hnt', si: ['helium'], cc: 'hnt' },
  { name: 'fil', si: ['filecoin'], cc: 'fil', iconifyExtra: ['token/filecoin'] },
  { name: 'uni', si: ['uniswap'], cc: 'uni', iconifyExtra: ['token/uniswap'] },
  { name: 'aave', si: ['aave'], cc: 'aave', iconifyExtra: ['cryptocurrency-color/aave'] },
  { name: 'xrp', si: ['xrp'], cc: 'xrp' },
  { name: 'ada', si: ['cardano'], cc: 'ada' },
  { name: 'avax', si: ['avalanche'], cc: 'avax', iconifyExtra: ['token/avax'] },
  { name: 'dot', si: ['polkadot'], cc: 'dot' },
  { name: 'atom', si: ['cosmos'], cc: 'atom', iconifyExtra: ['token/atom', 'cryptocurrency-color/atom'] },
  { name: 'ltc', si: ['litecoin'], cc: 'ltc' },
  { name: 'link', si: ['chainlink'], cc: 'link' },
  { name: 'xlm', si: ['stellar'], cc: 'xlm' },
  { name: 'doge', si: ['dogecoin'], cc: 'doge' },
  { name: 'trx', si: ['tron'], cc: 'trx', iconifyExtra: ['token/tron'] },
  { name: 'bnb', si: ['binance'], cc: 'bnb' },
  { name: 'op', si: ['optimism'], iconifyExtra: ['token/optimism'] },
  { name: 'arb', si: ['arbitrum'], iconifyExtra: ['token/arbitrum'] },
  { name: 'near', si: ['near'], cc: 'near' },
  { name: 'apt', si: ['aptos'], iconifyExtra: ['token/aptos'] },
  { name: 'sui', si: ['sui'], iconifyExtra: ['token/sui'] },
  { name: 'inj', si: ['injective'], iconifyExtra: ['token/injective'] },
  { name: 'tia', si: ['celestia'], iconifyExtra: ['token/tia'] },
  { name: 'xmr', si: ['monero'], cc: 'xmr' },
  { name: 'zec', si: ['zcash'], cc: 'zec' },
  { name: 'crv', si: ['curvedao', 'curvefi', 'curve'], cc: 'crv' },
  { name: 'ldo', si: ['lido'], iconifyExtra: ['token/ldo'] },
  { name: 'stx', si: ['stacks'], cc: 'stx', iconifyExtra: ['token/stacks'] },
  { name: 'mkr', si: ['maker'], cc: 'mkr', iconifyExtra: ['token/mkr'] },
  { name: 'xtz', si: ['tezos'], cc: 'xtz', iconifyExtra: ['token/xtz'] },
  { name: 'algo', si: ['algorand'], cc: 'algo' },
  { name: 'hbar', si: ['hedera'], cc: 'hbar' },
  { name: 'ton', si: ['ton'], iconifyExtra: ['token/ton'] },
  { name: 'sei', si: ['sei'], iconifyExtra: ['token/sei'] },
  { name: 'wld', si: ['worldcoin'], cc: 'wld', iconifyExtra: ['arcticons/worldcoin'] },
  { name: 'rndr', si: ['render'], cc: 'rndr' },
  { name: 'tao', si: ['bittensor'], iconifyExtra: ['token/tao'] },
  { name: 'aapl', si: ['apple'] },
  { name: 'msft', si: ['microsoft'] },
  { name: 'jpm', si: ['jpmorgan', 'jpmorganchase', 'chase'] },
  { name: 'gs', si: ['goldmansachs'] },
  { name: 'coin', si: ['coinbase'] },
  { name: 'sq', si: ['square', 'block'] },
  { name: 'visa', si: ['visa'] },
  { name: 'ma', si: ['mastercard'] },
  { name: 'googl', si: ['google', 'alphabet'] },
  { name: 'amzn', si: ['amazon'] },
  { name: 'meta', si: ['meta'] },
  { name: 'nvda', si: ['nvidia'] },
  { name: 'tsla', si: ['tesla'] },
  { name: 'amd', si: ['amd'] },
  { name: 'nflx', si: ['netflix'] },
  { name: 'bac', si: ['bankofamerica'] },
  { name: 'wfc', si: ['wellsfargo'] },
  { name: 'schw', si: ['charlesschwab', 'schwab'], iconifyExtra: ['arcticons/schwab'] },
  { name: 'pypl', si: ['paypal'] },
  { name: 'intc', si: ['intel'] },
  { name: 'csco', si: ['cisco'] },
  { name: 'orcl', si: ['oracle'] },
  { name: 'dis', si: ['waltdisney', 'disney', 'waltdisneyworld'], iconifyExtra: ['tabler/brand-disney'] },
  { name: 'mstr', si: ['microstrategy', 'strategy'] },
  { name: 'hood', si: ['robinhood'] },
  { name: 'ibm', si: ['ibm'] },
  { name: 'ko', si: ['cocacola', 'coca-cola'] },
];

async function fetchText(url) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) {
      return null;
    }
    const t = await r.text();
    return t && t.trim().startsWith('<') ? t : null;
  } catch {
    return null;
  }
}

async function fetchSvgForRow(row) {
  for (const slug of row.si) {
    let t = await fetchText(siUrl(slug));
    if (t) {
      return t;
    }
    t = await fetchText(iconifySi(slug));
    if (t) {
      return t;
    }
  }
  for (const p of row.iconifyExtra || []) {
    const t = await fetchText(iconifyPath(p));
    if (t) {
      return t;
    }
  }
  return null;
}

async function fetchCcPngBuffer(ticker) {
  if (!ticker) {
    return null;
  }
  for (const t of [String(ticker).toLowerCase(), String(ticker).toUpperCase()]) {
    try {
      const r = await fetch(ccPng(t));
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 80) {
          return buf;
        }
      }
    } catch {
      /* next */
    }
  }
  return null;
}

async function rasterizeWhite32(page, input) {
  const b64 = await page.evaluate(
    async (payload) => {
      const whiten = (ctx) => {
        const id = ctx.getImageData(0, 0, 32, 32);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 8) {
            d[i] = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
          }
        }
        ctx.putImageData(id, 0, 0);
      };

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('no 2d context');
      }

      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(img, 0, 0, 32, 32);
            whiten(ctx);
            resolve(null);
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error('decode'));

        if (payload.kind === 'svg') {
          const blob = new Blob([payload.svg], { type: 'image/svg+xml;charset=utf-8' });
          const u = URL.createObjectURL(blob);
          img.addEventListener(
            'load',
            () => {
              URL.revokeObjectURL(u);
            },
            { once: true },
          );
          img.src = u;
        } else {
          img.src = `data:image/png;base64,${payload.b64}`;
        }
      });

      return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
    },
    input,
  );
  return Buffer.from(b64, 'base64');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 128, height: 128 });

  let ok = 0;
  let miss = 0;

  for (const row of ICONS) {
    const outPath = path.join(OUT_DIR, `${row.name}.png`);
    let buf = null;

    const svg = await fetchSvgForRow(row);
    if (svg) {
      try {
        buf = await rasterizeWhite32(page, { kind: 'svg', svg });
      } catch {
        buf = null;
      }
    }

    if (!buf && row.cc) {
      const png = await fetchCcPngBuffer(row.cc);
      if (png) {
        try {
          buf = await rasterizeWhite32(page, {
            kind: 'png',
            b64: png.toString('base64'),
          });
        } catch {
          buf = null;
        }
      }
    }

    if (buf) {
      fs.writeFileSync(outPath, buf);
      console.log(`ok  ${row.name}.png`);
      ok++;
    } else {
      console.warn(`MISS ${row.name}.png`);
      miss++;
    }
    await new Promise((r) => setTimeout(r, 35));
  }

  await browser.close();
  console.log(`\nDone: ${ok} written, ${miss} missing -> ${OUT_DIR}`);
  if (miss) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
