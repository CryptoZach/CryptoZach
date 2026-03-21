#!/usr/bin/env node
/**
 * White 32x32 PNGs for homepage matrix (script.js iconDefs).
 * Order per asset: jsDelivr simple-icons SVG, Iconify simple-icons SVG (legacy slugs),
 * optional Iconify paths (token/*, etc.), then spothq cryptocurrency-icons PNG.
 * localSvg: repo-root-relative path to an SVG file when no CDN slug exists.
 * localPng: repo-root-relative path to a PNG (rasterized to 32px white silhouette; try before SVG).
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
  /* Bundled evenodd path: blue+white Iconify art whiten()s to a solid blob; this keeps $ cutouts. */
  {
    name: 'usdc',
    localSvg: 'icons/matrix/build-sources/usdc.svg',
    si: [],
    iconifyExtra: ['token/usdc', 'cryptocurrency-color/usdc'],
    cc: 'usdc',
  },
  { name: 'usdt', si: ['tether'], cc: 'usdt' },
  {
    name: 'dai',
    localSvg: 'icons/matrix/build-sources/dai.svg',
    si: [],
    iconifyExtra: ['cryptocurrency-color/dai'],
    cc: 'dai',
  },
  {
    name: 'hnt',
    localSvg: 'icons/matrix/build-sources/hnt.svg',
    si: [],
    cc: 'hnt',
  },
  { name: 'fil', si: ['filecoin'], cc: 'fil', iconifyExtra: ['token/filecoin'] },
  {
    name: 'uni',
    si: [],
    iconifyExtra: ['token/uniswap', 'token-branded/uniswap'],
    cc: 'uni',
  },
  {
    name: 'aave',
    si: [],
    iconifyExtra: ['cryptocurrency-color/aave', 'simple-icons/aave'],
    cc: 'aave',
  },
  { name: 'xrp', si: ['xrp'], cc: 'xrp' },
  { name: 'ada', si: ['cardano'], cc: 'ada' },
  { name: 'avax', si: ['avalanche'], cc: 'avax', iconifyExtra: ['token/avax'] },
  {
    name: 'dot',
    si: [],
    iconifyExtra: ['simple-icons/polkadot'],
    cc: 'dot',
  },
  { name: 'atom', si: ['cosmos'], cc: 'atom', iconifyExtra: ['token/atom', 'cryptocurrency-color/atom'] },
  {
    name: 'ltc',
    localSvg: 'icons/matrix/build-sources/ltc.svg',
    si: [],
    iconifyExtra: ['simple-icons/litecoin'],
    cc: 'ltc',
  },
  /* Chainlink: bundled hollow hex (SI path + evenodd); raw SI raster reads as two filled facets, not a clear ring at 32px. */
  {
    name: 'link',
    localSvg: 'icons/matrix/build-sources/link.svg',
    si: ['chainlink'],
    iconifyExtra: ['simple-icons/chainlink'],
    cc: 'link',
  },
  { name: 'xlm', si: ['stellar'], cc: 'xlm' },
  {
    name: 'doge',
    si: [],
    iconifyExtra: ['simple-icons/dogecoin'],
    cc: 'doge',
  },
  { name: 'trx', si: ['tron'], cc: 'trx', iconifyExtra: ['token/tron'] },
  { name: 'bnb', si: ['binance'], cc: 'bnb' },
  {
    name: 'op',
    localSvg: 'icons/matrix/build-sources/op.svg',
    si: [],
    iconifyExtra: ['token-branded/optimism', 'token/optimism', 'simple-icons/optimism'],
  },
  {
    name: 'arb',
    si: [],
    iconifyExtra: ['token-branded/arbitrum', 'token/arbitrum'],
  },
  {
    name: 'near',
    si: ['near'],
    iconifyExtra: ['simple-icons/near'],
    cc: 'near',
  },
  {
    name: 'apt',
    si: [],
    iconifyExtra: ['token/aptos', 'token-branded/aptos'],
  },
  {
    name: 'sui',
    si: [],
    iconifyExtra: ['token/sui'],
  },
  {
    name: 'inj',
    localSvg: 'icons/matrix/build-sources/inj.svg',
    si: [],
    iconifyExtra: ['token/injective'],
  },
  {
    name: 'hyperliquid',
    localSvg: 'icons/matrix/build-sources/hyperliquid.svg',
    si: [],
  },
  { name: 'tia', si: ['celestia'], iconifyExtra: ['token/tia'] },
  { name: 'xmr', si: ['monero'], cc: 'xmr' },
  { name: 'zec', si: ['zcash'], cc: 'zec' },
  /* Curve: bundled coin glyph (spothq paths, no blue disk); SI curve is a filled squircle at 20px */
  {
    name: 'crv',
    localSvg: 'icons/matrix/build-sources/crv.svg',
    si: [],
    iconifyExtra: ['simple-icons/curve', 'simple-icons/curvefi'],
    cc: 'crv',
  },
  { name: 'ldo', si: ['lido'], iconifyExtra: ['token/ldo'] },
  { name: 'stx', si: ['stacks'], cc: 'stx', iconifyExtra: ['token/stacks'] },
  { name: 'mkr', si: ['maker'], cc: 'mkr', iconifyExtra: ['token/mkr'] },
  { name: 'xtz', si: ['tezos'], cc: 'xtz', iconifyExtra: ['token/xtz'] },
  { name: 'algo', si: ['algorand'], cc: 'algo' },
  {
    name: 'hbar',
    localSvg: 'icons/matrix/build-sources/hbar.svg',
    si: [],
    iconifyExtra: ['simple-icons/hedera'],
    cc: 'hbar',
  },
  {
    name: 'ton',
    si: [],
    iconifyExtra: ['token-branded/ton', 'token/ton', 'simple-icons/ton'],
  },
  {
    name: 'sei',
    si: ['sei'],
    iconifyExtra: ['token/sei'],
  },
  {
    name: 'wld',
    si: [],
    iconifyExtra: ['arcticons/worldcoin'],
    cc: 'wld',
  },
  { name: 'rndr', si: ['render'], cc: 'rndr' },
  { name: 'tao', si: ['bittensor'], iconifyExtra: ['token/tao'] },
  {
    name: 'kraken',
    si: [],
    iconifyExtra: ['logos/kraken', 'token-branded/kraken'],
  },
  {
    name: 'metamask',
    si: [],
    /* logos/metamask is a wide wordmark (512x96); 32px raster reads as vertical smears. Fox mark first. */
    iconifyExtra: ['token-branded/metamask', 'logos/metamask'],
  },
  {
    name: 'layerzero',
    localSvg: 'icons/matrix/build-sources/layerzero.svg',
    si: [],
  },
  {
    name: 'wormhole',
    si: [],
    iconifyExtra: ['arcticons/wormhole', 'arcticons/wormhole-2'],
  },
  /* Ondo: no Simple Icons slug; CoinGecko token image (see build-sources/ondo.png comment in build_matrix_icons.py). */
  {
    name: 'ondo',
    localPng: 'icons/matrix/build-sources/ondo.png',
    si: [],
  },
  { name: 'aapl', si: ['apple'] },
  { name: 'msft', si: ['microsoft'] },
  /* JPM: SI has no jpmorgan slug; Chase octagon is the bundled JPMC mark (Simple Icons chase) */
  {
    name: 'jpm',
    localSvg: 'icons/matrix/build-sources/jpm.svg',
    si: [],
    iconifyExtra: ['simple-icons/chase'],
  },
  {
    name: 'citi',
    localSvg: 'icons/matrix/build-sources/citi.svg',
    si: [],
  },
  { name: 'fidelity', si: [], iconifyExtra: ['arcticons/fidelity'] },
  /* Goldman Sachs: bundled Wikimedia Commons wordmark paths (see gs.svg); SI fallback is hairline at 32px */
  {
    name: 'gs',
    localSvg: 'icons/matrix/build-sources/gs.svg',
    si: [],
    iconifyExtra: ['simple-icons/goldmansachs'],
  },
  /* Coinbase: SI is a wordmark illegible at 20px; token/coinbase is the C arc mark */
  { name: 'coinbase', si: [], iconifyExtra: ['token/coinbase', 'simple-icons/coinbase'] },
  { name: 'sq', si: ['square', 'block'] },
  /* Visa: Iconify simple-icons = compact V-style mark; logos/visa = full wordmark fallback */
  { name: 'visa', si: [], iconifyExtra: ['simple-icons/visa', 'logos/visa'] },
  {
    name: 'kinexys',
    localSvg: 'icons/matrix/build-sources/kinexys.svg',
  },
  { name: 'ma', si: ['mastercard'] },
  { name: 'googl', si: ['google', 'alphabet'] },
  { name: 'amzn', si: ['amazon'] },
  { name: 'meta', si: ['meta'] },
  { name: 'x', si: ['x'] },
  {
    name: 'wmt',
    si: [],
    iconifyExtra: ['tabler/brand-walmart', 'arcticons/walmart'],
  },
  { name: 'nvda', si: ['nvidia'] },
  { name: 'tsla', si: ['tesla'] },
  {
    name: 'amd',
    localSvg: 'icons/matrix/build-sources/amd.svg',
    si: [],
    iconifyExtra: ['simple-icons/amd', 'lineicons/amd'],
  },
  { name: 'nflx', si: ['netflix'] },
  { name: 'bac', si: ['bankofamerica'] },
  {
    name: 'wfc',
    localSvg: 'icons/matrix/build-sources/wfc.svg',
    si: [],
    iconifyExtra: ['simple-icons/wellsfargo'],
  },
  { name: 'schw', si: ['charlesschwab', 'schwab'], iconifyExtra: ['arcticons/schwab'] },
  /* PayPal: SI mark reads as a lone P at 20px; logos/paypal = full wordmark */
  { name: 'pypl', si: [], iconifyExtra: ['logos/paypal', 'simple-icons/paypal'] },
  { name: 'facebook', si: ['facebook'] },
  /* SI venmo = full wordmark; fa7 venmo-v = stylized V mark at matrix size */
  { name: 'venmo', si: [], iconifyExtra: ['fa7-brands/venmo-v'] },
  {
    name: 'cashapp',
    localSvg: 'icons/matrix/build-sources/cashapp.svg',
    si: [],
    iconifyExtra: ['simple-icons/cashapp'],
  },
  /* Intel: logos/intel is ~512x216 (wide strip in 32px); SI intel is 24x24 and fills the square */
  { name: 'intc', si: [], iconifyExtra: ['simple-icons/intel', 'logos/intel'] },
  { name: 'csco', si: ['cisco'] },
  { name: 'orcl', si: ['oracle'] },
  { name: 'dis', si: ['waltdisney', 'disney', 'waltdisneyworld'], iconifyExtra: ['tabler/brand-disney'] },
  /* Strategy (MSTR): 2025 B mark; bundled (SI still ships old MicroStrategy bars) */
  {
    name: 'mstr',
    localSvg: 'icons/matrix/build-sources/mstr.svg',
  },
  { name: 'hood', si: ['robinhood'] },
  { name: 'ibm', si: ['ibm'] },
  {
    name: 'nasdaq',
    localSvg: 'icons/matrix/build-sources/nasdaq.svg',
  },
  {
    name: 'nyse',
    localSvg: 'icons/matrix/build-sources/nyse.svg',
  },
  {
    name: 'ice',
    localSvg: 'icons/matrix/build-sources/ice.svg',
  },
  { name: 'ko', si: ['cocacola', 'coca-cola'] },
  { name: 'stripe', si: ['stripe'] },
  { name: 'revolut', si: ['revolut'] },
  /* Block Inc: Simple Icons slug is "square" */
  { name: 'block', si: ['square'] },
  /* BlackRock: not in SI v16; bundled BR monogram (wordmark is too wide for 32px) */
  {
    name: 'blk',
    localSvg: 'icons/matrix/build-sources/blk.svg',
  },
  {
    name: 'securitize',
    localSvg: 'icons/matrix/build-sources/securitize.svg',
  },
  {
    name: 'bakkt',
    localSvg: 'icons/matrix/build-sources/bakkt.svg',
  },
  {
    name: 'fed',
    localSvg: 'icons/matrix/build-sources/fed.svg',
  },
  {
    name: 'frbny',
    localSvg: 'icons/matrix/build-sources/frbny.svg',
  },
  {
    name: 'cantor',
    localSvg: 'icons/matrix/build-sources/cantor.svg',
    si: [],
  },
  {
    name: 'clearstreet',
    localSvg: 'icons/matrix/build-sources/clearstreet.svg',
    si: [],
  },
  { name: 'wu', si: ['westernunion'] },
  { name: 'moneygram', si: ['moneygram'] },
  /* Bundled Lineicons path reads bolder at 32px than some SI strokes */
  {
    name: 'wise',
    localSvg: 'icons/matrix/build-sources/wise.svg',
    si: ['wise'],
    iconifyExtra: ['lineicons/wise'],
  },
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
  if (row.localSvg) {
    const p = path.join(process.cwd(), row.localSvg);
    if (fs.existsSync(p)) {
      const t = fs.readFileSync(p, 'utf8');
      if (t && t.trim().startsWith('<')) {
        return t;
      }
    }
    /* Rows that also list si / iconifyExtra keep trying when local is absent. */
  }
  for (const slug of row.si || []) {
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

    if (row.localPng) {
      const lp = path.join(process.cwd(), row.localPng);
      if (fs.existsSync(lp)) {
        try {
          buf = await rasterizeWhite32(page, {
            kind: 'png',
            b64: fs.readFileSync(lp).toString('base64'),
          });
        } catch {
          buf = null;
        }
      }
    }

    const svg = buf ? null : await fetchSvgForRow(row);
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
