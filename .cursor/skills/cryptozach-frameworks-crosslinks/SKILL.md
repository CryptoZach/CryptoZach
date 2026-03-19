---
name: cryptozach-frameworks-crosslinks
description: >-
  Keeps Operating-Model.html anchor ids in sync with inbound links from papers,
  resumes, and the homepage. Use when editing framework cards, renaming slugs,
  adding a new framework section, or fixing broken #fragment links. Legacy
  frameworks.html and start-here.html redirect to 2026-frameworks.html.
---

# CryptoZach frameworks cross-links

## Canonical source

**`Operating-Model.html`** is the single source of truth for framework **card** anchors. Inbound links use **`#<id>`** on that file. In the **header nav**, this page is labeled **Structure** (URLs stay `Operating-Model.html`).

**`frameworks.html`** and **`start-here.html`** are **legacy redirects** to **`2026-frameworks.html`** (preserve query string and hash). Prefer linking to **`2026-frameworks.html`** for the frameworks primer and **`Operating-Model.html`** for Structure / framework cards.

## Core framework card ids (do not break casually)

These **`article.card`** elements carry the ids that paper pages and CTAs target:

| `id` | Typical link label |
|------|---------------------|
| `clii` | CLII |
| `mvep` | MVEP |
| `credit-migration-model` | Credit Migration Model |
| `regime-dashboard` | Regime Dashboard |

Other useful section ids on the same page include **`three-dollar-objects`**, **`core-frameworks`** (section top; hero jump links and sticky **`#structureNav`** use this), **`current-agenda`**, **`how-the-work-runs`**, **`go-deeper`**. Prefer linking to a **card id** when the goal is "jump to this framework." The hero **Jump to** block uses class **`structure-jump-to`** for scroll behavior tied to the sticky rail.

## 2026 Frameworks page (`2026-frameworks.html`)

Sticky **`#structureNav`** is detected when **`#navDefGroup`** exists. Hero jump links use **`#jumpTo`** (class **`structure-jump-to`**, same pattern as Operating-Model).

| Area | Anchor ids (shareable) |
|------|-------------------------|
| Definitions (parent **`#definitions`**) | **`#what-stablecoin`**, **`#what-tokenization`**, **`#what-deposit`**, **`#why-care`** |
| Three dollar objects | **`#dollar-objects`** |
| Five questions (parent **`#five-questions`**) | **`#q1`** … **`#q5`** |
| Entry points | **`#entry-points`** |
| Where to go next | **`#where-to-go`** |

**`script.js`** maps legacy fragments (**`#what-tokenized-deposit`**, **`#why-institutions-care`**, **`#three-objects-title`**, **`#entry-points-audience`**, **`#where-next`**) to the ids above when landing with a hash.

## Homepage framework cards (`index.html`)

The **Signature frameworks** section has deep-linkable ids for social promotion when the post is about the framework as a concept rather than a specific paper:

| `id` | Use for |
|------|---------|
| **`#clii-home`** | CLII (Control Layer Intensity Index) |
| **`#mvep-home`** | MVEP (Minimum Viable Equivalence Pack) |
| **`#credit-migration-home`** | Credit Migration Model |
| **`#regime-dashboard-home`** | Regime Dashboard |

Example: `https://cryptozach.com/#clii-home`. Prefer paper URLs (e.g. `papers/routing-the-dollar.html`) when the post is about the paper as a document; use these homepage anchors when the post is about the framework concept.

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

Open `http://127.0.0.1:8080/Operating-Model.html#clii` (etc.) after edits and confirm the correct card is visible below the header. Legacy `frameworks.html` now forwards to `2026-frameworks.html` (hash preserved); deep links to Structure anchors should use **`Operating-Model.html#...`** directly.

## Publishing

Commit **`Operating-Model.html`** and all link updates in one commit when renaming. Push with **`cryptozach-git-checkpoint`**.
