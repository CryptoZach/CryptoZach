# Matrix strip icons (optional)

The homepage hero matrix animation loads PNGs from this folder when present. If a file is missing or fails to load, that icon is skipped and text-only glyphs still render.

**Generate assets (recommended):** from repo root run **`npm run build:matrix-icons`**. That script pulls Simple Icons (jsDelivr + Iconify), Iconify `token/*` / `cryptocurrency-color/*` where needed, and spothq cryptocurrency-icons PNGs, then writes **32×32 white-on-transparent** PNGs via Playwright. The manifest matches **`script.js`** `iconDefs` (no orphan filenames).

**Sourcing help:** paste-ready prompt for an LLM (manifest, license constraints, filenames) lives in **[`docs/OPUS_MATRIX_ICONS_PROMPT.md`](../docs/OPUS_MATRIX_ICONS_PROMPT.md)**.

**Expected files (24px or 32px PNG, transparent background):** full list matches `iconDefs` in **`script.js`** (42 crypto + 27 company, **69** PNGs). Icons are tinted and drawn at **16×16 CSS px** on the hero matrix. Authoritative manifest for sourcing is **`docs/OPUS_MATRIX_ICONS_PROMPT.md`**.

**Crypto (42):** `btc.png`, `eth.png`, `sol.png`, `usdc.png`, `usdt.png`, `dai.png`, `hnt.png`, `fil.png`, `uni.png`, `aave.png`, `xrp.png`, `ada.png`, `avax.png`, `dot.png`, `atom.png`, `ltc.png`, `link.png`, `xlm.png`, `doge.png`, `trx.png`, `bnb.png`, `op.png`, `arb.png`, `near.png`, `apt.png`, `sui.png`, `inj.png`, `tia.png`, `xmr.png`, `zec.png`, `crv.png`, `ldo.png`, `stx.png`, `mkr.png`, `xtz.png`, `algo.png`, `hbar.png`, `ton.png`, `sei.png`, `wld.png`, `rndr.png`, `tao.png`

**Companies / payments (27):** `aapl.png`, `msft.png`, `jpm.png`, `gs.png`, `coin.png`, `sq.png`, `visa.png`, `ma.png`, `googl.png`, `amzn.png`, `meta.png`, `nvda.png`, `tsla.png`, `amd.png`, `nflx.png`, `bac.png`, `wfc.png`, `schw.png`, `pypl.png`, `intc.png`, `csco.png`, `orcl.png`, `dis.png`, `mstr.png`, `hood.png`, `ibm.png`, `ko.png`

Icons are tinted green in canvas at runtime. Use white or neutral silhouettes for the cleanest result.

Respect each brand or project trademark and license terms when sourcing artwork.
