# CLAUDE.md: Claude Code CLI session-start instructions

This file is auto-loaded by Claude Code CLI when started in this repository. It is the canonical session-start surface for Claude Code working in `/Users/zach/ai-research/CryptoZach/`.

**Cross-tool parity:** `AGENTS.md` at repo root mirrors this file's critical constraints for tools that follow the `AGENTS.md` convention (Cursor IDE; Codex CLI). Both files reference the same canonical surfaces (`scripts/claude-code-sync.py`, `docs/`, `handoff/`, `.cursor/skills/`). `CLAUDE.md` (this file) is the source of truth for full content; `AGENTS.md` is a pointer plus inlined critical-constraints summary. Keep them in lockstep when shared content changes.

If you are running Claude Code CLI and reading this for the first time in this session, **execute the active-sync step in the next section before doing any other work**. The sync output is your authoritative read of canonical state.

---

## Step 0: Active sync (run at every session start)

Session-start sync has two parts: pull origin into your working clone, then read canonical state.

### Step 0a: Pre-flight git pull-before-work

Before any work, fetch origin and rebase if this clone is behind. The two-clone setup (see Multi-clone coordination below) plus parallel Claude Code / Cursor sessions produce frequent 1-to-8 commit gaps between local state and origin:

```bash
git fetch origin
git status                          # "Your branch is behind 'origin/main'" means rebase needed
git pull --rebase origin main       # rebase (not merge) to keep history linear
```

Read-only fetch first (so you see divergence without committing to a rebase). Skip the rebase if status is clean or ahead-only. If status shows diverged history with unstaged local edits, commit or stash before rebasing.

### Step 0b: Read canonical state

Run the active-sync script and treat the output as your canonical-state snapshot for this session:

```bash
python3 scripts/claude-code-sync.py
```

The script parses `docs/` at run time and prints (in order): identity + lane reminder + hard constraints + timestamp; canonical-file freshness table for all 17 `docs/` files; SSRN publication snapshot; recent decisions (DEC-NNN); recent corrections (EC-YYYY-MM-DD-X); critical known unknowns; open outreach; top pending actions; output conventions; common workflow pointers; comprehensive-memory pointer.

Default output is approximately 165 lines / 11 KB. Add `--terse` to compress to approximately 150 lines if context is tight. See `scripts/README.md` for full options table and caveats.

**Re-run the script between major task switches** so you always have current canonical state. The script is read-only (zero side effects); safe to run any time.

### Sync-state hotword

When the user message is `sync state`, `sync`, `/sync`, `/state`, or `refresh state` (case-insensitive, as the leading or sole directive), immediately:

1. Run `python3 scripts/claude-code-sync.py`.
2. Read the markdown snapshot output.
3. Confirm with one line: "Synced. <Last canonical update ISO date>; <N> open OL; <K> critical KU; <M> pending actions."
4. Continue with any remaining directive in the same message, or await further instruction.

The hotword exists so the author can refresh agent state without retyping the script invocation. Do not show the full snapshot to the user unless they ask; the one-line confirmation is the default. Treat the snapshot as authoritative for the rest of the turn.

---

## Multi-clone coordination

Two local clones of this repo exist on the author's machine:

- **Primary clone:** `/Users/zach/ai-research/CryptoZach/` (convenience symlink: `/Users/zach/cryptozach`). This is the designated canonical clone. `CLAUDE.md` and `AGENTS.md` narratives, `docs/*.md` absolute-path references, the Cursor project-id (`Users-zach-ai-research-CryptoZach`), and agent transcripts all bind to this path. Prefer starting sessions here.
- **Working clone:** `/Users/zach/Tokenization_Systems_Website/`. Pre-existing parallel clone; retained for site-deploy workflows and in-flight parallel sessions. Fully functional (same origin, same git history) but not the designated canonical path.

Both clones push and pull from the same origin (`github.com/CryptoZach/CryptoZach`). Divergence between clones (one ahead, one behind) is common during multi-session work; Step 0a's pull-before-work pre-flight resolves it.

**Which clone to use for new sessions:** the primary clone. Start Claude Code CLI there by running `cd ~/cryptozach && claude` (the symlink resolves transparently). The working clone remains valid for active in-flight sessions or purpose-built tasks, but new sessions default to primary.

**Narrative-of-record vs functional dependency.** The 50+ absolute-path references to `/Users/zach/ai-research/CryptoZach/` across `docs/*.md`, `handoff/*.md`, and skill bodies are narrative-of-record (documenting where canonical state lives conceptually), not functional dependencies. A session running out of the working clone does not break canonical state: the sync script resolves `REPO_ROOT` via `Path(__file__).resolve().parent.parent` and works from either clone. The sync script's header prints a **clone identity** line (primary or working) so every session sees its clone context at session start. The primary-clone designation is a UX and organizational convention, not a filesystem constraint.

---

## Hard constraints

These are program-level constraints. Violations break canonical-state coherence; if a task requires you to violate one, halt and surface to the author rather than improvise.

### Lane discipline (DEC-069)

Cursor is the sole canonical writer for `docs/`. Claude Code CLI is the **execution engine** (data pipelines, manuscript surgery, econometric estimation, content production, build tooling). When work surfaces canonical-state updates that belong in `docs/`, capture them in a handoff-back note (default location `/tmp/<cycle>_handoff_back_to_cursor.md`) for Cursor to apply in a follow-up commit. Do not write to `docs/` directly.

The one carve-out: `docs/PROGRAM_STATE.md` may receive Session Changes blocks from Claude Code commits when those commits are part of a coherent narrative (per the R1.5 / R1.5.1 pattern), but only after the same commit has staged the substantive content that the Session Changes block narrates. Other `docs/` files (DECISION_LOG, KEY_FINDINGS, DATA_REGISTRY, ENTITY_PROFILES, CROSS_REFERENCE_MAP, OUTREACH_LOG, KNOWN_UNKNOWNS, EDITORIAL_STANDARDS, SITE_STATE, HYPOTHESES, FRAMEWORK_REGISTRY, ERROR_CORRECTION_LOG, GLOSSARY, KNOWLEDGE_ARCHITECTURE) stay strictly in Cursor's lane.

### Editorial: zero em-dashes (—) and en-dashes (–) in newly-authored prose

The author rule is no em-dashes in any prose Claude Code authors (commit messages; code comments; READMEs; METADATA notes; PROGRAM_STATE Session Changes blocks; handoff prompts; handoff-back notes). Use commas, parentheses, colons, periods, or semicolons.

Two exceptions where literal em-dashes are required:
1. The rule itself (when documenting "no em-dashes" you have to type the em-dash to name it).
2. Search patterns / regex (`rg -n '[—–]'`).

Source content fidelity exception: when the work is migrating or restaging external author-authored content (a published Medium article body; a comment letter body; a docx-converted manuscript), preserve the source's em-dashes. The rule applies to your prose, not the migrated source's.

### Hybrid-repo partition

This repo hosts cryptozach.com website infrastructure plus research-state canonical files plus research-content source. Per R1 spec section 1.6:

- `docs/`: research state (17 canonical Markdown files; Cursor lane).
- `research_content/`: papers, letters, practitioner, briefings, memos, cited_research, resumes (R1 lane; Claude Code may write here per content type).
- `papers/`, `resumes/`, `exhibits/`, `research/` (root-level): cryptozach.com website (briefing pages, binary resume files, publication exhibits, site section). UNCHANGED by R1 work.
- `tools/`: tooling (`canonical-state/` for Upgrade A1; `content-build/` for R1 build pipeline).
- `handoff/`: cross-boundary architecture specs + session handoffs.
- `.cursor/`: Cursor tooling.
- `assets/`, `icons/`, `ink-brand-kit/`, root-level `.html`: website infrastructure.

Do not write to website-lane paths from R1 / canonical-state work (and vice versa).

### No invented IDs

When METADATA cross-references would require inventing a finding ID (F-*), decision ID (DEC-*), unknown ID (KU-*), entity row, error code (EC-*), or outreach ID (OL-*) that does not exist in canonical state, leave the array empty and flag in the handoff-back note. Do not invent IDs. Cursor will assign them in a follow-up commit per status-tracking discipline.

### Cursor-skills freeze (Phase A; 2026-04-23 to ~2026-05-21)

Per the Cursor phased reduction plan at `handoff/cursor_phased_reduction_plan_2026-04-23.md` (commit `59adfd9`):

- **No new `.cursor/skills/cryptozach-*/SKILL.md` files.** New operational discipline gets captured as Claude Code skills or agents instead.
- **In-place updates allowed for the existing 36 Cursor skills.** Maintenance edits, content additions, and version bumps proceed normally. Refactoring more than 50% of an existing Cursor skill (line-count basis: lines added plus lines removed greater than half the original line count) counts as a freeze violation requiring author authorization. Borderline cases route to author for decision.
- **Observation period: 2 to 4 weeks (target end ~2026-05-21).** Tracking ledger at `handoff/cursor_phased_reduction_observations.md` logs BOTH calibration catches (Cursor caught a Claude Code miss) AND null cycles (Claude Code shipped clean without Cursor involvement). Both are required for empirical Phase A to Phase B exit gate evaluation; without the denominator, calibration-value assessment is anecdote-driven (per author 2026-04-23 evaluation, [MEDIUM] selection-bias concern).
- **Reversibility: high.** Remove this subsection in CLAUDE.md (and the AGENTS.md mirror) to revert Phase A. No file moves; no agent-spec changes; no canonical-state changes.

Phase B (top-N migration; 4 to 12 weeks) and Phase C (full sunset; 4 to 8 weeks) are FUTURE-CONDITIONAL on each phase's empirical exit gate. The plan is a SCAFFOLD for incremental decisions, not a commitment to full deprecation.

---

## Where to find things

Per the active-sync output's "Common workflow pointers" table; brief reference here:

| Need | Surface |
|---|---|
| Current canonical state at session start | `python3 scripts/claude-code-sync.py` |
| Comprehensive narrative memory (program purpose, two-track structure, current state) | `handoff/claude_web_project_memory.md` |
| Architecture specs (R1, A1, A2 upgrades; AD resolutions) | `handoff/architecture/*.md` |
| Active handoff prompts (R1.5.2, R1.7, etc.) | `handoff/r1_*_*.md` and `handoff/<workstream>_*_handoff.md` |
| Author-manual lane (SSRN uploads, journal submissions) | `handoff/author_instructions/` |
| Cross-tool coordination patterns | `.cursor/skills/cryptozach-multi-tool-handoff/SKILL.md` |
| Living-files discipline (header bumps, Session Changes blocks, em-dash exception) | `.cursor/skills/cryptozach-living-files/SKILL.md` |
| Status-tracking discipline (status-append pattern; pending-action lifecycle) | `.cursor/skills/cryptozach-status-tracking/SKILL.md` |
| Workflow cadence (no human-stamina scheduling heuristics) | `.cursor/skills/cryptozach-agent-workflow-cadence/SKILL.md` |
| Spec-execution discipline (halt-on-divergence; structured author-decision options) | `.cursor/skills/cryptozach-spec-execution/SKILL.md` |
| Editorial standards (zero em-dashes; banned terms; finding-first openers) | `docs/EDITORIAL_STANDARDS.md` |
| Docx surgery patterns | `.cursor/skills/cryptozach-docx-surgery-patterns/SKILL.md` |

---

## Output conventions

When producing files for this repo:

- **Working-tree paths:** the active working directory is `/Users/zach/ai-research/CryptoZach/` (canonical research repo plus cryptozach.com website hybrid). Paths in commit messages, handoff notes, and READMEs use repo-relative paths from this root (e.g., `research_content/papers/A5_svb_causal/PAPER.md`, not `/Users/zach/ai-research/CryptoZach/research_content/...`).
- **Handoff-back notes:** drop at `/tmp/<cycle>_handoff_back_to_cursor.md` per the established R1.5 / R1.5.1 pattern. Reference the path in your commit message body so Cursor can find it in the next session.
- **Working-output staging:** ephemeral conversion outputs and scratch files belong at `~/Downloads/` or `/tmp/`, not under `research_content/` or `docs/`. Promote to canonical paths only when the work is complete and authorized.
- **Commit messages:** use heredoc multi-line bodies for clarity (per `cryptozach-git-checkpoint` skill); prepend a one-line summary; include a per-cycle "Out of scope" section listing follow-on items; cross-reference prior commits by short SHA.
- **Build artifacts (.docx, .pdf, .html):** gitignored under `_build/` per AD-015 hybrid recommendation. Submission-of-record artifacts (the exact file sent to SSRN, Frontiers, regulations.gov) are committed at `research_content/<type>/<item>/submissions/<file>` per AD-015 hybrid policy.

---

## Common workflow patterns

### Standard handoff-prompt execution

When the author hands you a handoff prompt (`handoff/<workstream>_*_handoff.md`), the standard execution pattern is:

1. Run `python3 scripts/claude-code-sync.py` for current canonical state.
2. Read the handoff prompt in full (it is self-contained per `cryptozach-multi-tool-handoff` skill discipline).
3. Read the canonical inputs the handoff lists in its "Canonical inputs (read these first)" section.
4. Execute phase by phase per the handoff's "Spec" section.
5. Halt at any HALT-N condition the handoff defines; surface to the author with structured options.
6. Run the handoff's acceptance tests before commit.
7. Commit per the handoff's commit message template.
8. Drop the handoff-back note at `/tmp/<cycle>_handoff_back_to_cursor.md`.

### Canonical-state-aware merge (Pattern 16)

When applying memo or patch content to canonical state, always read the current canonical state first. Per Pattern 16 (canonical-aware merge), the source memo's proposed structure may differ from current canonical state; pick the current state's structure and merge content into it rather than reproducing the memo's structure verbatim. Halt and ask the author when the merge is non-obvious.

### Cited research backlog processing (recurring)

`research_content/cited_research/Uncategorized_Reading_Additions/` is the author's drop zone for new research PDFs. Process via `handoff/cited_research_processing_handoff.md` when:

- The author says "process the cited research backlog" or similar directive.
- The drop folder has accumulated 3 or more PDFs.
- Before a major publication cycle (paper submission, framework update) where cited references should be locked.
- Periodic agent-cadence run when no other work is queued.

Claude Code CLI is the preferred execution engine for batch runs (cost). Cursor handles one-off or interactive categorization. The handoff itself is tool-agnostic: same spec, same output format, same handoff-back-to-Cursor pattern for canonical-state propagation (READING_LIST.md, DATA_REGISTRY.md, KEY_FINDINGS.md, CROSS_REFERENCE_MAP.md updates).

### Model B: Sequential collaboration (Cursor specs, Claude Code executes)

For bulk-edit cycles where Cursor's spec-authoring discipline is justified but Cursor's per-edit token cost is not, Cursor may author a spec or script and route execution to Claude Code. Claude Code executes; Cursor reviews and/or commits per cycle risk profile.

**Scope:**

- **IN:** site file edits (root `papers/`, `index.html`, `resume/`, `frameworks/`, `overview/`, etc.); bulk text replacements across many files; pattern-based edits with explicit `(old, new)` tuples; cache-buster bumps; mechanical cleanups per audit findings; `_config.yml` / `sitemap.xml` / `robots.txt` mechanical updates per spec
- **OUT:** `docs/` canonical-state edits (DEC-069 unchanged); one-off surgical edits; new content authoring with iteration on intent; cycles requiring halt-on-divergence judgment mid-execution

**Pattern:** Cursor authors the spec (typically Python script with `(old, new)` tuples plus assertions); Claude Code executes; commit handling per spec instruction (Option A commit-and-push for clearly-scoped mechanical cycles; Option B stage-and-return-diff for cycles needing pre-commit author review).

**Adopted operationally 2026-04-22** per author authorization. No DEC entry filed. First proof-of-concept cycle: commit `66739cb` (site sweep findings cleanup; 22 files). See `cryptozach-multi-tool-handoff` skill "Cursor to Claude Code execution (Model B sequential collaboration)" section for full pattern, scope details, and execution prompt template.

### Status-append pattern (PROGRAM_STATE pending actions; KU resolutions; OL transitions)

Per `cryptozach-status-tracking` skill: when a pending action's trigger fires or a status changes, append a status line that preserves history rather than overwriting. Example:

```
- **Status (2026-04-22):** UNBLOCKED. KU-1 resolved (FRBNY rejected) per
  EC-2026-04-22-A1-FRBNY-Rejection-Unblock. Original "blocked on FRBNY
  decision" framing preserved above for audit-trail.
```

Do not overwrite the original status; append.

### Session Changes blocks (PROGRAM_STATE; KEY_FINDINGS; etc.)

Per `cryptozach-living-files` skill: append Session Changes blocks at the bottom of the canonical file with the format `## Session Changes (YYYY-MM-DD, <subject>)`. Each block summarizes one cycle's work in that file. Bumps to the file's `Last updated:` header (line 7 area) prepend the cycle summary to existing header content (do not overwrite).

---

## Lane handoff back to Cursor

When Claude Code work surfaces items that belong in Cursor's canonical-state lane:

1. Capture the item in `/tmp/<cycle>_handoff_back_to_cursor.md` with concrete spec (file path; what to add; cross-reference targets; verification steps).
2. Reference the handoff-back note in your commit message body.
3. Do not block on the Cursor-lane work; ship your in-scope deliverable.
4. Cursor will read the handoff-back note in the next session and apply per its standard cycle.

The `/tmp/` location intentionally puts the handoff-back outside the repo so it does not pollute the working tree. Cursor copies the relevant content into canonical files; the `/tmp/` file is ephemeral.

---

## When this file needs updating

This file documents Claude Code CLI session-start workflow. Update when:

- A new canonical session-start tool ships (e.g., a v2 of `claude-code-sync.py` with different invocation).
- A new hard constraint emerges (new author rule; new lane-discipline boundary; new editorial standard).
- A new common workflow pattern stabilizes (e.g., a new skill becomes a session-start essential).
- The hybrid-repo partition shifts (e.g., a new top-level directory is added with its own lane).

Last updated: 2026-04-22 (initial author; covers the 2026-04-22 ship of `scripts/claude-code-sync.py` v1 + R1 lane discipline per DEC-069 + em-dash rule + standard handoff execution pattern). Further updated 2026-04-22 (evening): Model B sequential collaboration section added under Common workflow patterns; documents the operational pattern of Cursor authoring specs and Claude Code executing for bulk site-file edits, with `docs/` remaining Cursor-only per DEC-069. Adopted operationally per author authorization; first proof-of-concept cycle is commit `66739cb`. See `cryptozach-multi-tool-handoff` skill for full pattern. Further updated 2026-04-23: Step 0 expanded into 0a (pre-flight git pull-before-work) plus 0b (active sync); new Multi-clone coordination section documents the two-clone setup (primary `/Users/zach/ai-research/CryptoZach/` with symlink `~/cryptozach`; working `/Users/zach/Tokenization_Systems_Website/`); `scripts/claude-code-sync.py` now emits a clone-identity line in its header so every session sees primary-vs-working clone at session start. Convention wraps existing filesystem reality (sync script was already clone-path-agnostic via `Path(__file__).resolve().parent.parent`); zero code-level breakage risk.
