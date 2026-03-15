# CryptoZach: GitHub Pages (Institutional)

This repo is a clean GitHub Pages site. It now includes a small Playwright-based responsiveness check for local QA.

## Quick deploy

1. Create a new GitHub repo (e.g., `cryptozach.github.io` or `cryptozach-site`).
2. Upload the contents of this folder to the repo root.
3. In GitHub: **Settings → Pages**
   - Source: `Deploy from a branch`
   - Branch: `main` (or `master`) / root
4. Wait for GitHub Pages to publish.

## Local responsiveness check

1. Start a local server from the repo root, for example `python3 -m http.server 4174`.
2. Run `BASE_URL=http://127.0.0.1:4174 npm run check:responsive`.

The script checks `index.html`, `selected-research.html`, and `focus.html` at desktop, tablet, mobile, small, and extra-small breakpoints, then fails if it finds horizontal overflow or broken stacked-card behavior.
