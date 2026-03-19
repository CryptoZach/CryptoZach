---
name: cryptozach-local-preview
description: >-
  Runs a static preview of the CryptoZach site on localhost before push or
  after substantive HTML/CSS edits. Use when the user asks to preview on 8080,
  verify layout locally, or smoke-test changed routes without deploying.
---

# CryptoZach local preview (static server)

## Command

From the **repository root** (where `index.html` lives):

```bash
python3 -m http.server 8080
```

Then open **`http://127.0.0.1:8080/`** in a browser.

Stop the server with **Ctrl+C** in that terminal.

Use **Python** for day-to-day preview. The repo also includes **Playwright** end-to-end smoke tests (see **Testing** below and [`docs/PLAYWRIGHT.md`](../../../docs/PLAYWRIGHT.md)); those use Node only to run assertions, not to serve the site.

## Why root matters

The server’s document root must be the repo root so paths like **`/Publication-Images/...`**, **`/papers/...`**, and **`/styles.css`** match how GitHub Pages serves the site. Running the server from a subdirectory breaks relative links.

## Default smoke-test URLs

After edits, spot-check routes that interact with global layout and assets:

| URL | Checks |
|-----|--------|
| `/` | Hero, nav, theme toggle, flagship block, selected research preview |
| `/selected-research.html` | Filters (if unhidden), track headings, card list, TOC anchors |
| `/Operating-Model.html` | Cards, anchor jumps (`#clii`, `#mvep`, etc.) |
| `/frameworks.html` | Legacy URL: should redirect to `2026-frameworks.html` (hash preserved) |
| `/papers/routing-the-dollar.html` | Full paper template, cover image, access block |
| `/papers/minimum-viable-equivalence-packs.html` | Second reference paper layout |
| Any file you changed | Open it directly by path |

Hard-refresh (**Cmd+Shift+R** / **Ctrl+Shift+R**) if CSS looks stale.

## Playwright MCP (Cursor)

When the **user-playwright** MCP is enabled, agents can smoke the same routes without opening a local browser manually. **Prerequisite:** static server on **port 8080** (see command above), or navigations will fail.

Use **`browser_navigate`** to each URL, then **`browser_snapshot`** (or **`browser_take_screenshot`** if something looks wrong).

| Check | URL |
|-------|-----|
| Home | `http://127.0.0.1:8080/` |
| Research library | `http://127.0.0.1:8080/selected-research.html` |
| Structure (Operating-Model.html) + fragment | `http://127.0.0.1:8080/Operating-Model.html#clii` |
| Legacy redirect + hash | `http://127.0.0.1:8080/frameworks.html#clii` (final URL should include `2026-frameworks.html` and `#clii`) |
| Reference papers | `http://127.0.0.1:8080/papers/routing-the-dollar.html`, `http://127.0.0.1:8080/papers/minimum-viable-equivalence-packs.html` |

## Testing (Playwright)

Automated smoke tests live under **`tests/e2e/`**. From repo root:

1. **`npm install`**
2. **`npx playwright install`** (downloads browsers; needs network once)
3. **`npm run test:e2e`**

The config starts **`python3 -m http.server 8080`** automatically unless a server is already listening (local reuse). **`PLAYWRIGHT_FRESH_SERVER=1`** forces Playwright to spawn a new server (fails if **8080** is already taken). **Python 3** must be on `PATH` for `webServer`.

Playwright runs **`desktop`**, **`tablet`** (834×1112 Chromium), and **`mobile`** (Pixel 5 profile) projects. Use **`npx playwright test --project=mobile`** to narrow runs.

Full detail: **[`docs/PLAYWRIGHT.md`](../../../docs/PLAYWRIGHT.md)**.

## Absolute `https://cryptozach.com` links

Some **meta tags**, **JSON-LD**, and occasional inline references use absolute production URLs. That is expected for social crawlers. **Do not** assume every link will rewrite to localhost; behavior of og:url and canonical is defined for production, not for local preview.

## Limits of static preview

- **No server-side redirects**: if you rely on hosting rules only present on GitHub Pages, they may not reproduce locally.
- **External assets** (SSRN, X, Medium) load from the network; offline mode will not test them.

## After preview looks good

Follow **`cryptozach-git-checkpoint`**: commit, `git pull --rebase origin main` if needed, `git push origin main`.

## Related skills

- **`cryptozach-paper-page`**: structure of paper HTML you are previewing.
- **`cryptozach-assets-and-paths`**: fixing 404 images or wrong relative paths if preview shows broken media.
