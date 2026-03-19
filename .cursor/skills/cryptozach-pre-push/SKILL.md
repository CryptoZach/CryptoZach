---
name: cryptozach-pre-push
description: "Run a short pre-push checklist for the CryptoZach site so nothing obvious ships broken. Use when the user says 'pre-push', 'before I push', 'check before push', 'did I break anything', 'run checks', 'verify before deploy', or wants a single workflow before committing and pushing. Complements cryptozach-git-checkpoint and cryptozach-local-preview."
---

# Pre-push checklist

Run these in order before committing and pushing. Fix or report any failures; then follow **cryptozach-git-checkpoint** for commit and push.

## 1. Copy rules (no em-dashes)

Site and typography rules forbid em-dashes. Scan changed files:

```bash
grep -rn '—\|&mdash;' *.html resume/*.html papers/*.html 2>/dev/null || true
```

If any match, replace with comma, semicolon, or parentheses per **cryptozach-typography-copy** and **no-em-dashes**.

## 2. Responsive check (optional, server required)

If a local server is already running on 8080 (or you start one):

```bash
BASE_URL=http://127.0.0.1:8080 node scripts/check-responsive.js
```

Exit 0 means no horizontal overflow and key elements visible at all viewports. If the script is missing or server is down, skip and note in the report.

## 3. E2E smoke tests (optional)

From repo root:

```bash
npm run test:e2e
```

Playwright starts the server automatically. If `npm run test:e2e` fails, fix failing tests or document why they are skipped before pushing.

## 4. Report

Summarize: **Copy (em-dash)** pass/fail, **Responsive** run/skip, **E2E** pass/fail. If all pass (or skipped with reason), proceed to **cryptozach-git-checkpoint** for commit and push.

## When to run full site audit

For large edits or before a promotion push, run **cryptozach-site-polish-audit** (full checklist) in addition to this pre-push flow.
