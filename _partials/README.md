# _partials/: single source of truth for the page chrome

`header.html` (the `<header>` block plus the adjacent `<nav id="nav-mobile">`
block) and `footer.html` are stamped into a marker-delimited region of every
nav-bearing page by `scripts/render_chrome.py`. Do not edit the header or
footer on individual pages; edit the partial here, then run:

    python3 scripts/render_chrome.py --write    # or: npm run build:chrome

and commit the partial together with the restamped pages. CI
(`.github/workflows/build-deploy.yml`) and local checks run
`render_chrome.py --check`, which fails the build if any page's chrome
drifts from these partials.

Per-page active-link state (which nav item is highlighted) is derived from
the page path inside `render_chrome.py`; the partials stay state-free.
Jekyll never serves underscore-prefixed paths, and html-minifier-terser
strips the region markers at build time, so neither the partials nor the
markers reach the deployed site.

## The brandmark: `brand.html` and `brand.css`

The header's dial, wordmark and tagline are one mark with one source: `brand.html` (the markup inside
`<div class="brand">`) and `brand.css` (every rule that draws it). `scripts/render_brand.py --write` stamps
them into the home page (markup, and the end of its inline stylesheet), into `header.html` here (which
`render_chrome.py` carries to every other page), and into the end of `styles.css`; it also copies
`vaultMountDial()` from `home.js` into `vault.js`, so every page draws the dial with the same code. Edit the
partial, never a stamped region, then:

    python3 scripts/render_brand.py --write && python3 scripts/render_chrome.py --write   # or: npm run build:brand

`render_brand.py --check` runs in CI and in the pre-push battery and fails on any drift. `vault.css` and
`vault.js` are not content-hashed by the build: when either changes, raise its `?v=` on every page.
