---
name: cryptozach-changelog-release
description: >-
  Adds dated release notes to changelog.md and optional Git tags for site
  deploys or large merges. Use when the user asks for a changelog entry,
  release note, deploy summary, or to pair a push with site/pre-deploy tagging.
---

# CryptoZach changelog and release notes

## When to use

- **User-visible site changes** worth remembering: new paper page, research hub reshuffle, major copy or SEO refresh, restored long-form content, new skills or docs.
- **Optional** for tiny one-line typo fixes unless the user wants a paper trail.

## Where to write

- **Primary:** `changelog.md` at repo root.
- **Deep dives:** Large merges can follow the existing style in that file: Summary, Files changed table, SEO notes, exclusions (see the "Research pages merge" entry as a reference pattern).

## Light template (most deploys)

Prepend a new top section **below** the main `#` title (or add a dated `##` under a rolling `# Changelog` if you restructure). Suggested shape:

```markdown
## YYYY-MM-DD: Short headline

**Shipped:** One sentence on what a reader would notice.

**Pages:** Bullet list of paths touched (`papers/...`, `selected-research.html`, etc.).

**Links / IDs:** Note SSRN, X, Medium, or framework anchor changes if any.

**Git:** Optional commit SHA or tag name.
```

Keep prose scannable. Link paths in backticks.

## Pair with a Git tag (risky or large work)

Before or right after the push, the user may want a named restore point. From **`docs/SITE_REPO_SAFETY.md`**:

```bash
git tag site/pre-deploy-$(date +%Y-%m-%d)
git push origin site/pre-deploy-$(date +%Y-%m-%d)
```

Mention the tag name in the changelog line **Git:** so future readers can match narrative to ref.

## After the entry

Follow **`cryptozach-git-checkpoint`** so the changelog ships with the same commit as the site change (or the commit immediately after, if you amend).

## Related

- **`cryptozach-research-index`**: what to list when the research library or homepage cards moved.
- **`cryptozach-site-recovery`**: if the "release" was a restore from an old SHA, say so in the changelog.
