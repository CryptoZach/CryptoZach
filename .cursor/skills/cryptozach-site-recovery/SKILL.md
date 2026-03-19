---
name: cryptozach-site-recovery
description: >-
  Recovers site HTML/CSS/assets from a known-good Git commit or GitHub tree
  when pages regressed or shortened. Use when the user names a commit SHA, a
  GitHub deployment, "restore from 6035c30", or diff-old-vs-current for papers
  or the research index.
---

# CryptoZach site recovery (historical trees and merge policy)

## Read first

- [docs/SITE_REPO_SAFETY.md](../../../docs/SITE_REPO_SAFETY.md): remotes, no force-push to `origin`, backup clone, safe push script.
- [docs/RESTORE_SITE_TO_CRYPTOZACH.md](../../../docs/RESTORE_SITE_TO_CRYPTOZACH.md): where the live site lives, Pages, push workflow.
- [docs/ROOT_CAUSE_BROKEN_LINKS.md](../../../docs/ROOT_CAUSE_BROKEN_LINKS.md): how the site broke once (wrong remote / force push); useful context, not required for every restore.

## Recover file contents from history

1. **Ensure the object exists locally**
   - `git fetch origin`
   - `git cat-file -t <full-or-abbrev-sha>` (expect `commit`).

2. **View the file at that commit** (full tree snapshot, not the commit diff alone)
   - `git show <sha>:path/to/file.html`

3. **Compare old tree to working tree**
   - `git diff <sha>:papers/foo.html papers/foo.html`

4. **If `git show` is empty or the clone is shallow**
   - Raw file URL pattern:  
     `https://raw.githubusercontent.com/CryptoZach/CryptoZach/<sha>/path/to/file`  
   - Or browse the repo at that commit on GitHub and copy the file.

## Merge policy (do not blind overwrite)

- **Restore** long-form body sections, structure, and missing blocks from the old tree (access rows, abstracts, related grids, brief pages, etc.).
- **Forward-port** intentional edits from **current** `main`: SSRN `abstract_id`, X thread URLs, canonical titles, meta descriptions, mailto subjects, and links to **current** targets (e.g. `./tokenized-equity.html` instead of old stubs or anchors).
- After merging, **grep** the touched files for `ssrn.com`, `x.com`, `mailto:`, `medium.com`, and `github.com/CryptoZach` and fix stragglers.

## Scope by file type

- **Paper pages** (`papers/*.html`): follow **`cryptozach-paper-page`** after recovery so classes and section order stay consistent.
- **Research library / homepage cards**: if a paper changed, sync **`selected-research.html`** and **`index.html`** per **`cryptozach-research-index`**.
- **Assets**: if images or `script.js` / `assets/brand/` are missing, restore from the same SHA or from a **backup clone** (`./scripts/clone-site-backup.sh` per SITE_REPO_SAFETY).

## Validate before push

- From repo root: `python3 -m http.server 8080` and open `http://127.0.0.1:8080/` (spot-check changed routes).
- Confirm internal links and `#anchors` (`Operating-Model.html`, research TOC) resolve.

## Publish and safety

- Commit with a message that names the **source SHA** and any **forward-ports** (URLs, titles).
- Push with **`cryptozach-git-checkpoint`**: `git pull --rebase origin main` when behind, then `git push origin main` (or `./scripts/safe-push-site.sh`). Do not push site fixes to the `publications` remote.

## Optional tag

Before large recoveries or experiments, create a **`site/pre-deploy-YYYY-MM-DD`** tag (see SITE_REPO_SAFETY) so you have a named revert point without rewriting `main` casually.
