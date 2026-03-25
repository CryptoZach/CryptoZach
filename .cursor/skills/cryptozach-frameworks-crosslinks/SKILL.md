---
name: cryptozach-frameworks-crosslinks
description: >-
  Keeps Operating-Model.html anchor ids in sync with inbound links from papers,
  resumes, and the homepage. Use when editing framework cards, renaming slugs,
  adding a new framework section, or fixing broken #fragment links. Overview
  lives at start-here.html; legacy 2026-frameworks.html redirects there;
  frameworks.html redirects to Operating-Model.html.
---

# CryptoZach frameworks cross-links

## Canonical sources

**`start-here.html`** is the **Overview** page (definitions, three dollar objects, five diagnostic questions, entry points). In the header nav it is labeled **Overview**.

**`Operating-Model.html`** is the **Frameworks** page: framework stack, core framework **cards**, where each framework lives, how the work runs, go deeper. Inbound links to framework **cards** use **`#<id>`** on that file. In the **header nav**, this page is labeled **Frameworks** (URLs stay **`Operating-Model.html`**). **`frameworks.html`** is a **redirect stub** (client-side) to **`Operating-Model.html`** with hash preserved; **`Operating-Model.html`** carries the canonical URL for indexing because the stub is **`noindex`**.

**`2026-frameworks.html`** is a **legacy redirect** to **`start-here.html`** (query string and hash preserved). Prefer linking to **`start-here.html`** for Overview and **`Operating-Model.html`** for Frameworks cards. Friendly **`frameworks.html`** links are fine for marketing copy when a redirect is acceptable.

**Note:** A future host-level **200 rewrite** from **`/frameworks.html`** to the same document could justify setting **`link rel="canonical"`** to **`https://cryptozach.com/frameworks.html`** without conflicting with **`noindex`** on the stub.

## Core framework card ids (do not break casually)

These **`article.card`** elements carry the ids that paper pages and CTAs target:

| `id` | Typical link label |
|------|---------------------|
| `clii` | CLII |
| `mvep` | MVEP |
| `credit-migration-model` | Credit Migration Model |
| `regime-dashboard` | Regime Dashboard |

Other useful section ids on **`Operating-Model.html`** include **`three-dollar-objects`**, **`framework-stack`**, **`core-frameworks`** (section top; hero jump links and sticky **`#structureNav`** use this), **`framework-lives`** (replaces **`current-agenda`**; legacy hash **`#current-agenda`** maps to **`#framework-lives`** in **`script.js`**), **`how-the-work-runs`**, **`go-deeper`**. Prefer linking to a **card id** when the goal is "jump to this framework." The hero **Jump to** block uses **`#jumpTo`** and class **`structure-jump-to`** for scroll behavior tied to the sticky rail.

## Overview page (`start-here.html`)

Sticky **`#structureNav`** is detected when **`#navDefGroup`** exists. Hero jump links use **`#jumpTo`** (class **`structure-jump-to`**, same pattern as Operating-Model).

| Area | Anchor ids (shareable) |
|------|-------------------------|
| Definitions (parent **`#definitions`**) | **`#what-stablecoin`**, **`#what-tokenization`**, **`#what-deposit`**, **`#what-gateway`**, **`#what-control-layer`** |
| Three dollar objects | **`#dollar-objects`** |
| Why institutions care | **`#why-institutions-care`** |
| Five questions (parent **`#five-questions`**) | **`#q1`** … **`#q5`** |
| Start by context (table) | **`#start-by-context`** |
| Seven papers | **`#seven-papers`** |
| What the tools do | **`#what-tools`** |
| Contact | **`#overview-contact`** |

**`script.js`** maps legacy fragments (**`#what-tokenized-deposit`**, **`#why-care`**, **`#three-objects-title`**, **`#entry-points`**, **`#entry-points-audience`**, **`#where-next`**, **`#where-to-go`**) to the ids above when landing with a hash.

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

- From **`papers/*.html`**: `../Operating-Model.html#clii` (etc.); `../start-here.html` for Overview.
- From **repo root pages** (`index.html`, `selected-research.html`): `./Operating-Model.html#regime-dashboard` (etc.); `./start-here.html` for Overview.
- From **`resume/*.html`**: `../Operating-Model.html#mvep` (pattern match siblings); `../start-here.html` for Overview.

Always use **lowercase** fragment ids to match the DOM; browsers normalize case for HTML ids, but consistency avoids mistakes across grep and docs.

## When you add a new framework card

1. Add **`article class="card" id="your-slug"`** in **`Operating-Model.html`**. Use a **kebab-case** slug (no spaces).
2. Ensure the visible **heading inside the card** matches the name you use on paper pages (display name can be longer than the id).
3. If **`styles.css`** uses **`scroll-margin-top`** for sticky header offset, apply the same pattern as other framework cards so the title is not hidden under the nav.
4. **Grep** the repo for `Operating-Model.html#` and add links from relevant **`papers/*.html`** "Related frameworks" blocks and any hub CTAs.
5. Add the card id to the **`sections`** array for the non-Overview branch in **`script.js`** (sticky rail) if scroll-spy should track it.

## When you rename an id

1. Update **`Operating-Model.html`** or **`start-here.html`** first.
2. Run a repo-wide search for **`Operating-Model.html#old-id`** (or **`start-here.html#old-id`**) and update every hit (HTML, markdown in skills, rare JS).
3. Add a **`legacyMap`** entry in **`script.js`** if old hashes should still scroll correctly.

## Copy alignment

Short names in paper sidebars (**CLII**, **MVEP**) should match how the framework is titled on **`Operating-Model.html`**. If you change the public name of a framework, update:

- Paper **`Related frameworks`** lines
- **`selected-research.html`** or **`index.html`** only if they mention that framework by name (not all do)

See **`cryptozach-paper-page`** for where related-framework blocks live on paper pages.

## Validation

Open `http://127.0.0.1:8080/Operating-Model.html#clii` (etc.) after edits and confirm the correct card is visible below the header. Legacy **`frameworks.html`** forwards to **`Operating-Model.html`** (hash preserved). Deep links to Frameworks anchors should use **`Operating-Model.html#...`** directly.

## Publishing

Commit **`Operating-Model.html`**, **`start-here.html`**, redirect stubs, and all link updates in one commit when renaming. Push with **`cryptozach-git-checkpoint`**.
