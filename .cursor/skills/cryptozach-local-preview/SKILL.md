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

There is **no** `package.json` in this repo for a Node static server; use Python unless the user already has another local stack.

## Why root matters

The server’s document root must be the repo root so paths like **`/Publication-Images/...`**, **`/papers/...`**, and **`/styles.css`** match how GitHub Pages serves the site. Running the server from a subdirectory breaks relative links.

## Default smoke-test URLs

After edits, spot-check routes that interact with global layout and assets:

| URL | Checks |
|-----|--------|
| `/` | Hero, nav, theme toggle, flagship block, selected research preview |
| `/selected-research.html` | Filters (if unhidden), track headings, card list, TOC anchors |
| `/frameworks.html` | Cards, anchor jumps (`#clii`, `#mvep`, etc.) |
| `/papers/routing-the-dollar.html` | Full paper template, cover image, access block |
| `/papers/minimum-viable-equivalence-packs.html` | Second reference paper layout |
| Any file you changed | Open it directly by path |

Hard-refresh (**Cmd+Shift+R** / **Ctrl+Shift+R**) if CSS looks stale.

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
