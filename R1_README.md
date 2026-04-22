# R1: Research Content Architecture

**Status:** Phases R1.0 through R1.5 complete (2026-04-22). R1.0 scaffolding, R1.1 A5 pilot, R1.2 letter migration (8 of 8 letters with METADATA + LETTER.md + as-filed PDF + 2 FDIC public-intro files; `_program_strategy/` populated with 3 strategy docs), R1.3 paper wave 1 (A4 + B2 + B3 with METADATA + submissions/ + versions/ + exhibits/ scaffolding), R1.4 paper wave 2 (A1 + A2 + A3 + B1 + B4 same scaffolding), and R1.5 practitioner migration (4 items: DV3 + CLW + TEV + MVEP_TCMAG briefings populated; 3 practitioner subdirs 2025-12_dollar_v3_memo + 2026-01_clarity_control_layer + 2026-02_mvep_content_suite created with METADATA + body files + READMEs) all delivered. A5 (R1.1 pilot) gained METADATA.md in the same 2026-04-22 batch for canonical-structure consistency; A6 / A7 STUB papers also gained METADATA. R1.6 (cited research), R1.7 (build tooling), and R1.8 (steady state) remain pending.

**Authoritative spec:** `handoff/architecture/Upgrade_R1_Research_Content_Canonicalization_Spec.md`
**Author decisions:** `handoff/architecture/AD_Resolutions_014_020_R1_Spec.md` (AD-014 through AD-020 resolved)
**A1 integration:** `handoff/architecture/Upgrade_A1_R1_Integration_Amendment.md`
**Migration scope:** `handoff/architecture/Research_Content_Inventory_2026-04-20.md` (108+ items, 100-139 hours)
**Namespace amendment:** `.cursor/tasks/applied/Upgrade_R1_Spec_Amendment_Research_Content_Namespace_2026-04-21.md` (post-R1.0-halt resolution adopting `research_content/` parent per R1.0-A sub-option (b))

## What R1 does

Canonicalizes all research content (papers, comment letters, practitioner articles, reviewer-response assets, internal memos, cited research, resume variants) as Markdown under `research_content/` with structured METADATA per content item. Build pipeline (Phase R1.7) generates .docx / .pdf / .html artifacts from .md source.

## Repository partition (post-R1.0)

This repository hosts cryptozach.com website infrastructure alongside research-state canonical files and research-content source. Partition semantics:

| Path | Owner | Purpose |
|---|---|---|
| `docs/` | Research state | 17 canonical Markdown files (PROGRAM_STATE, DECISION_LOG, KEY_FINDINGS, etc.) |
| `research_content/` | R1 (NEW) | papers, letters, practitioner, reviewer_assets, memos, cited_research, resumes (MD source) |
| `papers/`, `resumes/`, `exhibits/`, `research/` (root-level) | Website | cryptozach.com paper briefing pages, binary resume artifacts, publication exhibits, site section. UNCHANGED by R1. |
| `tools/canonical-state/` | Upgrade A1 | canonical_state.json parser + validator (pending) |
| `tools/content-build/` | R1 (NEW) | pandoc templates + citeproc config + plotting + exhibit_builder + metadata_templates + build.py |
| `handoff/` | Cross-boundary | architecture specs; session handoffs |
| `.cursor/` | Cursor tooling | rules, skills, tasks |
| `assets/`, `icons/`, `ink-brand-kit/`, root-level `.html` | Website | cryptozach.com static assets and pages |

The R1 spec was amended 2026-04-21 to adopt the `research_content/` parent namespace after Cursor's pre-flight discipline surfaced the website+research hybrid repo structure during R1.0 dispatch attempt. See `.cursor/tasks/applied/Upgrade_R1_Spec_Amendment_Research_Content_Namespace_2026-04-21.md` for full halt context.

## Content tree (R1.0 scaffolding)

```
research_content/
├── papers/                                         # 11 academic slots (per DEC-102); spec section 2.2 layout
│   ├── A1_routing_the_dollar/                     # SSRN 6267698; PAPER.md + submissions/{docx,pdf} (v43; Mar 11)
│   ├── A2_mvep/                                   # SSRN 6363138; PAPER.md + submissions/{docx,pdf} (v9_Final; Apr 10)
│   ├── A3_seven_dollars/                          # SSRN 6483118; PAPER.md + submissions/{docx,pdf} (SSRN; Apr 22 post table-fmt polish)
│   ├── A4_three_strategies/                       # SSRN 6483198; PAPER.md + submissions/{docx,pdf} (Final_polished; Apr 20)
│   ├── A5_svb_causal/                             # working paper; PAPER.md (R1.1 pilot) + working/ drafts
│   ├── A6_optimal_gateway_regulation/             # STUB; research_inputs/ placeholder pending verification
│   ├── A7_control_layer_theory/                   # STUB; research_inputs/ ideation memo
│   ├── B1_adaptive_tokenomics/                    # SSRN 6364158; PAPER.md + submissions/{docx,pdf} (EC_B1a; Apr 18)
│   ├── B2_governance_concentration/               # SSRN 6599278; PAPER.md + submissions/{docx,pdf} (Frontiers; Apr 18; ns-prefix-normalized for pandoc)
│   ├── B3_who_burns_the_tokens/                   # SSRN 6483619; PAPER.md + submissions/{docx,pdf} (Final_v10; Apr 18)
│   └── B4_operational_risk/                       # SSRN 6352118; PAPER.md + submissions/{docx,pdf} (full body; Mar 5; restaged 2026-04-22) + versions/Exhibit_Appendix_FINAL_2026-03-09.docx
├── briefings/                                      # 4 practitioner briefings (per DEC-102 + DEC-103); R1.5 populated
│   ├── TEV_tokenized_equity/                      # Medium / site only; STUB with METADATA (R1.5)
│   ├── DV3_dollar_v3/                             # Medium / site; HYBRID (R1.5 manuscripts/Dollar_v3_FINAL_MEDIUM_LINKED.md)
│   ├── CLW_control_layer_war/                     # Medium / site; HYBRID (R1.5 manuscripts/Control_Layer_War_FINAL.md, split via Approach A)
│   └── MVEP_TCMAG_comparison/                     # site briefing 2026-04-22; HYBRID (manuscripts/MVEP_TCMAG_briefing_v1.md; METADATA added R1.5)
├── letters/                                        # R1.2 complete 2026-04-22: 8 letter dirs (METADATA + LETTER.md + PDF) + _program_strategy/
│   ├── 2026-04-10_OCC_MVEP_v4_RIN_1557_AF41/     # OCC-2025-0372-0057
│   ├── 2026-04-13_OCC_Supplemental_RIN_1557_AF41/ # OCC-2025-0372-0069
│   ├── 2026-04-15_Treasury_GENIUS_Act_State_Similarity/ # TREAS-DO-2026-0232
│   ├── 2026-04-18_FDIC_AG20_PPSI_Application_Rule/  # RIN 3064-AG20 (+ Public_Intro.md)
│   ├── 2026-04-18_FinCEN_AML_CFT_NPRM/            # FINCEN-2026-0034
│   ├── 2026-04-18_FinCEN_OFAC_PPSI_Sanctions/     # FINCEN-2026-0100
│   ├── 2026-04-18_Banking_Agencies_91FR18304_Joint_AML/ # 91 Fed. Reg. 18304 joint
│   ├── 2026-04-20_FDIC_AG19_PPSI_Activities_Rule/  # RIN 3064-AG19 (program-closing; + Public_Intro.md)
│   └── _program_strategy/                          # AML strategic update + GENIUS gap analysis + Fed NPRM skeleton
├── practitioner/                                   # R1.5 complete 2026-04-22: 3 practitioner subdirs + type-level README
│   ├── 2025-12_dollar_v3_memo/                    # MEMO.md (pandoc gfm) + .docx + .pdf + METADATA + README
│   ├── 2026-01_clarity_control_layer/             # ARTICLE.md (Jan 24 2026 Medium essay; Piece_1) + METADATA + README
│   ├── 2026-02_mvep_content_suite/                # ARTICLE_medium.md + POST_linkedin.md + THREAD_x.md + COVER + OnePager + METADATA + README
│   └── README.md                                   # practitioner type-level README (R1.5)
├── reviewer_assets/
├── memos/
│   ├── handoffs/
│   ├── reading_notes/
│   ├── reviewer_responses/
│   ├── interview_prep/
│   ├── patches_applied/
│   └── strategy/
├── cited_research/
│   ├── tier_1/
│   ├── tier_2/
│   ├── tier_3/
│   └── category_6_a5_precedents/
└── resumes/

tools/content-build/
├── pandoc_templates/              # SSRN, Frontiers, JFS, FDIC, OCC, FinCEN, Treasury, Medium, LinkedIn, resume targets
├── citeproc_config/               # citation styles per target venue
├── plotting/                      # shared exhibit infrastructure (theme.R, palette.py, panel_layouts.R)
├── exhibit_builder/               # per-paper exhibit generation orchestration (planned R1.7)
├── metadata_templates/            # one schema-stub per R1 content type (7 templates)
└── build.py                       # top-level build entry (placeholder; Phase R1.7 implementation)
```

## Per-content-item structure (post-R1.1)

Each content directory has METADATA.md plus at least one body file. Example:

```
research_content/papers/A5_svb_causal/
├── METADATA.md                    # YAML frontmatter per spec Section 3.1
├── PAPER.md                       # main content
├── OUTLINE.md                     # optional: structural outline
├── exhibits/                      # per-paper exhibits with R/Python provenance
├── bibliography/                  # optional: paper-specific REFERENCES.md
├── submissions/                   # COMMITTED: submission-of-record artifacts (per AD-015)
├── versions/                      # active-reference frozen versions (per AD-020)
└── _build/                        # GITIGNORED: ephemeral build outputs
```

## Migration phases

| Phase | Scope | Effort | Status |
|---|---|---|---|
| R1.0 | Scaffolding | 2-4 hours | DONE (commit 25, 2026-04-21) |
| R1.1 | A5 pilot migration | 4-6 hours | DONE (PAPER.md canonical; METADATA.md added in R1.4 batch) |
| R1.2 | Comment letter migration (8 letters) | 4-6 hours | DONE (2026-04-22): per-letter METADATA + LETTER.md + as-filed PDF, plus `_program_strategy/` with 3 strategy docs |
| R1.3 | Paper wave 1 (A4, B2, B3) | 8-12 hours | DONE (2026-04-22): per-paper METADATA + submissions/ + versions/ + exhibits/ scaffolding |
| R1.4 | Paper wave 2 (A1, A2, A3, B1, B4) | 10-15 hours | DONE (2026-04-22): same scaffolding plus B4 full body restage from `~/Downloads/SSRN Pub Plan/` and A3 table-fmt polish restage |
| R1.5 | Practitioner migration | 9-13 hours | DONE (2026-04-22): per-item METADATA + body files across briefings/ (DV3 HYBRID with Medium essay in manuscripts/; CLW HYBRID with site-page-copy split via Approach A; TEV STUB-with-METADATA via Option 1; MVEP_TCMAG METADATA add to prior HYBRID) and practitioner/ (2025-12_dollar_v3_memo with pandoc-gfm MEMO.md + docx + pdf; 2026-01_clarity_control_layer with Piece_1 Jan essay as ARTICLE.md; 2026-02_mvep_content_suite with per-venue Medium + LinkedIn + X + cover + one-pager) |
| R1.6 | Cited research bootstrap | 32-38 hours | pending |
| R1.7 | Build tooling implementation | 6-8 hours | pending |
| R1.8 | Adoption steady state | ongoing | pending |

Total: 100-139 hours; 3-4 month elapsed timeline. Per `Research_Content_Inventory_2026-04-20.md`.

## How to add new content

1. Identify content type (paper / letter / practitioner / reviewer_asset / memo / cited_research / resume).
2. Create directory under appropriate `research_content/<type>/` parent.
3. Copy `tools/content-build/metadata_templates/<type>_template.md` to new directory's `METADATA.md`.
4. Author body file (`PAPER.md`, `LETTER.md`, `ARTICLE.md`, `RESUME.md`, etc.).
5. Update cross-references in `docs/` canonical state per `cryptozach-living-files` skill discipline.
6. Build via `python3 tools/content-build/build.py research_content/<type>/<item>` (post-R1.7).

## Content vs. state

- **State** (`docs/`): authoritative facts (decisions, findings, unknowns, outreach, entities, errors). 17 canonical files; programmatically scannable.
- **Content** (`research_content/`): research outputs (papers, letters, practitioner content, reading notes, resumes). Source of truth for built artifacts.

State references content via path (e.g., KEY_FINDINGS F-A5-1 references `research_content/papers/A5_svb_causal/PAPER.md` Section 4). Content references state via cross-references in METADATA.

## See also

- `docs/KNOWLEDGE_ARCHITECTURE.md`: canonical-file model and tool roles
- `docs/PROGRAM_STATE.md`: open workstreams (R1 phases tracked under Workstream A)
- `handoff/architecture/Architecture_Artifacts_Handoff_Manifest.md`: index of architecture-planning artifacts (8 docs)
