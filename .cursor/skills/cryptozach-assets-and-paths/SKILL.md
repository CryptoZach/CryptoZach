---
name: cryptozach-assets-and-paths
description: >-
  Manages Publication-Images and other static assets: correct relative paths from
  root vs papers/, absolute URLs in meta and JSON-LD, alt text, and GitHub
  Pages case sensitivity. Use when adding covers, fixing broken images, renaming
  files, or aligning og:image with inline img src.
---

# CryptoZach assets and paths

## Directory and naming

- **Covers and figures** live under **`Publication-Images/`** at the repo root (capital **P**, hyphen **Images**). Match this spelling everywhere: HTML `src`, `og:image`, JSON-LD, and on-disk filenames. GitHub Pages is case-sensitive; `publication-images` or `Publication Images` will 404.
- Prefer **no spaces** in filenames. If a legacy file contains spaces, reference it exactly in `src` (encode space as `%20` in URLs when linking from CSS or inline styles if needed).
- **Brand assets** live under **`assets/brand/`** (favicons, `og-image.png`).

## Relative paths by page depth

| Page location | Example `src` to a cover | Example site CSS/JS |
|---------------|---------------------------|----------------------|
| Repo root (`index.html`, `selected-research.html`) | `./Publication-Images/foo.webp` or `Publication-Images/foo.webp` | `./styles.css`, `./script.js` |
| `papers/*.html` | `../Publication-Images/foo.webp` | `../styles.css`, `../script.js` |
| `resume/*.html` | Usually `../Publication-Images/...` or `../assets/...` | `../styles.css` |

**Research library cards** on `selected-research.html` use **`Publication-Images/...`** without `./` prefix in many places; both resolve from site root. Stay consistent with siblings on the same page.

## Absolute URLs in head and schema

- **`og:image`**, **`twitter:image`**, and JSON-LD **`image`** should use **`https://cryptozach.com/Publication-Images/<file>`** (or `assets/brand/...`) so social crawlers resolve them without relying on the request host.
- That absolute path must match the **same file** as the visible `<img src>` for the cover (after accounting for relative resolution).

## Markup quality

- **`alt`**: Describe the figure for screen readers; align with **`og:image:alt`** / **`twitter:image:alt`** when those exist.
- **`width` and `height`**: Set when known to reduce layout shift (see existing paper covers).
- **`loading="lazy"`** on below-the-fold thumbnails; **`eager`** acceptable for the primary hero cover on a paper page.

## Adding a new image

1. Add the file under **`Publication-Images/`**.
2. Reference it from HTML with the correct **relative** path for that file’s directory.
3. Add matching **absolute** URLs in meta + JSON-LD if the page has social tags or schema.
4. Run a quick local check: `python3 -m http.server 8080` from repo root and open the page (see **`cryptozach-git-checkpoint`**).

## Binaries and repo size

- Prefer **WebP** or compressed **PNG** for large hero images when quality allows.
- Avoid committing **duplicate** assets under different names; pick one canonical filename and grep for old names after renames.

## When paths break after a restore

Use **`cryptozach-site-recovery`** if content came from an old commit where folder spelling or filenames differed, then re-verify every `src` and meta URL.

## Publishing

Commit the image and HTML/CSS changes together when possible. Push via **`cryptozach-git-checkpoint`**.
