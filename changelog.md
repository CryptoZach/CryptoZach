# Changelog

Rolling, dated release notes for site, resume, and social deliverable surfaces.

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
