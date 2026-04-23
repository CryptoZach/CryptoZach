# AGENTS.md: Shared agent instructions for this repo

This file is the entry point for any agent working in `/Users/zach/ai-research/CryptoZach/` that follows the `AGENTS.md` convention (Cursor IDE; Codex CLI; other agent tools). Anthropic's Claude Code CLI auto-loads `CLAUDE.md` separately; **the two files share the same content authority**. `CLAUDE.md` holds the canonical full instructions; this file is a pointer plus critical-constraints summary so tools that only read `AGENTS.md` still get the essential discipline.

If your tool reads `CLAUDE.md` directly, no further reading needed; both files describe the same lane, constraints, and patterns. If your tool reads this file but not `CLAUDE.md`, **read `CLAUDE.md` next** for full session-start workflow, output conventions, and standard handoff-execution pattern.

---

## Step 0: Active sync (any tool, any session)

```bash
python3 scripts/claude-code-sync.py
```

Reads `docs/` at run time and emits a markdown snapshot covering: identity, lane reminder, hard constraints, timestamp; canonical-file freshness table for all 17 `docs/` files; SSRN publication snapshot; recent decisions (last 5 `DEC-NNN`); recent corrections (last 5 `EC-...`); critical KU; open OL; top PROGRAM_STATE pending actions; output conventions; common workflow pointers. Default approximately 165 lines / 11 KB. Read-only; safe to re-run between major task switches. See `scripts/README.md` for full options table and caveats.

The script is named `claude-code-sync.py` because it was authored for Claude Code CLI's session-start flow, but it is a pure `docs/`-tree reader and runnable from any tool with shell access (Cursor, Codex CLI, etc.). Re-running across tools costs nothing and keeps every session aligned to current canonical state.

---

## Critical constraints (full detail in CLAUDE.md)

### Lane discipline (DEC-069)

Cursor is the sole canonical writer for `docs/`. Other tools (Claude Code CLI, Codex CLI, ad-hoc scripts) are execution engines: data pipelines, manuscript surgery, econometrics, content production, build tooling. When work surfaces canonical-state updates that belong in `docs/`, capture them in a handoff-back note (default location `/tmp/<cycle>_handoff_back_to_cursor.md`) for Cursor to apply in a follow-up commit. Do not write to `docs/` directly.

The one carve-out: `docs/PROGRAM_STATE.md` may receive Session Changes blocks from non-Cursor commits when those commits are part of a coherent narrative (per the R1.5 / R1.5.1 pattern), but only after the same commit has staged the substantive content that the Session Changes block narrates.

### Editorial: zero em-dashes (—) and en-dashes (–) in newly-authored prose

Use commas, parentheses, colons, periods, or semicolons. Two exceptions where literal em-dashes are required: the rule itself (when documenting the rule you have to type the character to name it), and search patterns / regex (`rg -n '[—–]'`). Source content fidelity exception: when migrating or restaging external author-authored content (a published Medium article body, a comment letter body, a docx-converted manuscript), preserve the source's em-dashes. The rule applies to your prose, not the migrated source's.

### Hybrid-repo partition

- `docs/`: research state (17 canonical Markdown files; Cursor lane).
- `research_content/`: papers, letters, practitioner, briefings, memos, cited_research, resumes (R1 lane; non-Cursor tools may write here per content type).
- `papers/`, `resumes/`, `exhibits/`, `research/` (root-level): cryptozach.com website infrastructure. UNCHANGED by R1 work.
- `tools/`: tooling (`canonical-state/` for Upgrade A1; `content-build/` for R1 build pipeline).
- `handoff/`: cross-boundary architecture specs plus session handoffs.
- `.cursor/`: Cursor tooling.
- `assets/`, `icons/`, `ink-brand-kit/`, root-level `.html`: website infrastructure.

Do not write to website-lane paths from R1 / canonical-state work, and vice versa.

### No invented IDs

When METADATA cross-references would require inventing a finding ID (`F-*`), decision ID (`DEC-*`), unknown ID (`KU-*`), entity row, error code (`EC-*`), or outreach ID (`OL-*`) that does not exist in canonical state, leave the array empty and flag in the handoff-back note. Cursor will assign IDs in a follow-up commit per status-tracking discipline.

---

## Where to find things

| Need | Surface |
|---|---|
| Full agent instructions (this file's source-of-truth content) | `CLAUDE.md` |
| Active canonical-state sync | `python3 scripts/claude-code-sync.py` |
| Sync-script options + caveats | `scripts/README.md` |
| Comprehensive narrative memory (program purpose, two-track structure) | `handoff/claude_web_project_memory.md` |
| Active handoff prompts (R1.5.2, R1.7, etc.) | `handoff/r1_*_*.md` and `handoff/<workstream>_*_handoff.md` |
| Architecture specs (R1, A1, A2 upgrades; AD resolutions) | `handoff/architecture/*.md` |
| Author-manual lane (SSRN uploads, journal submissions) | `handoff/author_instructions/` |
| Cross-tool coordination patterns | `.cursor/skills/cryptozach-multi-tool-handoff/SKILL.md` |
| Living-files discipline (header bumps, Session Changes blocks) | `.cursor/skills/cryptozach-living-files/SKILL.md` |
| Status-tracking discipline (status-append pattern; pending-action lifecycle) | `.cursor/skills/cryptozach-status-tracking/SKILL.md` |
| Spec-execution discipline (halt-on-divergence; structured options) | `.cursor/skills/cryptozach-spec-execution/SKILL.md` |
| Editorial standards (zero em-dashes; banned terms; finding-first openers) | `docs/EDITORIAL_STANDARDS.md` |
| Knowledge architecture catalog (canonical files; tool roles) | `docs/KNOWLEDGE_ARCHITECTURE.md` |

All paths above are accessible to any tool with filesystem read access in the repo. Cursor and Claude Code CLI both reference the same files; no tool-private state.

---

## When this file needs updating

Update when:

- A new shared agent surface is added (e.g., a new auto-loaded entry-point file).
- A new hard constraint emerges (new author rule; new lane-discipline boundary; new editorial standard).
- The hybrid-repo partition shifts (e.g., a new top-level directory is added with its own lane).
- The sync script's invocation changes (e.g., a v2 with different CLI flags).

Keep this file and `CLAUDE.md` in lockstep on shared content; tool-specific operational detail (e.g., Claude Code CLI's exact session-start prompt) lives in `CLAUDE.md` only.

Last updated: 2026-04-22 (initial author; pairs with `CLAUDE.md` ship same date and `scripts/claude-code-sync.py` v1).
