# R1: Research Content Architecture

**Status:** Phase R1.0 scaffolding complete. Phase R1.1 (A5 pilot migration) and beyond pending.

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
├── papers/
│   └── A5_svb_causal/             # populated in R1.1 (early R1.1-lite import 2026-04-21)
├── letters/
├── practitioner/
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

| Phase | Scope | Effort |
|---|---|---|
| R1.0 | Scaffolding (this commit) | 2-4 hours |
| R1.1 | A5 pilot migration | 4-6 hours |
| R1.2 | Comment letter migration (8 letters) | 4-6 hours |
| R1.3 | Paper wave 1 (A4, B2, B3) | 8-12 hours |
| R1.4 | Paper wave 2 (A1, A2, A3, B1, B4) | 10-15 hours |
| R1.5 | Practitioner migration | 9-13 hours |
| R1.6 | Cited research bootstrap | 32-38 hours |
| R1.7 | Build tooling implementation | 6-8 hours |
| R1.8 | Adoption steady state | ongoing |

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
