---
name: cryptozach-content-publish
description: "Orchestrates the workflow for publishing or updating research content on cryptozach.com. Use when the user publishes a new paper, adds a research card, updates a paper page or status, or says 'publish this paper', 'ship the new content', 'content publish', 'launch the paper', 'add to research index', or wants a single checklist so paper page, research index, changelog, and optional social posts stay in sync. Ties cryptozach-paper-page, cryptozach-research-index, cryptozach-changelog-release, and cryptozach-social-post-writer."
---

# Content publish workflow

When publishing or substantively updating research content, run these steps in order so the site and promotion stay consistent.

## 1. Paper or card source (canonical content)

- **New or updated paper page:** Use **cryptozach-paper-page**. Create or edit `papers/<slug>.html`: structure, thesis, badges, access block, canonical, meta, JSON-LD. Ensure SSRN abstract ID and links are correct.
- **New or updated research card only (no full paper page yet):** Add or edit the card in `selected-research.html` using the long-form card pattern from **cryptozach-research-index** (data-track, data-status, writing-link, writing-copy, optional card-expand).

Keep title, thesis, status, and venue in one place; the next step will mirror them to the index.

## 2. Research index and homepage

Use **cryptozach-research-index**:

- **selected-research.html:** Add or update the card in the correct track block. Sync title, teaser, status, track badge, and link to the paper page (or placeholder). Update JSON-LD ItemList if you added or removed an item. Keep `.page-toc` and section ids in sync.
- **index.html:** If the change affects featured or preview research, update `#featured-research` or `#selected-research-preview` so the homepage teaser matches (no drift between paper page and index).

Run a quick grep for the paper slug or title to catch any other references (e.g. Operating-Model.html agenda, speaker-advisory research status).

## 3. Changelog and optional tag

Use **cryptozach-changelog-release**:

- Add a dated entry to `changelog.md`: what shipped, which pages changed, any SSRN or anchor links. Keep it scannable.
- If the change is large or risky, offer to create a Git tag (`site/pre-deploy-YYYY-MM-DD`) before or after push and note it in the changelog.

## 4. Optional: social posts

Use **cryptozach-social-post-writer**:

- If the user wants promotion: draft X and/or LinkedIn posts from the finding. Use the correct series (Routing Notes, Equivalence Checks, etc.) and platform rules. For LinkedIn, draft the first comment with SSRN and site links.
- Single finding post, event-driven post, or weekly batch as requested.

## 5. Pre-push and ship

- Run **cryptozach-pre-push** (copy check, optional responsive and e2e) then **cryptozach-git-checkpoint** (commit and push). Include the paper page, selected-research.html, index.html if changed, changelog.md, and any new assets in the commit.

## Quick reference

| Step | Skill / action |
|------|----------------|
| 1. Canonical content | cryptozach-paper-page (paper) or research card in selected-research |
| 2. Index + homepage | cryptozach-research-index (cards, anchors, JSON-LD, homepage preview) |
| 3. Record release | cryptozach-changelog-release (changelog.md, optional tag) |
| 4. Promote | cryptozach-social-post-writer (X/LinkedIn drafts) |
| 5. Ship | cryptozach-pre-push then cryptozach-git-checkpoint |

If the user only asks for one piece (e.g. "add a changelog entry" or "draft a post for this paper"), do that step and reference this workflow only when they ask for the full publish flow.
