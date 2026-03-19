---
name: cryptozach-frameworks-crosslinks
description: >-
  Keeps Operating-Model.html anchor ids in sync with inbound links from papers,
  resumes, and the homepage. Use when editing framework cards, renaming slugs,
  adding a new framework section, or fixing broken #fragment links. Legacy
  frameworks.html redirects here.
---

# CryptoZach frameworks cross-links

## Canonical source

**`Operating-Model.html`** is the single source of truth for framework **card** anchors. Inbound links use **`#<id>`** on that file.

**`frameworks.html`** is a **legacy redirect** (preserves query string and hash). Prefer linking to **`Operating-Model.html`** in new content.

## Core framework card ids (do not break casually)

These **`article.card`** elements carry the ids that paper pages and CTAs target:

| `id` | Typical link label |
|------|---------------------|
| `clii` | CLII |
| `mvep` | MVEP |
| `credit-migration-model` | Credit migration model |
| `regime-dashboard` | Regime dashboard |

Other useful section ids on the same page include **`three-dollar-objects`**, **`current-agenda`**, **`program-structure`**. Prefer linking to a **card id** when the goal is "jump to this framework."

## Link URL shape

- From **`papers/*.html`**: `../Operating-Model.html#clii` (etc.).
- From **repo root pages** (`index.html`, `selected-research.html`): `./Operating-Model.html#regime-dashboard` (etc.).
- From **`resume/*.html`**: `../Operating-Model.html#mvep` (pattern match siblings).

Always use **lowercase** fragment ids to match the DOM; browsers normalize case for HTML ids, but consistency avoids mistakes across grep and docs.

## When you add a new framework card

1. Add **`article class="card" id="your-slug"`** in **`Operating-Model.html`**. Use a **kebab-case** slug (no spaces).
2. Ensure the visible **heading inside the card** matches the name you use on paper pages (display name can be longer than the id).
3. If **`styles.css`** uses **`scroll-margin-top`** for sticky header offset, apply the same pattern as other framework cards so the title is not hidden under the nav.
4. **Grep** the repo for `Operating-Model.html#` and add links from relevant **`papers/*.html`** "Related frameworks" blocks and any hub CTAs.

## When you rename an id

1. Update **`Operating-Model.html`** first.
2. Run a repo-wide search for **`Operating-Model.html#old-id`** and update every hit (HTML, markdown in skills, rare JS).
3. Check **`cryptozach.com`** style absolute links if any exist in content (unusual for fragments).

## Copy alignment

Short names in paper sidebars (**CLII**, **MVEP**) should match how the framework is titled on **`Operating-Model.html`**. If you change the public name of a framework, update:

- Paper **`Related frameworks`** lines
- **`selected-research.html`** or **`index.html`** only if they mention that framework by name (not all do)

See **`cryptozach-paper-page`** for where related-framework blocks live on paper pages.

## Validation

Open `http://127.0.0.1:8080/Operating-Model.html#clii` (etc.) after edits and confirm the correct card is visible below the header. Optionally confirm `http://127.0.0.1:8080/frameworks.html#clii` still lands on the same fragment via redirect.

## Publishing

Commit **`Operating-Model.html`** and all link updates in one commit when renaming. Push with **`cryptozach-git-checkpoint`**.
