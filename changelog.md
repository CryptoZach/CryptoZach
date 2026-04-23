# Changelog

Rolling, dated release notes for site, resume, and social deliverable surfaces.

---

## 2026-04-22: GitHub Pages build fix (Jekyll scoped to served paths)

The GitHub Pages build for `tokenization.systems` failed across six consecutive `pages-build-deployment` runs (`24807527773` through `24810090602`) with a Jekyll Liquid syntax error at `research_content/papers/B3_who_burns_the_tokens/PAPER.md` line 174 plus YAML warnings on two FDIC LETTER.md files. Two-part fix landed in commit `070ad09`; first green run `24810293594` shipped at 00:43:41Z (46s).

### Site (commit `070ad09`; first green run `24810293594`)

- **New `_config.yml` at repo root** scopes Jekyll to served paths via a 37-entry `exclude:` list (Jekyll defaults plus `research_content/`, `docs/`, `handoff/`, `Cryptozach-site-files/`, `scripts/`, `tools/`, `tests/`, `Resumes_v2/`, `Resumes_TokenizationSystems/`, `exhibits/`, `results/`, `src/`, `Claude/`, plus repo metadata files). Without it, Jekyll greedily processed 185+ Markdown files in operational scratch dirs that were never intended to be web pages, intermittently breaking the build whenever LaTeX or front-matter-like syntax appeared. Verified safe: zero Liquid syntax in any served HTML; only two harmless stub MD files under `papers/` (`pub3_ssrn_link.md`, `pub4_ssrn_link.md`) remain Jekyll-rendered.
- **B3 PAPER.md line 174** brace-spacing fix as belt-and-suspenders: `\frac{{Budget}_{t}}{{Price}_{t}^{TWAP}}` becomes `\frac{ {Budget}_{t} }{ {Price}_{t}^{TWAP} }`. Visually identical math output. The `{{Budget}` adjacency had read to Jekyll's Liquid parser as the start of an unterminated variable expression.
- **Two FDIC LETTER.md files** (AG19 + AG20) that had emitted YAML warnings (their leading triple-dash on line 1 reads to Jekyll as a YAML front-matter opener, then the prose body fails YAML parsing) are now ignored by Jekyll via the `_config.yml` exclude. Operator-authored letter sources remain exactly as written.

### Side benefit

Jekyll no longer wastes build time on hundreds of operational Markdown files. Future Liquid-trap patterns in research drafts cannot break the production build as long as they live under excluded paths.

### Attribution note

The fix was authored across two parallel agent sessions in two local clones (Cursor in `/Users/zach/ai-research/CryptoZach/`, Claude Code in `/Users/zach/Tokenization_Systems_Website/`). Both agents independently arrived at the brace-spacing fix; Cursor authored `_config.yml` as the structural fix. The combined two-file edit set was inadvertently absorbed into commit `070ad09` (a parallel Cursor agent's sweeping `git add` bundled it with unrelated R1.5.1 handoff-back P1 + P2 + P3 + P4 + R1.5.2 + R1.7 dispatch work). Build went green from that commit. See `docs/PROGRAM_STATE.md` Session Changes (2026-04-22, GitHub Pages build fix attribution backfill) for the full audit trail.

### Out of scope

The Node.js 20 deprecation warning on `actions/checkout@v4` is emitted by the GitHub-managed `pages-build-deployment` workflow (no `.github/workflows/` file in this repo) and is not actionable from this repo. GitHub will roll the runner to Node 24 by default in June 2026.

### Editorial discipline

Zero em-dashes added (no-em-dashes rule). No site asset versioning bump (no shared CSS or JS edits in this fix).

---

## 2026-04-22: TCMAG / MVEP comparative briefing published

The Tokenized Cash Management Advisory Group (TCMAG) published its initial set of eleven principles for tokenized corporate cash management on April 21, 2026. The Tokenization Systems research program responded with a comparative briefing positioning the program's Minimum Viable Equivalence Pack (MVEP) framework as the supply-side diagnostic complement to TCMAG's buyer-side principles.

### Site (commit `fbf398f`)

- New comparative briefing page at `/papers/mvep-tcmag-comparison/` mapping TCMAG's twelve buyer-side principles to MVEP's ten supply-side categories. Eight of twelve principles map directly or partially to MVEP categories; three TCMAG-unique principles (Multi-Issuer architecture, Interoperability, Confidentiality) flagged as gap candidates for any future MVEP v2 cycle; one principle (TMS/ERP integration) appropriately TCMAG-side. F-A4-4 (deposit-token competition; Ubyx as competitive-equilibrium clearing layer) anchors the Multi-Bank principle in concrete program research; GLEIF/LEI standard alignment flagged as one-paragraph clarification candidate for any future MVEP v2.
- New research-card entry added to `research/index.html` Track A list as the first item (id `mvep-tcmag-comparison`; research-card--compact pattern with thesis, mapping summary, and CTA links to MVEP SSRN plus A4 SSRN).
- `sitemap.xml` updated with new URL entry at lastmod 2026-04-22, priority 0.8.
- `docs/SITE_STATE.md` registers the new briefing route in the additional Track A briefing pages table; header note updated.
- New canonical research-content folder at `research_content/briefings/MVEP_TCMAG_comparison/` per DEC-102 namespace; first comparative briefing in the program's `briefings/` namespace; dual-anchor folder naming convention established for future "[OUR_KEY]_[THEIR_KEY]_comparison/" briefings (potential future examples: MVEP versus ISO 17442, CLII versus PFMI principles, MVEP versus FATF guidance).
- Source manuscript at `research_content/briefings/MVEP_TCMAG_comparison/manuscripts/MVEP_TCMAG_briefing_v1.md` (~2000 words; site-native scope; long-form variant queued only if engagement signal warrants).

### Canonical state (this commit)

- `docs/DECISION_LOG.md`: DEC-104 added documenting the publication move and framework-positioning rationale; folder naming decision; rejected alternatives; pending author backfill items deferred for R1.5 cycle compatibility.
- `docs/HYPOTHESES.md`: new "Framework Evolution Hypotheses (MVEP v2 candidates)" section added with H-17 (three operator-structural category candidates) and H-18 (LEI standard formalization candidate); both queued for A2 v2 evaluation.
- `docs/CROSS_REFERENCE_MAP.md`: TCMAG / MVEP comparative briefing cross-reference added to existing namespace.

### Pending author backfill (deferred from this commit)

The following canonical state updates were deferred to author backfill alongside the in-flight R1.5 practitioner migration cycle (would conflate two unrelated cycles if landed in this commit):

- `docs/ENTITY_PROFILES.md`: new entries for TCMAG (organization), Partior (TCMAG sponsor; candidate Tier 1 CLII case study), GLEIF (TCMAG sponsor; LEI standard authority); Darsh Johal (TCMAG chair) as a contact in the Ubyx-adjacent outreach surface.
- `docs/OUTREACH_LOG.md`: OL-002 status note appending TCMAG topic for pending McLaughlin call; OL-026 placeholder for Darsh Johal cold-fallback (only if McLaughlin relay does not materialize within two to three weeks).
- `docs/PROGRAM_STATE.md`: Published Practitioner Content table row added; new pending action for McLaughlin TCMAG relay; KU-29 sponsor engagement vector productivity registered.
- `docs/KNOWN_UNKNOWNS.md`: KU-29 added (TCMAG sponsor engagement vector productivity; open question on which sponsors are most promising relays).

### Engagement context

The TCMAG sponsor list overlaps with several entities the program has analyzed or engaged. Ubyx (Tony McLaughlin) is in active dialogue regarding the deposit-token clearing thesis (OL-002, call pending); the briefing creates concrete substance for surfacing TCMAG topic on the pending call and requesting introduction to chair Darsh Johal. HSBC, Barclays, and Lloyds Bank are tokenized deposit issuers whose architectures fit naturally within MVEP scoring. Partior is a candidate Tier 1 case study for CLII scoring. GLEIF anchors the identifier layer underlying MVEP Categories 1 and 8. SAP carries the ERP integration relevance that TCMAG's fourth principle requires.

### Editorial discipline

Zero em-dashes added (no-em-dashes rule); text-only briefing per locked 2026-04-18 site convention; cache versions unchanged (styles.css?v=123, script.js?v=179) since no shared asset edits.

---

## 2026-04-21: Dual 8-of-8 canonical state refresh across site, resume, and social deliverable surfaces

**Federal comment letter program complete** (8 of 8 submitted through 2026-04-20; AG19 closing via Comments@fdic.gov). **SSRN publication layer complete** (8 of 8 working papers live with full abstract IDs; A3 6483118, A4 6483198, B3 6483619 new; A1, A2, B1, B2, B4 unchanged).

### Site (commit `aacf6f0`)

- Homepage, research, overview, contact, 404, and speaker pages refreshed to dual 8/8 program-status narrative.
- Paper pages for A3 Seven Dollars, A4 Three Tokenization Strategies, B3 Who Burns the Tokens? updated with SSRN IDs, DOI lines, **Read on SSRN** primary CTAs, and ScholarlyArticle JSON-LD including `isBasedOn`, `identifier`, and `sameAs` where applicable.
- B2 Governance Concentration page marked Public on SSRN alongside Under review.
- Research ItemList updated to A1, A2, A3, A4, B1, B2, B3, B4 with correct URLs; library cards and CTAs for A3, A4, B3; Program milestones and Stablecoin and protocol landscape sections added.
- Overview page B3 blurb replaces the prior GeoDePIN working-title blurb; Federal Comment Letter Program block added.
- `sitemap.xml` `lastmod` set to 2026-04-21 across all entries.
- Asset versioning bumped to `script.js?v=179` across all 25 full-chrome pages.
- Routing the Dollar page duplicate **Read on SSRN** removed (hero CTA preserved).
- Adaptive Tokenomics and Operational Risk pages gained **Read on SSRN** CTAs.
- Resume hub adds **View resume PDF** CTA across all resume profiles.
- `SITE_STATE.md` refreshed with 8/8 table and asset-version notes.
- `cryptozach-site-polish-audit` skill updated for current routes and 8/8 paper status.
- **Hotfix (post-deploy):** removed `papers/three-strategies.html` and `papers/operational-risk.html` legacy client-side redirect stubs. Those files and the `papers/…/index.html` trees both map to the same path on static hosts, which caused an infinite refresh loop on `/papers/three-strategies` and `/papers/operational-risk`. Cloudflare `_redirects` still 301s `/papers/three-strategies.html` and `/papers/operational-risk.html` to the clean paths.

### Resume (commit `a637df1`)

- AI governance and infrastructure profile: supporting research intro updated to **five papers**; Track B described as Governance Concentration (SSRN; under review at *Frontiers in Blockchain*) and Who Burns the Tokens? (SSRN; submission to *Blockchain: Research and Applications* pending).
- New fifth research card for B3 with What it is, Why it matters, Who it's for structure and **SSRN 6483619** status.
- Risk, controls and diligence profile: new B3 card positioned after Operational Risk as Track B companion, with risk-framed blurb on burn mechanics under issuance pressure.
- Resume hub: supporting research blocks in AI governance card and risk strip include link to `/papers/who-burns-the-tokens`.

### Social deliverable (commit `4147833`)

- Twitter reply corpus-pointer A3 descriptor corrected from seven-product to **eight-product**, matching `papers/seven-dollars` enumeration (USDC, PYUSD, USDT, USDS, USDe, DAI, USDG, OUSG).
- LinkedIn first comment and Twitter reply use **tokenization.systems** as the canonical domain.
- Deliverable v5 publish-ready for Tuesday 2026-04-22 morning window.

### Related

- Resume layer: commit `a637df1`.
- Site layer: commit `aacf6f0`.
- Social layer: commit `4147833`.
- Canonical state (session): commits 10 through 19 on 2026-04-21 established SSRN publication layer plus federal comment letter program plus AG19 editorial improvements plus 8-of-8 milestones.

---

## Earlier: Research pages merge

### Summary

Merged `/research-program.html` and `/tokenomics-research.html` into a single canonical research page at `/selected-research.html`. The two retired URLs now redirect so existing links do not break. No paper or output was removed.

### Files changed

| File | Change |
|------|--------|
| `selected-research.html` | Rewritten as canonical research library: program overview, best-first-read, filters/jump links, Track A, Track B, earlier work, cross-track convergence. Title set to "Research \| Zach Zukowski". Meta description and OG updated. |
| `research-program.html` | Replaced with lightweight redirect: canonical to selected-research.html, JS redirect to `/selected-research.html#program-overview`, noscript fallback. |
| `tokenomics-research.html` | Replaced with lightweight redirect: canonical to selected-research.html, JS redirect to `/selected-research.html#track-b`, noscript fallback. |
| `index.html` | Three links updated: Research program send-item and research footer link → `selected-research.html#program-overview`; Tokenomics & DePIN track → `selected-research.html#track-b`. |
| `2026-frameworks.html` (formerly `start-here.html`) | Two links updated: Tokenomics & DePIN track → `selected-research.html#track-b`; View the full research program → `selected-research.html#program-overview`. `start-here.html` remains as a redirect stub. |
| `Operating-Model.html` (then `frameworks.html`) | Two links updated: View the full research program → `selected-research.html#program-overview` (parenthetical "eight papers, two tracks" removed); Tokenomics & DePIN track → `selected-research.html#track-b`. Page later renamed to Operating-Model; `frameworks.html` kept as redirect. Site nav label for this page is **Structure** (file name unchanged). |
| `resume/stablecoin-payments-strategy.html` | Tokenomics & DePIN track link → `selected-research.html#track-b`. |
| `resume/asset-management-tokenization.html` | Tokenomics & DePIN track link → `selected-research.html#track-b`. |
| `resume/policy-market-infrastructure.html` | Tokenomics & DePIN track link → `selected-research.html#track-b`. |
| `papers/adaptive-tokenomics.html` | All three references to tokenomics-research.html → `selected-research.html#track-b`. |
| `papers/operational-risk-token-economies.html` | All three references to tokenomics-research.html → `selected-research.html#track-b`. |

### Final section structure (selected-research.html)

1. **#program-overview** – Program overview: two-track thesis (Track A = stablecoin/dollar infrastructure, Track B = tokenomics/DePIN), convergence line, and headline framing ("Seven scholarly papers, two tracks").
2. **#best-first-read** – Featured paper: Routing the Dollar (Under review, Best first read), with metadata, thesis, blurb, CTAs (paper summary, SSRN, Thread), cover image, and "More on relevance and audience" expandable.
3. **Filters and jump links** – Audience, Track, Status filters (unchanged). Jump links: #best-first-read, #track-a, #track-b, #earlier-work, #cross-track-convergence.
4. **#track-a** – Track A: short intro, A1 compact reference only ("A1 — Routing the Dollar — featured above."), then full cards for A2 (Minimum Viable Equivalence Pack), Dollar v3 / The Control Layer War (no A3 label), Tokenized Equity, Navigating the New Era of Digital Assets.
5. **#track-b** – Track B: short intro, then full cards for B1 (Adaptive Tokenomics, Public + Code available), B2 (Tokenomics as Institutional Design, Available on request), B3 (GeoDePIN, Available on request), B4 (Operational Risk in Token Economies, Public + Code available); then muted thesis note (Draft BSc thesis wrapping B2 and B3).
6. **#earlier-work** – Three cards: The Future of Tokenomics (Medium, Aug 2024), Gamification in Crypto (Medium, Aug 2024), Introduction to Tokenomics (Medium, Apr 2022).
7. **#cross-track-convergence** – Tightened three-row table (Dimension: Infrastructure concentration, Stress transmission, Subsidy-to-revenue transition) with one-sentence cells per track, plus synthesis line: "Both tracks find that infrastructure-layer analysis reveals failure modes invisible to asset-level monitoring."

### Papers and outputs included (no loss)

| Item | Location | Badges / notes |
|------|----------|----------------|
| Routing the Dollar | Featured (#best-first-read) + A1 ref in Track A | Under review, Best first read |
| Minimum Viable Equivalence Pack (A2) | Track A | Public |
| Dollar v3 / The Control Layer War | Track A | Public / requestable |
| Tokenized Equity | Track A | Public, Medium |
| Navigating the New Era of Digital Assets | Track A | Public, Medium |
| Adaptive Tokenomics (B1) | Track B | Public, Code available |
| Tokenomics as Institutional Design (B2) | Track B | Available on request |
| GeoDePIN (B3) | Track B | Available on request |
| Operational Risk in Token Economies (B4) | Track B | Public, Code available |
| BSc thesis (B2 + B3 umbrella) | Track B (muted note) | Draft |
| The Future of Tokenomics | Earlier work | Public, Medium Aug 2024 |
| Gamification in Crypto | Earlier work | Public, Medium Aug 2024 |
| Introduction to Tokenomics | Earlier work | Public, Medium Apr 2022 |

### SEO / metadata

- **selected-research.html**: `<title>Research | Zach Zukowski</title>`. Meta description: "Two research tracks, one thesis: regulate the operator, not just the token. Papers on stablecoin infrastructure, dollar tokenization, DePIN mechanism design, and operational risk." Canonical and OG point to `https://cryptozach.com/research`.
- **research-program.html** and **tokenomics-research.html**: Canonical points to `https://cryptozach.com/research`; no duplicate content.

### What was not changed

- Individual paper summary URLs (e.g. `/papers/routing-the-dollar.html`) unchanged.
- Main nav "Research" still points to `selected-research.html`.
- Homepage "8 papers" stat badge unchanged.
- Card and expand/collapse pattern ("More on relevance and audience", "Why it matters", "Who it's for") preserved.
- Existing badge vocabulary only (no "Submitted", "Published", "Final draft" added).

### Unresolved questions

- None. All internal links were updated; "eight papers" / "Eight papers" removed from copy; redirects use JS + noscript as specified.
