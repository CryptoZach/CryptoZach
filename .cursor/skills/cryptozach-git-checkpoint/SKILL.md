---
name: cryptozach-git-checkpoint
description: >-
  Defines safe Git checkpoint and publish steps for the CryptoZach site repo
  (CryptoZach/CryptoZach). Use when the user asks to save a checkpoint, commit,
  push to the public site, tag before deploy, or verify remotes before publishing.
---

# CryptoZach Git checkpoints and safe push

This repo is the **live site** source. Treat every push to `origin main` as a production update.

## Read first

For full rules, remotes table, and recovery pointers, open [docs/SITE_REPO_SAFETY.md](../../../docs/SITE_REPO_SAFETY.md) from the repo root.

## Checkpoint workflow (agent checklist)

1. **Confirm branch and sync state**
   - `git status -sb`
   - If `behind` relative to `origin/main`, plan `git pull --rebase origin main` before push (stash or commit local work first if dirty).

2. **Review changes**
   - `git diff` / `git diff --stat`
   - Scope commits logically (site HTML/CSS vs simulation code vs docs). Avoid mixing unrelated topics in one commit when practical.

3. **Optional local preview (static site)**
   - From repo root: `python3 -m http.server 8080`
   - Open `http://127.0.0.1:8080/` and spot-check edited pages.

4. **Commit**
   - Subject line: imperative, concise (e.g. `Restore paper page access block`).
   - Body: note intentional URL or content forward-ports if non-obvious.
   - Do not commit secrets, `.env`, or large binaries unless they are already part of the site asset policy.

5. **Push to the live repo only**
   - Default: `git push origin main`
   - Prefer `./scripts/safe-push-site.sh` when the user wants an extra guard that `origin` is CryptoZach/CryptoZach.

6. **Never (unless user explicitly overrides with a documented plan)**
   - `git push --force` or `--force-with-lease` to `origin` (pre-push hook blocks this; see SITE_REPO_SAFETY).
   - Pushing site work to the `publications` remote (simulation repo).

## Tagging before risky or large changes

From repo root:

```bash
git tag site/pre-deploy-$(date +%Y-%m-%d)
git push origin site/pre-deploy-$(date +%Y-%m-%d)
```

Use tags as named restore points, not as a substitute for small, frequent commits.

## If history diverged

- Prefer `git pull --rebase origin main` then push.
- If rebase skips a commit as already applied, that is normal when duplicate patches exist; resolve any conflicts, then push.

## Commit message pattern (examples)

```
feat(site): add Medium CTA on tokenized equity paper page

fix(papers): restore MVEP related-paper grid

docs: add SITE_REPO_SAFETY cross-link in skill
```

## When the user says "checkpoint"

Interpret as: **clean working tree on `main`, committed, and pushed to `origin`**, plus optional **deploy tag** if they are about to do something large. Confirm push succeeded (`git status -sb` shows `main...origin/main` in sync).
