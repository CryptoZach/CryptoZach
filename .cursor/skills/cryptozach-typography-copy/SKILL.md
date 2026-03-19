---
name: cryptozach-typography-copy
description: >-
  Aligns sitewide prose, HTML meta tags, Open Graph, Twitter cards, and JSON-LD
  with CryptoZach conventions: thesis-first descriptions, consistent naming, and
  canonical URLs. Use when editing titles, meta descriptions, social previews,
  schema blocks, or institutional tone across pages.
---

# CryptoZach typography and copy (meta + voice)

## Voice and mechanics

- **Thesis-first**: Lead with the claim or mechanism (what is true or what the piece does), not venue boilerplate. Venue or status can follow in the body, a second sentence, or a dedicated line on paper pages.
- **Institutional, precise**: Prefer concrete nouns (gateway, operator, reserve, finality) over vague labels ("institutional grade" only when quoted or reframed as testable).
- **Parallel naming**: `<title>`, `h1`, `og:title`, and `twitter:title` should describe the same work. Shorter variants are fine for Twitter, but do not imply a different paper.
- **Header brand**: The site header uses `<strong>Zach Zukowski</strong>` (no ` · (CryptoZach)` suffix). The subtitle line under it still carries the CryptoZach positioning.
- **House punctuation**: If the repo has `.cursor/rules/` copy rules, follow them. Otherwise avoid decorative unicode dashes in generated prose; use hyphens or commas for sentence rhythm unless the user specifies otherwise.

## Meta and social (per page)

When adding or refreshing head content:

| Field | Convention |
|-------|------------|
| `<title>` | `Paper or page title \| Zach Zukowski` (or shorter site pattern for non-paper pages). |
| `meta name="description"` | One or two tight sentences; thesis-first; no keyword stuffing. |
| `link rel="canonical"` | Prefer `https://cryptozach.com/...` with the same path style the live site uses (many paper pages use the `.html` suffix on canonical). |
| `og:url` | Should match the canonical story: same host and path policy as sibling pages in that directory. |
| `og:type` | `article` for paper summaries; `website` for hub pages like research index. |
| `og:image` / `twitter:image` | Absolute URL under `https://cryptozach.com/` (often `Publication-Images/` or `assets/brand/og-image.png`). |
| `og:image:alt` / `twitter:image:alt` | Describe the image for accessibility; align with visible cover `alt` when both exist. |
| `twitter:card` | `summary_large_image` when a large image is set; otherwise match Cursor/site standard. |
| `twitter:site` | `@CryptoZach` where used elsewhere on the site. |
| `twitter:title` | May append `(CryptoZach)` for brand clarity if it fits length limits. |

After edits, ensure **no stale duplicates**: one canonical, one primary `og:url`, consistent image URLs (no mixed `www` vs bare domain unless intentional).

## JSON-LD

- **Paper summaries**: `ScholarlyArticle` (or `Article` for brief-only pages) with `name`, `description`, `url`, `author`, `image`, and `sameAs` pointing at the canonical SSRN abstract when the work lives on SSRN.
- **Research hub**: `CollectionPage` + `ItemList` entries must match visible card titles and destinations (see **`cryptozach-research-index`**).
- **Breadcrumbs**: `ListItem` URLs should match how you link in HTML (`cryptozach.com` vs `www.cryptozach.com`: pick one pattern per file and stay consistent).

## Body copy on paper pages

Long-form structure and access-row wording live under **`cryptozach-paper-page`**. This skill only governs **tone and headline layer** inside those blocks (thesis paragraph, teaser lines, mailto link labels).

## Cross-page sync

When the **title or thesis** changes on a paper page, update:

- `selected-research.html` card `writing-title`, `writing-teaser`, and excerpts where they repeat the claim.
- `index.html` preview cards if that paper is featured.
- Related papers' teasers on other `papers/*.html` if they quote the old positioning.

## Checklist before ship

- [ ] `description` and `og:description` are close cousins (not contradictory).
- [ ] Images and alts match.
- [ ] Canonical and `og:url` follow the file's existing convention.
- [ ] JSON-LD `name` / `description` align with visible `h1` and lead copy.

## Publishing

Use **`cryptozach-git-checkpoint`** after copy-only commits so small text changes still go through the normal safe push path.
