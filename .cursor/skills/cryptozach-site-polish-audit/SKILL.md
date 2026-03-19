---
name: site-polish-audit
description: "Run a consistency, completeness, and scan-speed audit across all pages of cryptozach.com. Use this skill whenever the user asks to check the site, audit the site, QA the site, find inconsistencies, check for missing blocks, verify CTAs, tighten copy, or do a polish pass. Also trigger when the user says 'site audit', 'check consistency', 'what's broken on the site', 'tightness pass', 'scan speed', 'normalize the site', 'QA checklist', or references site-wide changes. Trigger even for single-page checks, not just full-site audits. This skill replaces ad-hoc visual inspection with a systematic, repeatable checklist."
---

# Site Polish Audit

Systematic QA checklist for cryptozach.com. Catches inconsistencies, missing blocks, duplicate CTAs, copy violations, and scan-speed problems across all pages.

## When to run

- After any content edit to any page
- Before launching a promotion campaign (traffic is coming; the site must work)
- After adding a new page
- Monthly as a maintenance pass

## Audit scope

### Page inventory

Check every page exists and loads:

| File | Purpose |
|------|---------|
| `index.html` | Homepage |
| `selected-research.html` | Full research catalog |
| `resume.html` | Resume hub |
| `resume/policy-market-infrastructure.html` | Policy resume profile |
| `resume/asset-management-tokenization.html` | Asset management resume profile |
| `resume/stablecoin-payments-strategy.html` | Stablecoin resume profile |
| `contact.html` | Contact page |
| `start-here.html` | Orientation page |
| `focus.html` | Method and scope detail |
| `structure.html` (or equivalent) | Frameworks and agenda |
| `2026-frameworks.html` (or equivalent) | First-tab overview |
| `speaker-advisory.html` (or equivalent) | Speaker and advisory |
| `tokenomics-research.html` | Track B detail (if exists) |
| `404.html` | Error page |

## Checklist

Run each check in order. Report results as PASS / FAIL / NOT APPLICABLE with the specific file and line or element where the issue occurs.

### 1. Structural consistency

These blocks should appear on every full page (not 404):

| Block | Check | Common failure |
|-------|-------|----------------|
| Global header with nav | Present, links work | Missing on a new page |
| Global footer | Present, year is dynamic | Hardcoded year |
| "About this site" tagline | Present between last content section and footer | Missing on one page (the bug we just found on 2026 Frameworks) |
| Theme toggle | Present in header, functional | Missing `aria-pressed` |
| Back-to-top button | Present, appears on scroll | Missing on a new page |
| Scroll progress bar | Present on content-heavy pages | Missing or broken `scaleX` |

**How to check:**
```bash
# "About this site" tagline on all pages
for f in *.html; do
  echo -n "$f: "
  grep -c "Independent, empirically backed" "$f" || echo "MISSING"
done

# Dynamic year
grep -rn "getElementById('year')" script.js
# Confirm the element exists on each page
for f in *.html; do
  echo -n "$f: "
  grep -c 'id="year"' "$f" || echo "MISSING"
done
```

### 2. Canonical terms

Every instance of these terms must match exactly. No variants.

**Role labels (grep for each, flag any non-canonical variant):**
- `Policy & market infrastructure` (not "Policy & Market Infrastructure", not "Policy and market infrastructure")
- `Asset management & tokenization` (not "Asset Management & Tokenization" in body copy)
- `Stablecoin & payments strategy` (not "Stablecoin & Payments Strategy" in body copy)

Note: title case is acceptable in navigation links and buttons. Body copy and section headings use sentence case.

**Section headings (exact):**
- `What I work on`
- `How the work runs`
- `Best for`
- `What this version answers` (resume profiles: one section with proof bullets then question blocks)
- `Supporting research`

**Status badges:**
- `Under review` / `Best first read` / `Public` / `Public / requestable` / `Available on request` / `Draft`
- No other variants ("Published", "Live", "SSRN live", etc.)

**Research card labels:**
- `What it is:` / `Why it matters:` / `Who it's for:`
- Not "What it covers:" or "Key finding:" or "Audience:"

**How to check:**
```bash
# Find non-canonical role label variants
grep -rni "policy and market" *.html resume/*.html
grep -rni "Policy & Market Infrastructure" *.html resume/*.html  # flag if in body copy, OK in nav
grep -rni "asset management and tokenization" *.html resume/*.html

# Find non-canonical status badges
grep -rni "Published\|SSRN live\|ssrn live\|Live on SSRN" *.html
```

### 3. CTA consistency

**Canonical CTA labels:**
- `View resume (PDF)` — opens PDF in browser
- `Download DOCX` — downloads Word file
- `Request a writing sample`
- `View all research`
- `Request a 1-page overview`
- `Discuss a policy / product question`
- `Read the flagship brief` — links to A1 summary or SSRN

**Checks:**
- No page has two CTAs pointing to the same file with different labels.
- "View resume (PDF)" and "Download DOCX" are different actions (PDF vs. Word). If both point to the same PDF, one is a duplicate; remove it.
- Every CTA label matches the canonical list. Flag variants like "Download PDF" (should be "View resume (PDF)") or "See all research" (should be "View all research").

**How to check:**
```bash
# Find all CTA-like links
grep -rni "View resume\|Download\|Request a\|View all\|Read the flagship\|Discuss a" *.html resume/*.html

# Check for duplicate href targets on the same page
for f in *.html resume/*.html; do
  echo "=== $f ==="
  grep -oP 'href="[^"]*\.(pdf|docx)"' "$f" | sort | uniq -d
done
```

### 4. Copy rules

**Prohibited patterns (grep and flag every instance):**

| Pattern | Replacement | Grep command |
|---------|-------------|-------------|
| Em-dash (`—` or `&mdash;`) | Comma, semicolon, or parentheses | `grep -rn '—\|&mdash;' *.html resume/*.html` |
| "not just X" | "X and Y together" or "X grounded in Y" | `grep -rni 'not just' *.html resume/*.html` |
| "rather than X" | "while preserving X" | `grep -rni 'rather than' *.html resume/*.html` |
| "more than X" (as negation) | "central to" / "key driver of" | `grep -rni 'more than' *.html resume/*.html` (manual review; some uses are literal quantities) |
| "not only" | "the full system includes" | `grep -rni 'not only' *.html resume/*.html` |
| "plumbing" | "settlement, custody, and ledger infrastructure" | `grep -rni 'plumbing' *.html resume/*.html` |

### 5. Scan speed

These checks target unnecessary setup sentences and redundant content that slows scanning.

**Setup sentences before question blocks:**

On resume profile pages (`resume/*.html`), the section **What this version answers** uses a single `resume-preview-card`: focus chips, proof bullets, then `stack-list` question blocks, then downloads. No meta heading like "What this version covers" or "Questions this version is built to answer".

```bash
grep -n "What this version answers" resume/*.html
```

**Duplicate information within a single page:**

Flag any page where the same stat, finding, or fact appears in both a card/summary and the body text. Common offenders:
- Research cards that repeat the exact same sentence as the section they link to
- Hero subheads that duplicate the first paragraph below

**Line length:**

Body copy should not exceed ~65 characters per line. Check CSS `max-width` on body text containers.

### 6. Navigation consistency

**Sticky nav (if deployed):**

For pages with the sticky section nav (`#structureNav`):
- Every `data-section` attribute has a matching `id` in the page content.
- Every content section with an `id` is reachable from the sticky nav.
- The JUMP TO bar (hero) anchors match the sticky nav parent links.
- Sub-link expand/collapse works (test by scrolling to each section).

```bash
# Extract all data-section values from the nav
grep -oP 'data-section="[^"]*"' structure.html | sort

# Extract all section IDs from the page content
grep -oP 'id="[a-z0-9-]*"' structure.html | sort

# Diff: every data-section should have a matching id
```

**Cross-page link integrity:**

Every internal link resolves. No dead `href` values.

```bash
# Extract all internal links
grep -ohP 'href="(/[^"]*|[^"h][^"t][^"t][^"p][^"]*)"' *.html resume/*.html | sort -u

# Check each exists as a file (strip anchors first)
```

### 7. Research status accuracy

The site should reflect current paper statuses. Cross-reference against the authoritative list:

| Paper | Current status | Check on |
|-------|---------------|----------|
| A1: Routing the Dollar | SSRN live; Fed conference status pending | selected-research, structure page agenda, speaker page |
| A2: MVEP | SSRN live | selected-research, structure page |
| A3: Dollar v3 / Control Layer War | Public / requestable | selected-research, structure page |
| B1: Adaptive Tokenomics | SSRN live | selected-research, structure page |
| B4: Operational Risk | SSRN live | selected-research, structure page |
| B2: Tokenomics as Institutional Design | Draft; targeting Frontiers | structure page agenda |
| B3: GeoDePIN | Draft; targeting B:R&A | structure page agenda |

Flag any page showing a stale status (e.g., B4 still listed as "Draft" after SSRN upload, or A1 still showing a specific notification date that has passed).

### 8. Accessibility quick check

- Every `<img>` has an `alt` attribute (even if empty for decorative images: `alt=""`).
- Every interactive element has visible focus styles.
- Color contrast: text on colored backgrounds meets WCAG AA (4.5:1 for body text).
- `prefers-reduced-motion` is respected (animations disabled or reduced).
- Mobile menu has proper `aria-expanded`, `aria-hidden`, `inert` attributes.

### 9. Dark mode

If the site supports dark mode:
- Toggle and verify every page. No white-on-white or black-on-black text.
- Check that the "About this site" tagline, JUMP TO bar, and sticky nav all adapt.
- Check that research card badges are readable in both modes.

## Output format

After running all checks, produce a report:

```markdown
# Site Polish Audit - [date]

## Summary
- Pages checked: [N]
- Issues found: [N] (critical: [N], minor: [N])
- Clean pages: [list]

## Critical issues (blocks promotion or misrepresents status)
1. [file:line] [description]
2. ...

## Minor issues (polish, not blocking)
1. [file:line] [description]
2. ...

## Passed checks
- [list of checks with no issues]
```

Priority: fix critical issues before any promotion push. Minor issues can be batched.
