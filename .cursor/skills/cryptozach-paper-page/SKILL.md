---
name: cryptozach-paper-page
description: >-
  Maintains consistent structure and styling for HTML paper summaries under
  papers/. Use when adding or editing paper pages, porting long-form blocks,
  fixing access CTAs, related grids, or meta/JSON-LD for ScholarlyArticle pages.
---

# CryptoZach paper page (`papers/*.html`)

Full **reference implementation**: `papers/routing-the-dollar.html`. For a shorter **flagship brief** layout (problem, findings, CTAs), use `papers/routing-the-dollar-brief.html` and classes such as `brief-page`, `brief-header`, `brief-problem`, `brief-findings`, `brief-ctas` (see `styles.css`).

## Shell every long-form paper should follow

Use this order inside `<main class="paper-detail-page">` → `<article class="reveal paper-page paper-detail" aria-labelledby="paper-title">`:

1. **`nav.paper-breadcrumb`**: `Home` → `Research` → paper name (link the research hub; last crumb may be plain text to match existing pages).
2. **Optional** `p.paper-description-note`: e.g. link to `./routing-the-dollar-brief.html` or “description current as of …”.
3. **`figure.paper-cover`**: `img` with `../Publication-Images/...`, meaningful `alt`, and `width`/`height` when known.
4. **`span.paper-track-badge`**: Track line (encode `&` as `&amp;`).
5. **`div.paper-badges`**: `span.badge` or `span.badge badge-status-published` (and similar) for status.
6. **`h1#paper-title`**: Page title.
7. **`p.paper-metadata-strip`**: Read time, word count, date, venue or outlet as appropriate.
8. **`p.paper-description-note`**: Stale-date disclaimer if you use it.
9. **`p.paper-thesis`**: One tight thesis paragraph.
10. **`div.paper-takeaways`**: Each `div.paper-takeaway` with `span.paper-takeaway-number` + `p.paper-takeaway-text`.
11. **`div.paper-audience-tags`**: `span.paper-audience-tag` chips.
12. **`div.paper-access-block.access-block`**:
    - **`div.access-primary`**: Primary CTA (`a.action.primary.cta-primary`), e.g. SSRN PDF. Add extra primary-row links with `a.access-link` (e.g. GitHub replication) when applicable.
    - **`div.access-secondary`**: Mailto / X thread / Medium with `a.access-link`, separated by `span.access-sep` (middle dot).
13. **`div.paper-abstract`**: Subsections as `h2` + paragraphs. Typical headings: **Abstract**, **What problem it solves**, **Methods / data**, **Related frameworks**, **Related role profiles** (include only what fits the paper).
14. **`div.paper-related`**: `h2` + `div.paper-related-grid` → `div.paper-related-card-wrap` → `a.paper-related-card` (title + `span.paper-related-teaser`) and `a.paper-related-cta`.
15. **`p.paper-contact-strip`**: Discussion mailto with a paper-specific `subject=` query.

Close with the standard **site header/footer** and `script.js` + year script (copy from `routing-the-dollar.html`).

## `<head>` and SEO

- **`link rel="canonical"`**: `https://cryptozach.com/papers/<slug>.html` (include `.html` to match live pages).
- **`meta name="description"`** and **`og:*` / `twitter:*`**: Thesis-first where possible; align title across `<title>`, `og:title`, `twitter:title`.
- **`og:image` / `twitter:image`**: Absolute URL under `https://cryptozach.com/Publication-Images/...`.
- **JSON-LD**: `BreadcrumbList` + `ScholarlyArticle` when the page is a paper summary; set `sameAs` to the canonical SSRN abstract URL when the piece is on SSRN.

## Paths and links

- From `papers/`: site nav and assets use `../` (e.g. `../styles.css?v=22`, `../frameworks.html#anchor`).
- **Framework links**: `../frameworks.html#<id>` must match real `id` values in `frameworks.html` (e.g. `#clii`, `#mvep`, `#credit-migration-model`).
- **Related paper cards**: prefer `./other-paper.html` (not `../papers/...`).
- **External**: `target="_blank"` and `rel="noopener noreferrer"` on outbound links.

## After substantive edits

Search the file (or run ripgrep) for:

- `ssrn.com` (correct `abstract_id=`)
- `x.com` or `twitter.com` (current thread URL)
- `mailto:` (subjects URL-encoded, paper name in subject)
- `medium.com` (when Medium is the primary artifact)

Update **`selected-research.html`** (and homepage cards if present) so teaser copy and status lines do not drift from the paper page.

## Publishing

After changes, follow the project skill **`cryptozach-git-checkpoint`** (commit, optional local `python3 -m http.server 8080`, `git push origin main`).
