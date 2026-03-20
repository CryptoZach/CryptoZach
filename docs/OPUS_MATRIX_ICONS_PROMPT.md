# Prompt for Opus 4.6: matrix icon assets (CryptoZach)

Copy everything inside the block below into a new chat with Opus 4.6 (or a similar research model). Adjust paths if your clone differs.

---

**BEGIN PROMPT**

**Automated path:** In the CryptoZach repo, run **`npm run build:matrix-icons`** to populate `icons/matrix/*.png` (Playwright + Simple Icons / Iconify / spothq). Use manual sourcing only for filenames the build report still lists as missing.

You are helping source small raster icons for an open personal research website (GitHub Pages). The site loads PNGs from `icons/matrix/` at runtime and draws them on a canvas at **16×16 CSS pixels** (48×48 tinted buffer, high-quality downscale). Source files should be **24×24 or 32×32 pixels**, **PNG with alpha (transparent background)**, and **legible when downscaled**. **White or light gray silhouettes on transparent** work best because the app tints them **green** in code.

**Hard requirements**

1. **Exact filenames** (lowercase, `.png` extension). Save or rename to match this list exactly; the code does not alias names.

2. **Format:** PNG, transparency preserved, square canvas, **24 or 32 px** per side.

3. **Style:** Prefer **monochrome mark** (symbol only), not full color marketing art, so the green tint reads cleanly.

4. **Licensing:** Only suggest or use assets that allow **redistribution in a public GitHub repo** and **use on a non-commercial personal site**. If uncertain, say so and suggest an alternative (e.g. Simple Icons SVG exported to PNG under their license, or a generic geometric substitute labeled as non-official).

5. **Trademarks:** Do not claim endorsement. Prefer **official media kits** where terms allow, **CC-licensed** packs, or **Simple Icons** (check each icon’s license on simpleicons.org).

**Manifest: filename → intended asset**

These names match **`script.js`** `iconDefs` (homepage matrix). **Fiat symbols** (`$`, `€`, etc.), **commodity and macro tickers** (e.g. `XAU`, `SOFR`), and legacy **`₿`** / **`Ξ`** (fixed low share in `pickItem`) are drawn as text. **Crypto project tickers** (e.g. `ADA`, `RNDR`) are not text in the matrix; use PNGs only.

**Crypto / DeFi / L1 / L2 (42).** `op.png` = Optimism, `arb.png` = Arbitrum, `rndr.png` = Render (RNDR token):

| File | Asset |
|------|--------|
| `btc.png` | Bitcoin |
| `eth.png` | Ethereum |
| `sol.png` | Solana |
| `usdc.png` | USDC |
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
| `op.png` | Optimism |
| `arb.png` | Arbitrum |
| `near.png` | NEAR |
| `apt.png` | Aptos |
| `sui.png` | Sui |
| `inj.png` | Injective |
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
| `ton.png` | Toncoin |
| `sei.png` | Sei |
| `wld.png` | Worldcoin |
| `rndr.png` | Render (RNDR) |
| `tao.png` | Bittensor (TAO) |

**Not in icon list (text-only in matrix):** fiat symbols, commodity tickers (XAU, XAG, WTI, NG, CL), macro tickers (SOFR, FFR, DXY, VIX, SPX, NDX), plus **`₿`** / **`Ξ`** as controlled in code. Crypto names are **icons only** in the matrix stream. No PNG required for the text-only rows unless you add new text later.

Companies / payments / banks (27). `coin` = Coinbase, `sq` = Block (Square mark), `ma` = Mastercard:

| File | Asset |
|------|--------|
| `aapl.png` | Apple |
| `msft.png` | Microsoft |
| `jpm.png` | JPMorgan Chase |
| `gs.png` | Goldman Sachs |
| `coin.png` | Coinbase |
| `sq.png` | Block (Square) |
| `visa.png` | Visa |
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
| `intc.png` | Intel |
| `csco.png` | Cisco |
| `orcl.png` | Oracle |
| `dis.png` | Disney |
| `mstr.png` | MicroStrategy |
| `hood.png` | Robinhood |
| `ibm.png` | IBM |
| `ko.png` | Coca-Cola |

**What to produce**

1. For **each row**, give **one recommended approach**: direct PNG URL (if license is clearly OK), or **Simple Icons** slug + export steps, or **CoinGecko / other API image URL** with a one-line license note, or **“manual: use brand media kit page X”** with caution.

2. Flag any asset as **high trademark risk** or **no clear redistribution license** and suggest a **fallback** (e.g. stylized initial letter in a circle, clearly not the brand logo, or skip).

3. End with a **checklist**: all **69** filenames accounted for (42 crypto + 27 company), notes on any gaps.

4. Do **not** fabricate download links. If you cannot verify a license, say **unknown** and recommend verification steps.

**END PROMPT**

---

## Repo notes (for humans)

- Target directory: **`icons/matrix/`** at site root (same level as `index.html`).
- Runtime paths in code: **`./icons/matrix/<name>.png`**.
- See also **`icons/matrix/README.md`** for a short on-folder summary.
