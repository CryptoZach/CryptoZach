# Matrix strip icons (optional)

The homepage hero matrix animation loads PNGs from this folder when present. If a file is missing or fails to load, that icon is skipped and text-only glyphs still render.

**Generate assets (recommended):** from repo root run **`npm run build:matrix-icons`**. That script pulls Simple Icons (jsDelivr + Iconify), Iconify `token/*` / `cryptocurrency-color/*` where needed, and spothq cryptocurrency-icons PNGs, then writes **32×32 white-on-transparent** PNGs via Playwright. The manifest matches **`script.js`** `iconDefs` (no orphan filenames).

**Sourcing help:** paste-ready prompt for an LLM (manifest, license constraints, filenames) lives in **[`docs/OPUS_MATRIX_ICONS_PROMPT.md`](../docs/OPUS_MATRIX_ICONS_PROMPT.md)**.

**Expected files (24px or 32px PNG, transparent background):** **81** unique PNGs (**47** crypto tickers + **34** company). **`script.js`** `iconDefs` may list the same `*.png` more than once (for example **`eth.png`**, **`usdc.png`** listed three times, **`uni.png`**, **`aave.png`**, **`crv.png`**, **`op.png`**, **`arb.png`**, **`ton.png`** in crypto, and **`jpm.png`** in companies) to weight those streams. Authoritative manifest for sourcing is **`docs/OPUS_MATRIX_ICONS_PROMPT.md`**. Some marks have **no Simple Icons slug**, or the CDN art **whiten()**s to a blob (filled disk + foreground): place **`build-sources/<name>.svg`**, or rely on Iconify in **`npm run build:matrix-icons`** (for example **`kraken`**, **`metamask`**), or see bundled **`usdc.svg`**, **`dai.svg`**, **`link.svg`**, **`hbar.svg`**, **`cashapp.svg`**, **`hyperliquid.svg`**, **`layerzero.svg`**, **`kinexys.svg`**, **`nasdaq.svg`**, **`nyse.svg`**, **`ice.svg`**.

**Crypto (47 filenames):** `btc.png`, `eth.png`, `sol.png`, `usdc.png`, `usdt.png`, `dai.png`, `hnt.png`, `fil.png`, `uni.png`, `aave.png`, `xrp.png`, `ada.png`, `avax.png`, `dot.png`, `atom.png`, `ltc.png`, `link.png`, `xlm.png`, `doge.png`, `trx.png`, `bnb.png`, `op.png`, `arb.png`, `near.png`, `apt.png`, `sui.png`, `inj.png`, `hyperliquid.png`, `tia.png`, `xmr.png`, `zec.png`, `crv.png`, `ldo.png`, `stx.png`, `mkr.png`, `xtz.png`, `algo.png`, `hbar.png`, `ton.png`, `sei.png`, `wld.png`, `rndr.png`, `tao.png`, `kraken.png`, `metamask.png`, `layerzero.png`, `wormhole.png`

**Companies / payments (34):** `aapl.png`, `msft.png`, `jpm.png`, `gs.png`, `coinbase.png`, `sq.png`, `visa.png`, `kinexys.png`, `ma.png`, `googl.png`, `amzn.png`, `meta.png`, `nvda.png`, `tsla.png`, `amd.png`, `nflx.png`, `bac.png`, `wfc.png`, `schw.png`, `pypl.png`, `facebook.png`, `venmo.png`, `cashapp.png`, `intc.png`, `csco.png`, `orcl.png`, `dis.png`, `mstr.png`, `hood.png`, `ibm.png`, `nasdaq.png`, `nyse.png`, `ice.png`, `ko.png`

Icons are tinted green in canvas at runtime. Use white or neutral silhouettes for the cleanest result.

Respect each brand or project trademark and license terms when sourcing artwork.
