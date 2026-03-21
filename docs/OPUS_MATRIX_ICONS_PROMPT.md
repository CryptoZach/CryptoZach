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

These names match **`script.js`** `iconDefs` (homepage matrix). **Fiat symbols** (`$`, `€`, etc.), **commodity and macro tickers** (e.g. `XAU`, `DXY`, `NDX`), and legacy **`₿`** / **`Ξ`** (fixed low share in `pickItem`) are drawn as text. **Crypto project tickers** (e.g. `ADA`, `RNDR`) are not text in the matrix; use PNGs only.

**Crypto / DeFi / L1 / L2 (48 filenames).** `op.png` = Optimism (bundled **`build-sources/op.svg`**: Iconify **token-branded/optimism** paths, not OP text). `arb.png` = Arbitrum (bundled **`build-sources/arb.svg`**: bold **ARB**; Iconify mark **whiten()**s to a disk; stroke hex + A was faint next to **OP** at 20px). **`ltc.png`**: bundled **`build-sources/ltc.svg`** (SI Litecoin is a filled coin). **`rndr.png` = Render (RNDR token). **`kraken.png`**: Iconify **`logos/kraken`**. **`metamask.png`**: Iconify **`token-branded/metamask`** first (fox mark); **`logos/metamask`** is a wide wordmark and **32px** raster reads as vertical smears (see **`scripts/build-matrix-icons.mjs`**). **`layerzero.png`**: bundled **`build-sources/layerzero.svg`** (no Iconify slug found). **`hyperliquid.png`**: bundled **`build-sources/hyperliquid.svg`**. **`wormhole.png`**: Iconify **`arcticons/wormhole`**. **`script.js`** duplicates **`eth`**, **`uni`**, **`aave`**, **`crv`**, **`arb`**, **`ton`** twice, **`op`** once, and **`usdc`** **three** times for pick weight (same PNG each time). In the company block it duplicates **`jpm`** for the same reason (Chase octagon mark from Simple Icons **`chase`** slug in the build). **`citi.png`** uses bundled **`build-sources/citi.svg`** (bold **CITI**; no SI slug in v16). **`fidelity.png`** uses Iconify **`arcticons/fidelity`**.

| File | Asset |
|------|--------|
| `btc.png` | Bitcoin |
| `eth.png` | Ethereum |
| `sol.png` | Solana |
| `usdc.png` | USDC (bundled **`build-sources/usdc.svg`**: spothq white **$** + motion arcs + ring; no blue fill so it still reads after whiten. Plain **`$`** text in the matrix is a single slot so the coin icon can read as USDC) |
| `usdt.png` | USDT (Tether) |
| `dai.png` | Dai |
| `hnt.png` | Helium (bundled **`build-sources/hnt.svg`**: hex **ring** only; stroke **H** removed so it does not read as a squiggle inside the hex at 32px) |
| `fil.png` | Filecoin |
| `uni.png` | Uniswap (Iconify **`token/uniswap`**: unicorn silhouette; **`token-branded/uniswap`** fallback; Simple Icons has no `uniswap` slug in v16) |
| `aave.png` | Aave (bundled **`build-sources/aave.svg`**: bold **AAVE**; SI / color disk reads as a large blank green circle at 20px) |
| `xrp.png` | XRP |
| `ada.png` | Cardano |
| `avax.png` | Avalanche |
| `dot.png` | Polkadot (bundled **`build-sources/dot.svg`**: bold **DOT**; thick SI ring reads as a filled circle when blurred) |
| `atom.png` | Cosmos (ATOM) |
| `ltc.png` | Litecoin (bundled **`build-sources/ltc.svg`**: stroke ring + L; SI coin **whiten()**s to a puck) |
| `link.png` | Chainlink (bundled **`build-sources/link.svg`**; **not** in **`script.js`** `iconDefs` hero pool: hex mark still reads poorly with matrix trail) |
| `xlm.png` | Stellar |
| `doge.png` | Dogecoin (bundled **`build-sources/doge.svg`**: bold **DOGE**; SI coin is a filled disk at matrix size) |
| `trx.png` | Tron |
| `bnb.png` | BNB |
| `op.png` | Optimism (bundled **`build-sources/op.svg`**: bold **OP**; Iconify mark blurs to bars at matrix size) |
| `arb.png` | Arbitrum (bundled **`build-sources/arb.svg`**: bold **ARB** ticker; pairs with **`op.svg`** in the matrix stream) |
| `near.png` | NEAR (bundled **`build-sources/near.svg`**: bold **NEAR**; SI ribbon **whiten()** reads as stacked smears at matrix size) |
| `apt.png` | Aptos (Iconify **`token/aptos`**, **`token-branded/aptos`** fallback; Web3 Icons MIT) |
| `sui.png` | Sui (bundled **`build-sources/sui.svg`**: bold **SUI**; Iconify **`token/sui`** paths mush when **whiten()**d at 20px) |
| `inj.png` | Injective |
| `hyperliquid.png` | Hyperliquid (HYPE) |
| `tia.png` | Celestia |
| `xmr.png` | Monero |
| `zec.png` | Zcash |
| `crv.png` | Curve CRV (bundled **`build-sources/crv.svg`**: spothq coin glyph without blue disk; duplicated in **`iconDefs`** for weight) |
| `ldo.png` | Lido (LDO) |
| `stx.png` | Stacks |
| `mkr.png` | Maker (MKR) |
| `xtz.png` | Tezos |
| `algo.png` | Algorand |
| `hbar.png` | Hedera (HBAR) |
| `ton.png` | Toncoin (Iconify `token-branded/ton` preferred in build) |
| `sei.png` | Sei (bundled **`build-sources/sei.svg`**: bold **SEI**; Iconify **`token/sei`** waves read as stripe smears at matrix size) |
| `wld.png` | Worldcoin (Iconify **`arcticons/worldcoin`** orb; no **`token/worldcoin`** in Iconify; Simple Icons has no slug in v16) |
| `rndr.png` | Render (RNDR) |
| `tao.png` | Bittensor (TAO) |
| `kraken.png` | Kraken |
| `metamask.png` | MetaMask |
| `layerzero.png` | LayerZero (bundled stepped-layer silhouette in **`build-sources/layerzero.svg`**) |
| `wormhole.png` | Wormhole (Iconify Arcticons) |
| `ondo.png` | Ondo Finance / ONDO (bundled **`build-sources/ondo.png`**: CoinGecko token image; no Simple Icons slug) |

**Not in icon list (text-only in matrix):** fiat symbols, commodity tickers (XAU, XAG), macro tickers (DXY, VIX, NDX), plus **`₿`** / **`Ξ`** as controlled in code. **WTI** was retired as text; **`wormhole.png`** is pushed into the **trad** pool as well as **crypto** so the former W-ticker slot shows the Wormhole logo. Crypto names are **icons only** in the matrix stream. No PNG required for the text-only rows unless you add new text later.

Companies / payments / banks (38). `coinbase` = Coinbase, `sq` = Block (Square mark), `ma` = Mastercard. **Bundled SVGs** (no Simple Icons slug as of this manifest): `build-sources/usdc.svg`, `layerzero.svg`, `kinexys.svg`, `nasdaq.svg`, `nyse.svg`, `ice.svg`, `citi.svg` (rasterized by **`npm run build:matrix-icons`**; abstract or custom silhouettes where noted, not necessarily official marks).

| File | Asset |
|------|--------|
| `aapl.png` | Apple |
| `msft.png` | Microsoft |
| `jpm.png` | JPMorgan Chase (bundled **`build-sources/jpm.svg`**: Chase octagon; SI has no **jpmorgan** slug) |
| `citi.png` | Citibank (bundled **`build-sources/citi.svg`**: bold **CITI**; no SI slug in v16) |
| `gs.png` | Goldman Sachs (bundled **`build-sources/gs.svg`**: [Wikimedia Commons **Goldman Sachs.svg**](https://commons.wikimedia.org/wiki/File:Goldman_Sachs.svg) wordmark paths; blue background path removed for matrix) |
| `coinbase.png` | Coinbase (Iconify **`token/coinbase`** C arc; SI is a wordmark at matrix size) |
| `sq.png` | Block (Square) |
| `visa.png` | Visa |
| `kinexys.png` | Kinexys (J.P. Morgan digital payments / DLT) |
| `ma.png` | Mastercard |
| `googl.png` | Alphabet (Google) |
| `amzn.png` | Amazon |
| `meta.png` | Meta |
| `x.png` | X (Simple Icons slug **`x`**) |
| `wmt.png` | Walmart (Iconify **`tabler/brand-walmart`**; **`arcticons/walmart`** fallback; no Simple Icons slug in v16) |
| `nvda.png` | NVIDIA |
| `tsla.png` | Tesla |
| `amd.png` | AMD (bundled **`build-sources/amd.svg`**: Simple Icons wordmark paths; ticker text retired) |
| `nflx.png` | Netflix |
| `bac.png` | Bank of America |
| `wfc.png` | Wells Fargo (bundled **`build-sources/wfc.svg`**: Simple Icons **`wellsfargo`** wordmark path, boxed lockup, **`scale(0.88)`** inset; same random draw size range as other icons; **`blk.png`** still gets a +8px draw cap boost) |
| `schw.png` | Charles Schwab |
| `pypl.png` | PayPal |
| `venmo.png` | Venmo (Iconify **`fa7-brands/venmo-v`**: stylized **V**; Simple Icons **`venmo`** is the full wordmark and is too small to read at 20px) |
| `cashapp.png` | Cash App |
| `intc.png` | Intel |
| `csco.png` | Cisco |
| `orcl.png` | Oracle |
| `dis.png` | Disney |
| `mstr.png` | Strategy (MSTR; 2025 B mark) |
| `hood.png` | Robinhood |
| `ibm.png` | IBM |
| `nasdaq.png` | Nasdaq (bundled abstract chart silhouette) |
| `nyse.png` | NYSE (bundled abstract portico silhouette) |
| `ice.png` | ICE / Intercontinental Exchange (bundled abstract globe silhouette) |
| `ko.png` | Coca-Cola |

**What to produce**

1. For **each row**, give **one recommended approach**: direct PNG URL (if license is clearly OK), or **Simple Icons** slug + export steps, or **CoinGecko / other API image URL** with a one-line license note, or **“manual: use brand media kit page X”** with caution.

2. Flag any asset as **high trademark risk** or **no clear redistribution license** and suggest a **fallback** (e.g. stylized initial letter in a circle, clearly not the brand logo, or skip).

3. End with a **checklist**: all **99** unique PNG filenames (48 crypto + 51 company), plus note that **`script.js`** may repeat some crypto `iconDefs` for weight, not extra files.

4. Do **not** fabricate download links. If you cannot verify a license, say **unknown** and recommend verification steps.

**END PROMPT**

---

## Repo notes (for humans)

- Target directory: **`icons/matrix/`** at site root (same level as `index.html`).
- Runtime paths in code: **`./icons/matrix/<name>.png`**.
- See also **`icons/matrix/README.md`** for a short on-folder summary.
