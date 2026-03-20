# Prompt for Opus 4.6: matrix icon assets (CryptoZach)

Copy everything inside the block below into a new chat with Opus 4.6 (or a similar research model). Adjust paths if your clone differs.

---

**BEGIN PROMPT**

**Automated path:** In the CryptoZach repo, run **`npm run build:matrix-icons`** to populate `icons/matrix/*.png` (Playwright + Simple Icons / Iconify / spothq). Use manual sourcing only for filenames the build report still lists as missing.

You are helping source small raster icons for an open personal research website (GitHub Pages). The site loads PNGs from `icons/matrix/` at runtime, tints them at **native PNG resolution**, then draws at about **20×20 CSS pixels** with high-quality smoothing (single downscale). Source files should be **24×24 or 32×32 pixels**, **PNG with alpha (transparent background)**, and **legible when downscaled**. **White or light gray silhouettes on transparent** work best because the app tints them **green** in code.

**Hard requirements**

1. **Exact filenames** (lowercase, `.png` extension). Save or rename to match this list exactly; the code does not alias names.

2. **Format:** PNG, transparency preserved, square canvas, **24 or 32 px** per side.

3. **Style:** Prefer **monochrome mark** (symbol only), not full color marketing art, so the green tint reads cleanly.

4. **Licensing:** Only suggest or use assets that allow **redistribution in a public GitHub repo** and **use on a non-commercial personal site**. If uncertain, say so and suggest an alternative (e.g. Simple Icons SVG exported to PNG under their license, or a generic geometric substitute labeled as non-official).

5. **Trademarks:** Do not claim endorsement. Prefer **official media kits** where terms allow, **CC-licensed** packs, or **Simple Icons** (check each icon’s license on simpleicons.org).

**Manifest: filename → intended asset**

These names match **`script.js`** `iconDefs` (homepage matrix). **Fiat symbols** (`$`, `€`, etc.), **commodity and macro tickers** (e.g. `XAU`, `SOFR`), and legacy **`₿`** / **`Ξ`** (fixed low share in `pickItem`) are drawn as text. **Crypto project tickers** (e.g. `ADA`, `RNDR`) are not text in the matrix; use PNGs only.

**Crypto / DeFi / L1 / L2 (46 filenames).** `op.png` = Optimism, `arb.png` = Arbitrum, `rndr.png` = Render (RNDR token). **`kraken.png`** / **`metamask.png`**: Iconify `logos/*` (see **`scripts/build-matrix-icons.mjs`**). **`layerzero.png`**: bundled **`build-sources/layerzero.svg`** (no Iconify slug found). **`wormhole.png`**: Iconify **`arcticons/wormhole`**. **`script.js`** duplicates **`eth`**, **`uni`**, **`aave`**, **`crv`**, **`op`**, **`arb`**, **`ton`** twice and **`usdc`** **three** times for pick weight (same PNG each time). In the company block it duplicates **`jpm`** for the same reason (Chase octagon mark from Simple Icons **`chase`** slug in the build).

| File | Asset |
|------|--------|
| `btc.png` | Bitcoin |
| `eth.png` | Ethereum |
| `sol.png` | Solana |
| `usdc.png` | USDC (bundled **`build-sources/usdc.svg`**: spothq white **$** + motion arcs + ring; no blue fill so it still reads after whiten. Plain **`$`** text in the matrix is a single slot so the coin icon can read as USDC) |
| `usdt.png` | USDT (Tether) |
| `dai.png` | Dai |
| `hnt.png` | Helium |
| `fil.png` | Filecoin |
| `uni.png` | Uniswap |
| `aave.png` | Aave |
| `xrp.png` | XRP |
| `ada.png` | Cardano |
| `avax.png` | Avalanche |
| `dot.png` | Polkadot |
| `atom.png` | Cosmos (ATOM) |
| `ltc.png` | Litecoin |
| `link.png` | Chainlink |
| `xlm.png` | Stellar |
| `doge.png` | Dogecoin |
| `trx.png` | Tron |
| `bnb.png` | BNB |
| `op.png` | Optimism (Iconify `token-branded/optimism` preferred in build) |
| `arb.png` | Arbitrum (no SI slug on jsDelivr v16; Iconify `token-branded/arbitrum`) |
| `near.png` | NEAR |
| `apt.png` | Aptos |
| `sui.png` | Sui |
| `inj.png` | Injective |
| `hyperliquid.png` | Hyperliquid (HYPE) |
| `tia.png` | Celestia |
| `xmr.png` | Monero |
| `zec.png` | Zcash |
| `crv.png` | Curve |
| `ldo.png` | Lido (LDO) |
| `stx.png` | Stacks |
| `mkr.png` | Maker (MKR) |
| `xtz.png` | Tezos |
| `algo.png` | Algorand |
| `hbar.png` | Hedera (HBAR) |
| `ton.png` | Toncoin (Iconify `token-branded/ton` preferred in build) |
| `sei.png` | Sei |
| `wld.png` | Worldcoin |
| `rndr.png` | Render (RNDR) |
| `tao.png` | Bittensor (TAO) |
| `kraken.png` | Kraken |
| `metamask.png` | MetaMask |
| `layerzero.png` | LayerZero (bundled stepped-layer silhouette in **`build-sources/layerzero.svg`**) |
| `wormhole.png` | Wormhole (Iconify Arcticons) |

**Not in icon list (text-only in matrix):** fiat symbols, commodity tickers (XAU, XAG, WTI, NG, CL), macro tickers (SOFR, FFR, DXY, VIX, SPX, NDX), plus **`₿`** / **`Ξ`** as controlled in code. Crypto names are **icons only** in the matrix stream. No PNG required for the text-only rows unless you add new text later.

Companies / payments / banks (34). `coinbase` = Coinbase, `sq` = Block (Square mark), `ma` = Mastercard. **Bundled SVGs** (no Simple Icons slug as of this manifest): `build-sources/usdc.svg`, `layerzero.svg`, `kinexys.svg`, `nasdaq.svg`, `nyse.svg`, `ice.svg` (rasterized by **`npm run build:matrix-icons`**; abstract or custom silhouettes where noted, not necessarily official marks).

| File | Asset |
|------|--------|
| `aapl.png` | Apple |
| `msft.png` | Microsoft |
| `jpm.png` | JPMorgan Chase |
| `gs.png` | Goldman Sachs |
| `coinbase.png` | Coinbase |
| `sq.png` | Block (Square) |
| `visa.png` | Visa |
| `kinexys.png` | Kinexys (J.P. Morgan digital payments / DLT) |
| `ma.png` | Mastercard |
| `googl.png` | Alphabet (Google) |
| `amzn.png` | Amazon |
| `meta.png` | Meta |
| `nvda.png` | NVIDIA |
| `tsla.png` | Tesla |
| `amd.png` | AMD |
| `nflx.png` | Netflix |
| `bac.png` | Bank of America |
| `wfc.png` | Wells Fargo |
| `schw.png` | Charles Schwab |
| `pypl.png` | PayPal |
| `facebook.png` | Facebook |
| `venmo.png` | Venmo |
| `cashapp.png` | Cash App |
| `intc.png` | Intel |
| `csco.png` | Cisco |
| `orcl.png` | Oracle |
| `dis.png` | Disney |
| `mstr.png` | MicroStrategy |
| `hood.png` | Robinhood |
| `ibm.png` | IBM |
| `nasdaq.png` | Nasdaq (bundled abstract chart silhouette) |
| `nyse.png` | NYSE (bundled abstract portico silhouette) |
| `ice.png` | ICE / Intercontinental Exchange (bundled abstract globe silhouette) |
| `ko.png` | Coca-Cola |

**What to produce**

1. For **each row**, give **one recommended approach**: direct PNG URL (if license is clearly OK), or **Simple Icons** slug + export steps, or **CoinGecko / other API image URL** with a one-line license note, or **“manual: use brand media kit page X”** with caution.

2. Flag any asset as **high trademark risk** or **no clear redistribution license** and suggest a **fallback** (e.g. stylized initial letter in a circle, clearly not the brand logo, or skip).

3. End with a **checklist**: all **81** unique PNG filenames (47 crypto + 34 company), plus note that **`script.js`** may repeat some crypto `iconDefs` for weight, not extra files.

4. Do **not** fabricate download links. If you cannot verify a license, say **unknown** and recommend verification steps.

**END PROMPT**

---

## Repo notes (for humans)

- Target directory: **`icons/matrix/`** at site root (same level as `index.html`).
- Runtime paths in code: **`./icons/matrix/<name>.png`**.
- See also **`icons/matrix/README.md`** for a short on-folder summary.
