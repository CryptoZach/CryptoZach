---
name: cryptozach-matrix-icons
description: >-
  Homepage hero matrix icon rules: Chainlink token hollow hex, filled disks,
  wide wordmarks at 32px, and bundled vs Simple Icons order. Use when editing
  icons/matrix, scripts/build-matrix-icons.mjs, build_matrix_icons.py,
  script.js iconDefs, or when the user mentions matrix icons, Chainlink,
  link.png, or npm run build:matrix-icons.
---

# CryptoZach matrix icons (hero animation)

The hero draws **white silhouettes** on transparent PNGs, then tints them **green** in canvas. Anything that is **mostly hollow**, **hairline**, or **extremely wide** tends to read as a **smear**, **blank disk**, or **broken shape** at ~20px.

## Chainlink (`link`): token hollow hex

**Intent:** **`LINK`** in the rain should read as the **Chainlink token mark**: a **hex ring** with a **transparent inner hex** (nested paths, nonzero fill), not a solid **LINK** wordmark.

**Invariants:**

1. **`scripts/build-matrix-icons.mjs`**  
   The `link` row must keep **`localSvg: 'icons/matrix/build-sources/link.svg'`** as the **first** successful source (`fetchSvgForRow` reads local SVG before Iconify).  
   Bundled **`link.svg`** should stay aligned with **Simple Icons `chainlink`** geometry (nested hex paths) unless you **explicitly** change brand intent.

2. **`icons/matrix/build-sources/link.svg`**  
   Use **path-only** SVG (no `<text>`) so **`build_matrix_icons.py`** Phase 0 can rasterize without Cairo font rendering.  
   Keep **nested** SI **hex** geometry **rotated** **30deg** around the center so the mark reads **flat-top** (token-style) rather than **pointy-top** raw SI orientation at small size.  
   Do **not** replace the **hollow hex** with a **solid** glyph without an explicit product review.

3. **`build_matrix_icons.py`**  
   **`link` must not appear in `CRYPTO_SYMBOL_ONLY_SKIP_BUNDLED`.**  
   If `link` is listed there, Phase 0 **skips** `build-sources/link.svg` and the builder may fall through to **SI chainlink** in a different order than the Node script.

4. After changes, run **`npm run build:matrix-icons`** from repo root and confirm **`icons/matrix/link.png`** shows a **hex ring** with a **clear center** at 32px.

## Related failure modes (same pipeline)

These are already documented in code comments; this skill exists so agents **do not undo** them casually:

- **Filled brand disks** (USDC, DAI, AAVE, etc.): **`whiten()`** can turn a colored disk into a **blank circle**. Prefer bundled **`build-sources/*.svg`** where comments say so.

- **Wide wordmarks** (BlackRock, Intel `logos/intel`, PayPal SI mark): at **32x32** they can collapse to a **few pixels tall**. Prefer **square marks**, **Iconify `logos/*`**, or **bundled** crops.

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
