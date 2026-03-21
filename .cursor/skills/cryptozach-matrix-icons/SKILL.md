---
name: cryptozach-matrix-icons
description: >-
  Homepage hero matrix icon rules: Chainlink two-ring mark, filled disks,
  wide wordmarks at 32px, and bundled vs Simple Icons order. Use when editing
  icons/matrix, scripts/build-matrix-icons.mjs, build_matrix_icons.py,
  script.js iconDefs, or when the user mentions matrix icons, Chainlink,
  link.png, or npm run build:matrix-icons.
---

# CryptoZach matrix icons (hero animation)

The hero draws **white silhouettes** on transparent PNGs, then tints them **green** in canvas. Anything that is **mostly hollow**, **hairline**, or **extremely wide** tends to read as a **smear**, **blank disk**, or **broken shape** at ~20px.

## Chainlink (`link`): two overlapping rings (path-only)

**Intent:** **`link.png`** should not use the **Simple Icons** `chainlink` **filled hex + inner facets** (evenodd), which **read as a faceted smear** in the matrix trail at ~20px. Bundled **`link.svg`** uses **path-only** overlapping rings (chain metaphor). **Do not** restore raw SI hex geometry for matrix builds unless you re-verify trail readability at 20px.

**Invariants:**

1. **`scripts/build-matrix-icons.mjs`**  
   The `link` row must keep **`localSvg: 'icons/matrix/build-sources/link.svg'`** as the **first** successful source (`fetchSvgForRow` reads local SVG before Iconify).

2. **`icons/matrix/build-sources/link.svg`**  
   Prefer **path-only** SVG (no `<text>`) so **`build_matrix_icons.py`** Phase 0 can rasterize without Cairo font quirks, and so Playwright **whiten()** gets solid strokes.

3. **`build_matrix_icons.py`**  
   **`link` must not appear in `CRYPTO_SYMBOL_ONLY_SKIP_BUNDLED`.**  
   If `link` is listed there, Phase 0 **skips** `build-sources/link.svg` and the builder falls through to **SI chainlink** (hex smear again).

4. After changes, run **`npm run build:matrix-icons`** from repo root and confirm **`icons/matrix/link.png`** shows two rings (not a faceted hex) at 32px.

## Related failure modes (same pipeline)

These are already documented in code comments; this skill exists so agents **do not undo** them casually:

- **Filled brand disks** (USDC, DAI, AAVE, etc.): **`whiten()`** can turn a colored disk into a **blank circle**. Prefer bundled **`build-sources/*.svg`** where comments say so.

- **Wide wordmarks** (BlackRock, Intel `logos/intel`, PayPal SI mark): at **32x32** they can collapse to a **few pixels tall**. Prefer **square marks**, **Iconify `logos/*`**, or **bundled** crops.

- **Bittensor (`tao`)**: Iconify **`token/tao`** is a **hex tensor-node** mark that reads as a **filled hex** in the trail. **`build-sources/tao.svg`** is a **bold `TAO`** monospace ticker (same idea as **`avax.svg`**). **`build-matrix-icons.mjs`** must list **`localSvg`** for **`tao`** first.

- **Python vs Node:** Keep **`build_matrix_icons.py`** and **`scripts/build-matrix-icons.mjs`** **aligned** on which assets are **bundled**, **skipped**, and **Iconify order** for the same `name` key.

## Verification checklist

When touching matrix icons:

1. Grep: **`CRYPTO_SYMBOL_ONLY_SKIP_BUNDLED`** and confirm **`link`** is absent unless you intentionally changed strategy.  
2. Grep: **`name: 'link'`** in **`scripts/build-matrix-icons.mjs`** and confirm **`localSvg`** points at **`icons/matrix/build-sources/link.svg`**.  
3. Run **`npm run build:matrix-icons`** (needs network and Playwright Chromium).  
4. Optional: **cryptozach-local-preview** on the homepage and hover the matrix activators.

## See also

- **`docs/OPUS_MATRIX_ICONS_PROMPT.md`** (manifest and filenames)  
- **`icons/matrix/README.md`**  
- **cryptozach-pre-push** (if you changed icons, run the matrix checks above before push)
