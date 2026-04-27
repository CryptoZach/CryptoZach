# papers/_TEMPLATE.md

Reference scaffold for authoring or modifying paper pages under `papers/<slug>/index.html`. Captures the canonical-sequence lock-in from `docs/SITE_STATE.md` Bundle 4 (tier-kicker taxonomy), Bundle 6a (pull-quote convention), and Bundle 6b (H2 canonical sequences) so site-clone authoring sessions can scaffold new pages without round-tripping to canonical state for every detail.

**Source of truth:** `docs/SITE_STATE.md` sections "Paper-page tier-kicker taxonomy (Bundle 4 codification)", "Paper-page pull-quote convention (Bundle 6a codification)", and "Paper-page H2 canonical sequences (Bundle 6b codification)". When this template and SITE_STATE diverge, SITE_STATE wins; this file is a working reference, not canonical state.

**Last updated:** 2026-04-27 (Phase 0 template-lock cycle; `.paper-flagship-kicker` to `.paper-tier-kicker` CSS rename plus this file's first authoring).

---

## 1. Tier kicker (above H1)

Every paper page carries a tier kicker line above the H1 title using the `.paper-tier-kicker` CSS class. The kicker designates the paper's tier within the publication taxonomy and signals reading-time expectations.

```html
<p class="paper-tier-kicker">TIER LABEL · N min on-page · M min full read</p>
```

### Tier label values + reading-time format

| Tier | Reading-time format |
|---|---|
| FLAGSHIP BRIEF | `FLAGSHIP BRIEF · N min on-page · M min full read` (or program-specific bespoke phrasing for the flagship paper) |
| TRACK A FOUNDATION | `TRACK A FOUNDATION · N min on-page · M min full read` |
| TRACK B FOUNDATION | `TRACK B FOUNDATION · N min on-page · M min full read` |
| TRACK A WORKING PAPER | `TRACK A WORKING PAPER · N min on-page · M min full read` (or `· N min on-page` only) |
| TRACK B WORKING PAPER | `TRACK B WORKING PAPER · N min on-page · M min full read` (or `· N min on-page` only) |
| BRIEFING | `BRIEFING · N min on-page` |
| MEDIUM BRIEFING | `MEDIUM BRIEFING · N min on-page` |

### Tier-prefix symmetry rule

WORKING PAPER tier carries the Track A or Track B prefix when the paper has confirmed SSRN-live status (verified via `docs/DATA_REGISTRY.md` SSRN ID `[VERIFIED]` annotation). Without confirmed SSRN-live status, WORKING PAPER ships bare.

---

## 2. Pull-quote callout (above paper-thesis)

Foundation-tier paper pages carry a pull-quote callout above the paper-thesis paragraph.

```html
<aside class="brief-callout paper-thesis-pullquote" aria-label="Paper thesis pull-quote">
  <p>[Pull-quote text drawn from at-a-glance Answer's lead claim, compressed to 25 to 40 words.]</p>
</aside>
```

### When to include

- TRACK A FOUNDATION: include
- TRACK B FOUNDATION: include
- TRACK A WORKING PAPER: optional (per-paper authorial decision)
- TRACK B WORKING PAPER: optional
- FLAGSHIP BRIEF: skip (bespoke flagship structure already carries rhetorical weight; top-of-page pull-quote creates redundancy)
- BRIEFING / MEDIUM BRIEFING: optional

---

## 3. Canonical H2 sequences (tier-aware)

Each paper page follows a tier-aware canonical H2 sequence. The sequence is the ordering rule; specific topic H2s between the canonical anchors vary per paper.

### TRACK A FOUNDATION + TRACK B FOUNDATION

```
Audience tags
At a glance
What this paper changes
[paper-specific topic H2s]
Core findings
Methods and data
Key numbers
Limitations
Related frameworks
Related role profiles
```

### TRACK A WORKING PAPER + TRACK B WORKING PAPER

Same as foundation, with two variants:

- Numbered `Finding 1.` / `Finding 2.` / `Finding 3.` / `Finding 4.` H2s allowed in place of the single `Core findings` H2 (Three Strategies + Seven Dollars use this variant).
- Track A working papers (Three Strategies + Seven Dollars) additionally carry `Who should care` + `Dollar-infrastructure context` + `Full technical abstract` topic H2s within the canonical scaffold.

### FLAGSHIP BRIEF

Preserves Routing the Dollar's existing bespoke flagship structure:

```
At a glance
The problem
Three findings
Who should care
How the paper is built
What this paper changes
1. [first numbered finding]
2. [second numbered finding]
3. [third numbered finding]
Key numbers
Full technical abstract
Audience tags
Related frameworks
Related role profiles
```

### BRIEFING / MEDIUM BRIEFING

```
At a glance
What this briefing/piece changes
[topic-specific sections]
Anchor evidence
Limitations
```

---

## 4. Seven micro-decisions (Bundle 6b codification)

1. **Methods and data canonical.** Drop slash variants like `Methods / Data`; use `Methods and data`.
2. **What-this-changes phrasing tier-aware.** `What this paper changes` for SSRN papers; `What this briefing changes` for BRIEFING; `What this piece changes` for MEDIUM BRIEFING.
3. **Audience tags universality.** Universal for SSRN papers and SITE_STATE-codified BRIEFING; optional for MEDIUM BRIEFING.
4. **Key numbers universality.** Universal for SSRN papers; optional for briefings.
5. **Numbered Finding-N H2s.** Preserved on Three Strategies + Seven Dollars (Track A working papers) per the working-paper variant.
6. **Related frameworks + Related role profiles universality.** Universal for foundation tier; optional for working papers and briefings.
7. **Abstract to Full-technical-abstract rename.** Cross-paper consistency with Routing the Dollar (applied to Three Strategies + Seven Dollars per Bundle 6b).

---

## 5. Per-paper assignments (current as of 2026-04-27)

Per-paper tier and reading-time assignments live canonically in `docs/SITE_STATE.md` "Per-paper assignments" table. Always check that table before assigning a tier to a new page or changing an existing page's tier; the per-paper assignments table is the source of truth.

---

## 6. CSS dependency

The kicker uses the `.paper-tier-kicker` class (renamed from `.paper-flagship-kicker` in the Phase 0 template-lock cycle, 2026-04-27). The pull-quote uses `.brief-callout` plus additive `.paper-thesis-pullquote`. Visual-treatment changes to either selector update both `styles.css` and the corresponding SITE_STATE section in the same commit.

---

## 7. New paper page checklist

When authoring a new paper page under `papers/<slug>/index.html`:

1. Pick the tier from the table in Section 1 above (cross-check `docs/DATA_REGISTRY.md` for SSRN-live status if WORKING PAPER candidate).
2. Author the tier kicker line above the H1.
3. If foundation tier, author the pull-quote callout above the paper-thesis paragraph (Section 2).
4. Follow the canonical H2 sequence for the chosen tier (Section 3).
5. Apply the seven micro-decisions (Section 4) for naming consistency.
6. Add the new paper to `docs/SITE_STATE.md` Per-paper assignments table (CANONICAL-WRITER lane; via Living_File_Updates memo if shipping from site-only clone).
7. Bump the cache-buster query param on `styles.css` references if any CSS was added or modified.
8. Update `sitemap.xml` with the new page URL.

---

## 8. Modification checklist

When modifying an existing paper page:

1. Verify the current tier kicker matches the SITE_STATE Per-paper assignments table; if SSRN-live status changed, update tier and/or Track-A/B prefix per the symmetry rule.
2. Verify H2 sequence still matches the tier-aware canonical sequence (Section 3); reorder if Bundle-6b-style canonicalization is needed.
3. Apply the seven micro-decisions (Section 4) on any new H2s.
4. If a substantive section is added (e.g., Limitations content surfaced from PAPER.md), confirm the section sits in its canonical position in the sequence.
5. Bump cache-buster on `styles.css` references if CSS changed.
