# Matrix icon and ticker audit (homepage hero)

Use this with **`.cursor/skills/cryptozach-matrix-icons`** when changing **`icons/matrix`**, **`scripts/build-matrix-icons.mjs`**, or **`build_matrix_icons.py`**.

## F, S, and OP-like glyphs (macro text and tickers)

**`script.js` `textChars`** intentionally omits tickers whose **Latin letters** are mostly **F** or **S** (for example **SOFR**, **FFR**, **SPX**), and **bundled** marks avoid **FED**, **FRB**, **Fargo**, lone **S**, and **OP** text where those read as unwanted letters. **Optimism** uses **Iconify `token-branded/optimism`** paths in **`build-sources/op.svg`**, not monospace **OP**. **Facebook**, **Fidelity**, and **Stripe** were removed from **`iconDefs`** so their wordmarks (leading **F** or **S**) do not appear in the stream.

## P-like glyphs (often confused with PayPal or a "P ticker")

**`₱`** (`U+20B1`, Philippine peso) was **removed** from **`textChars`** because it reads as a **P** with double bar in the rain.

| Source | What it is | Risk |
|--------|------------|------|
| **`pypl.png`** | PayPal | Must be a **wordmark or solid mark**, not Simple Icons **`paypal`** alone (stylized **P**). Build prefers **`logos/paypal`** in **`scripts/build-matrix-icons.mjs`**. |

## Single-letter or ultra-short bundled SVG text (ticker style)

These are intentional fallbacks where SI or Iconify art failed matrix constraints. They can read as "just a letter" at 20px:

| File | Content |
|------|---------|
| **`build-sources/blk.svg`** | **BR** monogram |
| **`build-sources/bakkt.svg`** | Bakkt mark (matches repo `BKKT.svg`) |
| **`build-sources/securitize.svg`** | **S** |
| **`build-sources/citi.svg`** | **CITI** |
| **`build-sources/gs.svg`** | Goldman Sachs wordmark paths from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Goldman_Sachs.svg) (blue plate removed) |

Prefer **path-based logos** where licensing and aspect ratio allow (see **AMD**, **Coinbase**, **JPM** patterns in git history).

## Hollow or wide marks (broken shape at 32px)

| Topic | Rule |
|-------|------|
| **Chainlink** | **`link.png`** comes from **Simple Icons** **`chainlink`** (no bundled **`link.svg`**). **`script.js`** **`iconDefs`** must include **`link.png`** or the hero never draws the asset. |
| **Wide wordmarks** | **`logos/intel`** is very wide; prefer **`simple-icons/intel`** first. Full horizontal wordmarks in a square PNG collapse to a thin line. |

## Runtime note: trail fade and transparent icons

Each **`mtxDraw`** frame applies a **full-canvas** semi-transparent fade (`--matrix-trail-rgb` + `--matrix-trail-fade-alpha`) **without** clearing the canvas first, so old glyphs leave a **trail**. Transparent pixels in an icon (hollow hex, ring coins) would otherwise show **accumulated** pixels from prior frames and can read as a **solid filled** shape. **`script.js`** paints an **opaque** **matte** rectangle over each icon bounding box (`mtxPanelMatteRgb()` from `--matrix-trail-rgb`) **before** drawing the tinted sprite so holes show the **panel base**, not stacked history.

## Runtime note: icon load failure

In **`script.js`**, if **`pickItem`** selects an icon whose **`Image`** did not load, it returns **random text** from **`mtxTradTextChars`**. Missing **`icons/matrix/*.png`** files or wrong paths increase odd glyphs from the remaining fiat and macro tickers.

## Font stack for bundled `<text>` SVGs

Ticker-style **`build-sources/*.svg`** files that still use **`<text>`** should use the **same monospace stack** as the matrix canvas in **`script.js`** (**`mtxFontFamily`**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`), not **`system-ui`** or **Segoe UI**, so rasterized PNGs match the rain and avoid OS-specific sans styling.
