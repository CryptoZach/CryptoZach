---
name: cryptozach-research-index
description: >-
  Keeps selected-research.html, its anchors, filter data attributes, JSON-LD
  ItemList, and homepage research previews aligned with papers/*.html. Use when
  adding or editing research cards, track copy, featured blocks, or deep links
  like #best-first-read or #track-a.
---

# CryptoZach research index (`selected-research.html` + homepage)

## Primary files

- **`selected-research.html`**: Canonical research library (tracks, cards, TOC, optional filters, inline filter script at file bottom).
- **`index.html`**: `section#featured-research`, `section#selected-research-preview` (compact `article.card.research-card` rows).

When you change a paper’s title, thesis, status, venue line, or X thread, update **both** the paper page (see **`cryptozach-paper-page`**) and these index surfaces so teasers do not drift.

## Section anchors and TOC

Stable jump targets used elsewhere on the site:

- `#program-overview` … program thesis / Track A & B intro
- `#best-first-read` … flagship card (Routing the Dollar)
- `#track-a`, `#track-b`, `#earlier-work`, `#cross-track-convergence`

**`.page-toc`** links must stay in sync with real `id` attributes. If you rename a heading id, grep the repo for the old hash.

## Long-form card pattern (`writing-list` items)

Each list item is usually:

```html
<li id="optional-stable-id" data-audience="..." data-track="track-a|track-b|earlier" data-status="public|submitted|final-draft|requestable">
  <article class="writing-item writing-card research-card [writing-card--has-actions]">
    <a class="writing-link [writing-link--thumb]" href="...">
      <!-- optional img.writing-thumb -->
      <div class="writing-meta">… card-badges … writing-meta-line …</div>
      <div class="writing-copy">
        <h3 class="writing-title">…</h3>
        <p class="writing-teaser">…</p>  <!-- optional but common -->
        <p class="writing-excerpt">…</p> <!-- optional -->
        <p class="research-plain">…</p>
      </div>
      <span class="writing-arrow">…</span>
    </a>
    <!-- optional: a.writing-thread or .writing-thread-group -->
    <details class="card-expand">…</details>
  </article>
</li>
```

- **`writing-link--thumb`**: Use when there is a cover image under `Publication-Images/` (path from page root: `Publication-Images/...`, not `../`).
- **`writing-card--has-actions`**: Use when there is an X thread link (or thread group) outside the main `writing-link`; keeps layout consistent.

## Filter attributes (when filters are enabled)

The block **`.research-filters-js`** toggles visibility via script at the bottom of `selected-research.html`. Each **`<li>`** in a filtered list should set:

- **`data-track`**: `track-a`, `track-b`, or `earlier` (must match a **Track** filter `data-value` on the buttons).
- **`data-status`**: `public`, `submitted`, `final-draft`, or `requestable` (must match **Status** filter values).
- **`data-audience`**: space-separated tokens. A card is shown for an audience filter if **any** token matches the button `data-value`, e.g. `policy`, `asset-management`, `stablecoin`, `protocol-design`, plus extras like `central-bank`, `market-infrastructure`, `tokenization`, `risk-committee` as needed.

If you add a new filter value in HTML, extend the inline script logic if it does not already treat unknown tokens correctly.

## JSON-LD `ItemList`

The **`mainEntity.itemListElement`** array should list major entries with stable **`position`**, **`name`**, and **`item`** URLs. When you add a hosted paper summary, prefer `https://cryptozach.com/papers/<slug>` (with or without `.html` consistent with the rest of the block). After edits, validate that titles match **`writing-title`** text and links match real destinations.

## Homepage preview (`index.html`)

- Keep **three** compact cards in sync with Track A priorities or the story you want above the fold.
- **`a.research-card-action`**: points to `./papers/...` or `./selected-research.html#anchor`.
- Copy should be **shorter** than the library card; do not contradict the long `writing-excerpt` on the research page.

## Cross-page checklist

After adding or renaming a paper in the library:

1. Paper page: `papers/<slug>.html` (`cryptozach-paper-page`).
2. `selected-research.html`: card, optional `li id`, filters, thread links, `details` copy.
3. `ItemList` JSON-LD in `selected-research.html`.
4. `index.html` if it should appear in featured or selected preview.
5. Other papers’ **Related papers** grids if reciprocity is desired.

## Publishing

Use **`cryptozach-git-checkpoint`**: commit, optional `python3 -m http.server 8080`, `git push origin main`.
