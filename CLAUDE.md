# CLAUDE.md: site-only clone (post-2026-04-26 partition)

This file is auto-loaded by Claude Code CLI when started in this clone. It
exists to orient future sessions to the public-private repo partition that
landed 2026-04-26 and to keep workflow work out of this clone.

## What this clone is

The public-site working clone for [tokenization.systems](https://tokenization.systems).

- **Repo:** `CryptoZach/CryptoZach` (public)
- **Local path:** `/Users/zach/ai-research/CryptoZach/` (symlink: `~/cryptozach`)
- **Origin SHA at partition:** `97c9c01` (chore: partition repo to site-only on public)

This clone tracks `origin/main` and pushes to it. Every commit here ships to
the live site via `.github/workflows/build-deploy.yml` (GitHub Pages deploy).

## What this clone is NOT

This is no longer the canonical clone for the research workflow. The full
workflow content (research artifacts, agent specs, decision logs, handoff
memos, canonical state in `docs/`, the 36+ skills, the cited-research
pipeline, etc.) was migrated to the **private** repo
`CryptoZach/Claude1` and now lives in a separate working clone at:

```
/Users/zach/Tokenization_Systems_Website/
```

Do not try to do workflow work in this site clone:

- No `docs/`, `handoff/`, `research_content/`, `tools/` here
- No `.claude/agents/`, `.cursor/skills/`, `CLAUDE.md` (the long one), `AGENTS.md`
- No canonical-state writers, no Living_File_Updates memos, no agent dispatch

If a session starts here and the user asks for workflow work, redirect them
to start a session in the workflow clone instead.

## What this clone is FOR

Site content and infrastructure only:

| Path | What |
|---|---|
| `index.html`, `404.html`, `*.html` (root) | Top-level landing pages |
| `papers/`, `research/`, `frameworks/`, `overview/`, `resume/`, `resumes/`, `speaker/`, `speaker-and-advisory/`, `contact/`, `letters/` | Site sections |
| `assets/`, `icons/`, `ink-brand-kit/`, `ink-logos/`, `Publication-Images/` | Image and brand assets |
| `script.js`, `styles.css`, `sitemap.xml`, `robots.txt`, `_redirects`, `CNAME`, `favicon.png`, `favicon.svg`, `apple-touch-icon.png` | Site infra |
| `_config.yml`, `Gemfile`, `package.json`, `package-lock.json`, `purgecss.config.cjs` | Build config |
| `.github/workflows/build-deploy.yml` | CI deploy (guarded to run only on `CryptoZach/CryptoZach`) |
| `scripts/` (4 files only) | Build tooling: `inline-critical-css.mjs`, `build-matrix-icons.mjs`, `build_matrix_icons.py`, `check-responsive.js` |
| `LICENSE`, `LICENSE-CONTENT.md` | MIT for site code; CC BY-NC 4.0 for site content |
| `AI_Governance_Profile_Content.md` | Source content for `/resume/ai-governance-infrastructure/` |

## Editorial discipline (still applies to site content)

The author rule is no em-dashes (—) and no en-dashes (–) in any new prose
authored here (commit messages, code comments, README edits, HTML page text).
Use commas, parentheses, colons, periods, or semicolons. The only exception
is preserving em-dashes in source content being migrated verbatim from
elsewhere (e.g., a published article body).

Search pattern to verify before commit: `rg -n '[—–]' <file>`

## Working with this clone

```bash
# Standard build / deploy is handled by GitHub Actions on push to main.
# Local preview:
bundle install
bundle exec jekyll serve

# Local post-process (matches CI):
npm ci
npm run build:critical-css
npm run check:responsive
```

## Deploy runbook (site to live)

Every push to `origin/main` deploys to the live site via GitHub Actions.
Sibling agents (Claude Code `.claude/worktrees/`, Cursor `.cursor/worktrees/`)
push to the same `origin/main`, so this clone's local `main` drifts behind.
Deploy flow:

```bash
# 1. Sync first (sibling sessions push to the same origin; do not skip).
git fetch origin main
git pull --rebase --autostash origin main   # pull.rebase + autoStash preconfigured

# 2. Edit, then verify the rendered output locally before deploying.
bundle exec jekyll serve                     # visually verify the changed page

# 3. Commit and push (pushing IS deploying; it is irreversible and public).
git push origin main

# 4. Verify live after the Pages build (about 2 minutes).
gh run list --repo CryptoZach/CryptoZach --limit 1
curl -s "https://tokenization.systems/<changed-page>/?nc=$(date +%s)" | grep "<expected text>"
```

Guards in place (local-only; not git-tracked):

- SessionStart hook warns if `main` is behind origin at session start
  (`~/.claude/hooks/cz-fetch-warn-stale-main.sh`, wired in `.claude/settings.local.json`).
- `.git/hooks/pre-push` blocks an origin push when behind origin/main
  (intentional force: `ALLOW_FORCE_PUSH_ORIGIN=1`).
- `.git/hooks/pre-commit` blocks em/en-dash additions and workflow-path leaks.

Cache-buster: derived automatically for both assets. `scripts/inline-critical-css.mjs`
rewrites `styles.css?v=<sha256[:8]>` and `script.js?v=<sha256[:8]>` from the built
`_site/styles.css` and `_site/script.js` at build time, so neither needs a manual
`?v=` bump (each URL changes only when that asset's content changes).

Canonical-value drift: canonical figures live in the workflow clone's
`scripts/value_drift_registry.json`; treat this site clone as derived, and run
the workflow clone's drift checker before propagating a value change.

## Auto-memory backup

This clone's auto-memory (Claude Code feedback / project / reference memories;
auto-loaded at session start from `~/.claude/projects/-Users-zach-ai-research-
CryptoZach/memory/`) has a git-tracked backup at `.claude/memory/`. Mirrors
the auto-memory dir contents at clone-snapshot time. Refresh manually via
`cp ~/.claude/projects/-Users-zach-ai-research-CryptoZach/memory/*.md
.claude/memory/` when memories update. Auto-excluded from Jekyll publication
by dot-prefix default; no `_config.yml` change needed. Em-dashes in pre-
existing memories preserved per source-fidelity verbatim-migration exception
(no-em-dash editorial rule applies to NEW prose; auto-memory content is
migrated content).

Workflow-clone equivalent backup at
`/Users/zach/Tokenization_Systems_Website/.claude/memory/` mirrors the
workflow-clone auto-memory dir.

Architecture context: see
`/Users/zach/Tokenization_Systems_Website/handoff/architecture/persistence_architecture_2026-04-27.md`
for the 4-tier persistence model (auto-memory + handoff memos + canonical
SKILLs + DEC entries) and 4 architectural patterns (defense-in-depth +
correction-to-strengthening loop + empirical-validation-before-codification +
cross-actor mirroring). Auto-memory is Tier 1 in that model.

## Recovery

If you need the pre-partition full state for any reason, it is preserved at:

- **Private repo:** `CryptoZach/Claude1` (full mirror at SHA `204d093`)
- **Workflow working clone:** `/Users/zach/Tokenization_Systems_Website/`
- **Local recovery tag (this clone):** `pre-claude-migration-cleanup-2026-04-26`
  (points at SHA `204d093`; recoverable via `git reset --hard <tag>`, but
  see warning below)

**Do not reset this clone to the recovery tag** unless you are explicitly
re-architecting. The site clone is intentionally site-only; resetting brings
back 600+ workflow files and reintroduces the partition problem this commit
solved.

## Last updated

2026-04-26 (partition cycle ship; SHA `97c9c01`)
