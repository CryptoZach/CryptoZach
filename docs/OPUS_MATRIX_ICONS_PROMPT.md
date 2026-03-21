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

These names match **`script.js`** `iconDefs` (homepage matrix). **Fiat symbols** (`$`, `€`, etc.), **commodity and macro tickers** (e.g. `XAU`, `DXY`, `VIX`), and legacy **`₿`** / **`Ξ`** (fixed low share in `pickItem`) are drawn as text. The former **`NDX`** text slot uses **`nasdaq.png`** (bundled **`Nasdaq_logo.svg`**) in the trad icon pool instead. **Crypto project tickers** (e.g. `ADA`, `RNDR`) are not text in the matrix; use PNGs only.

**Crypto / DeFi / L1 / L2 (54 filenames).** `op.png` = Optimism (bundled **`build-sources/op.svg`**: Iconify **token-branded/optimism** paths, not OP text). `arb.png` = Arbitrum (bundled **`build-sources/arb.svg`**: bold **ARB**; Iconify mark **whiten()**s to a disk; stroke hex + A was faint next to **OP** at 20px). **`ltc.png`**: bundled **`build-sources/ltc.svg`** (SI Litecoin is a filled coin). **`rndr.png`** = Render (bundled **`build-sources/rndr.svg`** from **`render-token-logo.svg`**: center dot + C-arc + corner dot; red circle background omitted). **`avax.png`**: bundled **`build-sources/avalanche-avax-fill-3ll8qiqg376l2e5i4vv6ti.webp`** (fill mark; copy of repo **`avalanche-avax-fill-3ll8qiqg376l2e5i4vv6ti.webp`**). **`tao.png`**: bundled **`build-sources/tao.svg`** (Iconify **`token/tao`** path mark; no **TAO** text ticker). **`base.png`** / **`ink.png`**: bundled **`base-logo.svg`** and **`ink-logo-purple-icon.svg`** (as **`build-sources/base.svg`**, **`ink.svg`**). **`arc.png`**: bundled **`build-sources/arc.svg`** from repo **`Arc-logo.svg`**. **`circle.png`**: Circle issuer mark, **`build-sources/circle.svg`** from **`Circle-logo.svg`**. **`m0.png`**: bundled **`build-sources/m0.png`** (**M0** logo). **`kraken.png`**: bundled **`kraken-2.svg`** (as **`build-sources/kraken.svg`**). **`metamask.png`**: Iconify **`token-branded/metamask`** first (fox mark); **`logos/metamask`** is a wide wordmark and **32px** raster reads as vertical smears (see **`scripts/build-matrix-icons.mjs`**). **`layerzero.png`**: bundled **`build-sources/layerzero.svg`** (no Iconify slug found). **`hyperliquid.png`**: bundled **`build-sources/hyperliquid.svg`** (cleaned from repo-root **`hyper-foundation.svg`**). **`bnb.png`**: bundled **`build-sources/bnb.svg`** (BNB Chain mark from **`bnb-chain-binance-smart-chain-logo.svg`**). **`wormhole.png`**: bundled **`build-sources/wormhole.svg`** from repo-root **`wormhole-w-logo.svg`** (concentric rings mark; not the arcticons stroke **W**). **`script.js`** duplicates **`eth`**, **`uni`**, **`aave`**, **`crv`**, **`arb`**, **`ton`** twice, **`op`** once, and **`usdc`** **three** times for pick weight (same PNG each time). In the company block it duplicates **`jpm`** for the same reason (Chase octagon mark from Simple Icons **`chase`** slug in the build). **`citi.png`** uses bundled **`build-sources/citi.svg`** (bold **CITI**; no SI slug in v16). **`fidelity.png`** removed: Iconify **`arcticons/fidelity`** was a plain capital **F** with no distinctive mark.

| File | Asset |
|------|--------|
| `btc.png` | Bitcoin |
| `eth.png` | Ethereum (bundled **`build-sources/eth.svg`** from **`ethereum-cryptocurrency-svgrepo-com.svg`**: filled diamond silhouette; stroke-only original converted to fill for matrix whiten) |
| `sol.png` | Solana |
| `usdc.png` | USDC (bundled **`build-sources/usdc.svg`**: spothq white **$** + motion arcs + ring; no blue fill so it still reads after whiten. Plain **`$`** text in the matrix is a single slot so the coin icon can read as USDC) |
| `usdt.png` | USDT (Tether) |
| `dai.png` | Dai |
| `hnt.png` | Helium (bundled **`build-sources/helium-hnt-logo.svg`**; **not** in **`script.js`** hero pool: legacy stroke hex read like Chainlink in the trail) |
| `fil.png` | Filecoin (bundled **`build-sources/fil.svg`** from **`filecoin-fil-logo.svg`**: **F** in circle; Iconify **`token/filecoin`** fallback) |
| `uni.png` | Uniswap (Iconify **`token/uniswap`**: unicorn silhouette; **`token-branded/uniswap`** fallback; Simple Icons has no `uniswap` slug in v16) |
| `aave.png` | Aave (bundled **`build-sources/aave.svg`** from **`aave-aave-logo.svg`**: purple ghost on circle; masked so **whiten()** keeps face cutouts, not a solid disk) |
| `xrp.png` | XRP |
| `ada.png` | Cardano |
| `avax.png` | Avalanche (bundled **`build-sources/avalanche-avax-fill-3ll8qiqg376l2e5i4vv6ti.webp`**: fill mark; replaces monospace **AVAX** text SVG) |
| `dot.png` | Polkadot (bundled **`build-sources/dot.svg`**: bold **DOT**; thick SI ring reads as a filled circle when blurred) |
| `atom.png` | Cosmos (ATOM) (**not** in **`script.js`** hero pool: dot-hex reads as an empty hex at matrix size) |
| `ltc.png` | Litecoin (bundled **`build-sources/ltc.svg`**: stroke ring + L; SI coin **whiten()**s to a puck) |
| `link.png` | Chainlink (bundled **`build-sources/link.svg`**: two overlapping rings; **not** in **`script.js`** `iconDefs` hero pool; SI hex + inner facets retired for matrix trail) |
| `xlm.png` | Stellar |
| `doge.png` | Dogecoin (bundled **`build-sources/doge.svg`**: bold **DOGE**; SI coin is a filled disk at matrix size) |
| `trx.png` | Tron |
| `bnb.png` | BNB (bundled **`build-sources/bnb.svg`** from **`bnb-chain-binance-smart-chain-logo.svg`**; **`Binance_Logo.svg.png`** in **`build-sources`** is reference raster, not used in build) |
| `op.png` | Optimism (bundled **`build-sources/op.svg`**: bold **OP**; Iconify mark blurs to bars at matrix size) |
| `arb.png` | Arbitrum (bundled **`build-sources/arb.svg`**: bold **ARB** ticker; pairs with **`op.svg`** in the matrix stream) |
| `near.png` | NEAR (bundled **`build-sources/near.svg`**: bold **NEAR**; SI ribbon **whiten()** reads as stacked smears at matrix size) |
| `apt.png` | Aptos (Iconify **`token/aptos`**, **`token-branded/aptos`** fallback; Web3 Icons MIT) |
| `sui.png` | Sui (bundled **`build-sources/sui.svg`**: bold **SUI**; Iconify **`token/sui`** paths mush when **whiten()**d at 20px) |
| `inj.png` | Injective |
| `hyperliquid.png` | Hyperliquid (bundled **`build-sources/hyperliquid.svg`**: cleaned Hyper Foundation mark with inline fill, no CSS classes; repo-root **`hyper-foundation.svg`** is the brand original; archived HL blob in **`hyperliquid-hl-symbol.svg`**) |
| `tia.png` | Celestia (bundled **`build-sources/tia.png`**; duplicated in **`iconDefs`** for weight; SI/Iconify fallback in build) |
| `xmr.png` | Monero |
| `zec.png` | Zcash |
| `crv.png` | Curve CRV (bundled **`build-sources/crv.png`** copied from repo-root **`Curve_logo.png`**; duplicated in **`iconDefs`** for weight) |
| `ldo.png` | Lido (LDO) (bundled **`build-sources/ldo.png`**; duplicated in **`iconDefs`** for weight; SI/Iconify fallback in build) |
| `stx.png` | Stacks |
| `mkr.png` | Maker (MKR) |
| `xtz.png` | Tezos |
| `algo.png` | Algorand |
| `hbar.png` | Hedera (HBAR) |
| `ton.png` | Toncoin (Iconify `token-branded/ton` preferred in build) |
| `sei.png` | Sei (bundled **`build-sources/sei.png`**; duplicated in **`iconDefs`** for weight; SI/Iconify fallback in build) |
| `wld.png` | Worldcoin (Iconify **`arcticons/worldcoin`** orb; no **`token/worldcoin`** in Iconify; Simple Icons has no slug in v16) |
| `rndr.png` | Render (RNDR) |
| `tao.png` | Bittensor (TAO) (bundled **`build-sources/tao.svg`**: Iconify **`token/tao`** path mark; no **TAO** text ticker) |
| `kraken.png` | Kraken (bundled **`build-sources/kraken.svg`** from **`kraken-2.svg`**: octopus mark; retired Iconify hex-only mark and hero omission) |
| `metamask.png` | MetaMask |
| `layerzero.png` | LayerZero (bundled stepped-layer silhouette in **`build-sources/layerzero.svg`**) |
| `wormhole.png` | Wormhole (bundled **`build-sources/wormhole.svg`** from **`wormhole-w-logo.svg`**: concentric rings; arcticons fallbacks in build only) |
| `ondo.png` | Ondo Finance / ONDO (bundled **`build-sources/ondo.png`**: CoinGecko token image; no Simple Icons slug) |
| `zrx.png` | 0x / ZRX (bundled **`build-sources/zrx.svg`**: Iconify **token/zrx**) |
| `base.png` | Base (L2) (bundled **`build-sources/base.svg`**: **BASE** ticker; Iconify **`token/base`** is only a rounded square and **whiten()** reads as an empty tile) |
| `ink.png` | Ink (Kraken L2) (bundled **`build-sources/ink.svg`**: **INK** ticker) |
| `arc.png` | Arc (Circle Arc network) (bundled **`build-sources/arc.svg`** from repo **`Arc-logo.svg`**) |
| `circle.png` | Circle (issuer) (bundled **`build-sources/circle.svg`** from repo **`Circle-logo.svg`**) |

**Not in icon list (text-only in matrix):** fiat symbols, commodity tickers (XAU, XAG), macro tickers (DXY, VIX), plus **`₿`** / **`Ξ`** as controlled in code. **`NDX`** is not text; use **`nasdaq.png`** (from **`Nasdaq_logo.svg`**) for Nasdaq / NDX-100 style representation. **WTI** was retired as text; **`wormhole.png`** is pushed into the **trad** pool as well as **crypto** so the former W-ticker slot shows the Wormhole logo. Crypto names are **icons only** in the matrix stream. No PNG required for the text-only rows unless you add new text later.

Companies / payments / banks (38). `coinbase` = Coinbase, `sq` = Block (Square mark), `ma` = Mastercard. **Bundled SVGs** (no Simple Icons slug as of this manifest, or bundled chosen over CDN): `build-sources/usdc.svg`, `layerzero.svg`, `kinexys.svg`, `nasdaq.svg`, `nyse.svg`, `ice.svg`, `citi.svg`, **`bakkt.svg`** (from repo **`BKKT.svg`**), **`wise.svg`** (Lineicons path, **MIT**; attribute Lineicons if you redistribute the SVG source) (rasterized by **`npm run build:matrix-icons`**; abstract or custom silhouettes where noted, not necessarily official marks).

| File | Asset |
|------|--------|
| `aapl.png` | Apple |
| `msft.png` | Microsoft (**`prefersIconify`**: **`logos/microsoft`**, then SI; see **`scripts/build-matrix-icons.mjs`**) |
| `jpm.png` | JPMorgan Chase (bundled **`build-sources/jpm.svg`**: Chase octagon; SI has no **jpmorgan** slug) |
| `citi.png` | Citibank (bundled **`build-sources/citi.svg`**: bold **CITI**; no SI slug in v16) |
| `gs.png` | Goldman Sachs (bundled **`build-sources/gs.svg`**: [Wikimedia Commons **Goldman Sachs.svg**](https://commons.wikimedia.org/wiki/File:Goldman_Sachs.svg) wordmark paths; blue background path removed for matrix) |
| `coinbase.png` | Coinbase (bundled **`build-sources/coinbase.svg`** from **`coinbase-logo-icon.svg`**) |
| `sq.png` | Block (Square) |
| `visa.png` | Visa |
| `kinexys.png` | Kinexys (J.P. Morgan digital payments / DLT) |
| `ma.png` | Mastercard |
| `googl.png` | Alphabet (Google) |
| `amzn.png` | Amazon (**`prefersIconify`**: **`mdi/amazon`**, **`fa6-brands/amazon`**, then SI) |
| `meta.png` | Meta |
| `x.png` | X (Simple Icons slug **`x`**) |
| `wmt.png` | Walmart (Iconify **`tabler/brand-walmart`**; **`arcticons/walmart`** fallback; no Simple Icons slug in v16) |
| `nvda.png` | NVIDIA |
| `tsla.png` | Tesla |
| `amd.png` | AMD (bundled **`build-sources/amd.svg`**: Simple Icons wordmark paths; ticker text retired) |
| `nflx.png` | Netflix |
| `bac.png` | Bank of America (bundled **`build-sources/bac.svg`**: **BoA** monospace label) |
| `wfc.png` | Wells Fargo (bundled **`build-sources/wfc.svg`**: Simple Icons **`wellsfargo`** wordmark paths only; outer frame rectangle removed so the matrix shows text, not a square; **`scale(0.88)`** inset; **`blk.png`** still gets a +8px draw cap boost) |
| `schw.png` | Charles Schwab |
| `pypl.png` | PayPal |
| `venmo.png` | Venmo (Iconify **`fa7-brands/venmo-v`**: stylized **V**; Simple Icons **`venmo`** is the full wordmark and is too small to read at 20px) |
| `cashapp.png` | Cash App |
| `wise.png` | Wise (bundled **`build-sources/wise.svg`**: Lineicons **`wise`** path; **`si: ['wise']`** and **`lineicons/wise`** fallbacks in build) |
| `intc.png` | Intel |
| `csco.png` | Cisco |
| `orcl.png` | Oracle (bundled **`build-sources/orcl.svg`** from repo **`oracle.svg`**; **`prefersIconify`** **`logos/oracle`**, then SI, if bundled file missing) |
| `dis.png` | Disney (**`prefersIconify`**: **`tabler/brand-disney`**, **`arcticons/disney`**, then SI **waltdisney** slugs) |
| `mstr.png` | Strategy (MSTR) (bundled **`build-sources/strategy-logo-2025.png`** from **`Strategy_logo_(2025).svg.png`**: wordmark + **₿**; rasterized to white silhouette) |
| `hood.png` | Robinhood |
| `ibm.png` | IBM (**`prefersIconify`**: **`logos/ibm`**, then SI) |
| `nasdaq.png` | Nasdaq (bundled **`build-sources/nasdaq.svg`** from **`Nasdaq_logo.svg`**; duplicated in **`iconDefs`** for former **NDX** text weight) |
| `nyse.png` | NYSE (bundled abstract portico silhouette) |
| `ice.png` | ICE / Intercontinental Exchange (bundled abstract globe silhouette) |
| `ko.png` | Coca-Cola |
| `bakkt.png` | Bakkt (bundled **`build-sources/bakkt.svg`** from repo **`BKKT.svg`**: Bakkt mark) |

**What to produce**

1. For **each row**, give **one recommended approach**: direct PNG URL (if license is clearly OK), or **Simple Icons** slug + export steps, or **CoinGecko / other API image URL** with a one-line license note, or **“manual: use brand media kit page X”** with caution.

2. Flag any asset as **high trademark risk** or **no clear redistribution license** and suggest a **fallback** (e.g. stylized initial letter in a circle, clearly not the brand logo, or skip).

3. End with a **checklist**: all **105** unique PNG filenames (54 crypto + 51 company), plus note that **`script.js`** may repeat some crypto `iconDefs` for weight, not extra files.

4. Do **not** fabricate download links. If you cannot verify a license, say **unknown** and recommend verification steps.

**END PROMPT**

---

## Repo notes (for humans)

- Target directory: **`icons/matrix/`** at site root (same level as `index.html`).
- Runtime paths in code: **`./icons/matrix/<name>.png`**.
- See also **`icons/matrix/README.md`** for a short on-folder summary.
