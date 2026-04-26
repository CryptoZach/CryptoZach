# AGENTS.md: Shared agent instructions for this repo

This file is the entry point for any agent working in `/Users/zach/ai-research/CryptoZach/` that follows the `AGENTS.md` convention (Cursor IDE; Codex CLI; other agent tools). Anthropic's Claude Code CLI auto-loads `CLAUDE.md` separately; **the two files share the same content authority**. `CLAUDE.md` holds the canonical full instructions; this file is a pointer plus critical-constraints summary so tools that only read `AGENTS.md` still get the essential discipline.

If your tool reads `CLAUDE.md` directly, no further reading needed; both files describe the same lane, constraints, and patterns. If your tool reads this file but not `CLAUDE.md`, **read `CLAUDE.md` next** for full session-start workflow, output conventions, and standard handoff-execution pattern.

---

## Step 0: Active sync (any tool, any session)

Session-start sync has two parts: pull origin into your working clone, then read canonical state.

### Step 0a: Pre-flight git pull-before-work

```bash
git fetch origin
git status                       # check for "Your branch is behind 'origin/main'"
git pull --rebase origin main    # rebase if behind; skip if clean/ahead-only
```

Multi-clone coordination (two local clones; see CLAUDE.md for detail) produces frequent 1-to-8 commit gaps between local state and origin. Read-only fetch first; rebase if needed.

### Step 0b: Active sync

```bash
python3 scripts/claude-code-sync.py
```

Reads `docs/` at run time and emits a markdown snapshot covering: identity, lane reminder, hard constraints, timestamp; canonical-file freshness table for all 17 `docs/` files; SSRN publication snapshot; recent decisions (last 5 `DEC-NNN`); recent corrections (last 5 `EC-...`); critical KU; open OL; top PROGRAM_STATE pending actions; output conventions; common workflow pointers. Default approximately 165 lines / 11 KB. Read-only; safe to re-run between major task switches. The header includes a **clone identity** line so you see immediately which clone you are in. See `scripts/README.md` for full options table and caveats.

The script is named `claude-code-sync.py` because it was authored for Claude Code CLI's session-start flow, but it is a pure `docs/`-tree reader and runnable from any tool with shell access (Cursor, Codex CLI, etc.). Re-running across tools costs nothing and keeps every session aligned to current canonical state.

### Sync-state hotword

When the user message is `sync state`, `sync`, `/sync`, `/state`, or `refresh state` (case-insensitive, as the leading or sole directive), immediately:

1. Run `python3 scripts/claude-code-sync.py`.
2. Read the markdown snapshot output.
3. Confirm with one line: "Synced. <Last canonical update ISO date>; <N> open OL; <K> critical KU; <M> pending actions."
4. Continue with any remaining directive in the same message, or await further instruction.

The hotword exists so the author can refresh agent state without retyping the script invocation. Do not show the full snapshot to the user unless they ask; the one-line confirmation is the default. Treat the snapshot as authoritative for the rest of the turn.

---

## Multi-clone coordination (full detail in CLAUDE.md)

Two local clones exist on the author's machine:

- **Primary:** `/Users/zach/ai-research/CryptoZach/` (symlink: `/Users/zach/cryptozach`). Designated canonical clone.
- **Working:** `/Users/zach/Tokenization_Systems_Website/`. Parallel clone retained for site-deploy workflows.

Both share the same origin (`github.com/CryptoZach/CryptoZach`). Divergence between clones is common during multi-session work; Step 0a's pull-before-work pre-flight resolves it. Start new sessions in the primary clone: `cd ~/cryptozach && <your-tool>`. See `CLAUDE.md` Multi-clone coordination section for the full discipline.

---

## Multi-actor coordination (full detail in CLAUDE.md)

Multiple actors (author, Cursor sessions, Claude Code CLI sessions, linter passes) modify files in parallel. Step 0a's session-start fetch handles initial alignment, but parallel work continues mid-session.

**Mid-session fetch triggers:** re-fetch when (a) a system-reminder signals external file modification (`Note: <file> was modified, either by the user or by a linter`), (b) more than 15 minutes elapsed since last fetch and you are about to enter a substantive edit cycle in a high-velocity path (`.claude/`, `.cursor/`, `docs/`, `handoff/`, `research_content/papers/`, `research_content/letters/`), or (c) an Edit tool call fails with the "File has been modified since read" error.

**Pre-push recovery:** the pre-push hook blocks non-fast-forward pushes. Standard recovery: `git fetch origin` to confirm divergence; if working tree has parallel-session unstaged work, `git stash push -u -m "<short reason>"` first; `git pull --rebase origin main`; `git stash pop` (check conflicts); re-push. Do NOT force-push or `git reset --hard`. If rebase conflicts in code your cycle did not author, halt and surface to the author.

**Friction-cost expectations:** in high-velocity multi-actor cycles, naive cycle-time estimates underestimate by approximately 1.5x to 2x. Apply a friction multiplier when estimating.

See `CLAUDE.md` Multi-actor coordination section for full per-trigger detail and high-velocity-path enumeration.

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

### Session-start scope declaration

Every session (Cursor, Codex CLI, Claude Code, ad-hoc scripts) declares its role and write-scope at session start via `/tmp/session_role_<SESSION_PID>.txt`. For shells with persistent PID across commit invocations, use `$$` (the shell's own PID). For Claude Code CLI where each Bash tool call spawns a fresh shell, use Claude Code's PID (parent of the Bash tool call's shell; compute via `ps -o ppid= -p $$`). The distinction is load-bearing for Claude Code: a file named by the session-start shell's ephemeral PID is not in the pre-commit hook's ancestor walk path from subsequent commit-time shells. Session-start declaration templates per role (BULK-EXECUTOR, CANONICAL-WRITER, SITE-EDITOR, AUDIT-REVIEWER, AUTHOR-DIRECT) at `docs/AGENT_ROSTER.md` Section 3 (canonical surface; supersedes prior `handoff/multi_session_git_hooks_setup.md` Section 4.2 reference per Phase 2 deliverable 2.1 canonicalization 2026-04-25); helper script at `scripts/declare_session_scope.sh` handles the PID computation. Required for the pre-commit hook scope-check to pass. Canonical role-taxonomy spec, default scopes per role, carve-outs registry (CO-1 through CO-4 per DEC-108), mechanism selection policy, and AUDIT-REVIEWER read-only sentinel guardrails all at `docs/AGENT_ROSTER.md` (canonical 18th file).

### `git commit -a` and `git add -A` prohibition

Never use `git commit -a`, `git commit --all`, `git add -A`, or `git add .`. Stage only explicit paths via `git add <path>`. The shared-clone single-index architecture surfaced this failure mode in commit `0b3c90a` (the 2026-04-23 bundling incident). Elevated from spirit to hard constraint per Phase 1 of the synthesized agent-roles and living state structure plan.

### Pre-commit scope-check bypass

`ALLOW_CROSS_SCOPE_COMMIT=1` is for emergency or explicitly cross-scope commits. When used, the commit message body must include a line starting with `Pre-commit bypass:` explaining the cross-scope inclusion. Silent bypass is prohibited.

### Cursor deprecation (per DEC-111; effective 2026-04-25)

Cursor is deprecated as a canonical-state-writing tool per DEC-111; mirrors the same subsection in `CLAUDE.md`. Claude Code in CANONICAL-WRITER role handles all `docs/*.md` writes per AGENT_ROSTER Section 1.2 plus Section 2 plus Section 5 mechanism selection. State Manager specialization (per author 2026-04-25 framing) within CANONICAL-WRITER role for canonical-state-of-record work (DEC entries, role taxonomy updates, lane formalizations, observation ledger refactors). Phase A observation period (originally 2026-04-23 through ~2026-05-21) early-exit per DEC-111; observation ledger at `handoff/cursor_phased_reduction_observations.md` preserved as historical-of-record per audit-trail discipline. The 36 existing `.cursor/skills/` are retained as-is and accessible from Claude Code via `.claude/skills/` POSIX symlinks (per Phase 1 ship `a6a9d39`); future skill-authoring location TBD per author preference.

### Skill in-place update boundary (replaces retired Cursor-skills freeze per DEC-111; effective 2026-04-25; codified per SM-5)

Mirrors the same subsection in `CLAUDE.md` per CO-3 cross-tool parity requirement. Skills at `.claude/skills/cryptozach-*/SKILL.md` and `.cursor/skills/cryptozach-*/SKILL.md` (the latter POSIX-symlinked into the former per `a6a9d39`) follow the in-place-update-boundary rule:

- **In-place updates allowed.** Maintenance edits, content additions, and version bumps proceed normally without author authorization. Skill body content additions (new rules, new sections, new worked examples) are routine.
- **Refactoring more than 50% counts as freeze violation.** Refactoring that modifies more than 50% of an existing skill (line-count basis: lines added plus lines removed greater than half the original line count) requires author authorization. Borderline cases route to author for decision.
- **New skills require author authorization.** New `cryptozach-*/SKILL.md` files (in either `.claude/skills/` or `.cursor/skills/`) require explicit author approval before creation. Prevents skill proliferation; observe before codify.
- **Versioning required for substantive content additions.** Per `cryptozach-living-files` SKILL prepend discipline: skill body Last updated header bumps required for any substantive content addition.

**Why this rule matters post-Cursor-deprecation.** The original Cursor-skills freeze (Phase A; 2026-04-23 to ~2026-05-21; retired per DEC-111 early-exit 2026-04-25) was Cursor-specific framing for a generalizable principle: limit infrastructure proliferation; observe before codify; deliberate boundary on structural changes to skills. The principle persists post-deprecation; this rule codifies it for any-Claude-Code-skill regardless of `.cursor/` or `.claude/` directory.

**Reversibility: high.** Remove this subsection in AGENTS.md (and the CLAUDE.md mirror) to revert.

---

## Model B: Sequential collaboration (Cursor specs, executor tool runs)

For bulk-edit cycles where spec-authoring discipline is justified but per-edit token cost is not, Cursor may author a spec or script and route execution to a non-Cursor agent (typically Claude Code CLI). The executor runs the spec; commit handling per the cycle's risk profile (Option A commit-and-push directly; Option B stage-and-return diff for Cursor review).

**Scope:**

- **IN:** site file edits (root `papers/`, `index.html`, `resume/`, `frameworks/`, `overview/`); bulk text replacements; pattern-based edits with explicit `(old, new)` tuples; cache-buster bumps; mechanical cleanups per audit findings; `_config.yml` / `sitemap.xml` / `robots.txt` mechanical updates per spec.
- **OUT:** `docs/` canonical-state edits (DEC-069 unchanged); one-off surgical edits; new content authoring; cycles requiring halt-on-divergence judgment mid-execution.

**Adopted operationally 2026-04-22** per author authorization. No DEC entry filed. First proof-of-concept cycle: commit `66739cb`. See `.cursor/skills/cryptozach-multi-tool-handoff/SKILL.md` "Cursor to Claude Code execution (Model B sequential collaboration)" section for full pattern, scope details, and execution prompt template.

## Recurring workflow: cited research backlog processing

`research_content/cited_research/Uncategorized_Reading_Additions/` is the author's drop zone for new research PDFs. The author drops PDFs (optionally with sidecar `.notes.md` files); periodic processing categorizes and relocates them into `cited_research/tier_N/` or `cited_research/category_*/` subdirectories with METADATA.md.

Spec: `handoff/cited_research_processing_handoff.md`. Drop folder docs: `research_content/cited_research/Uncategorized_Reading_Additions/README.md`.

Claude Code CLI is the preferred execution engine for batch runs (cost). Cursor handles one-off or interactive categorization. Either tool reads the same handoff. Triggered by author directive ("process the cited research backlog"), accumulated drop count (3+ PDFs), or before a major publication cycle.

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

Last updated: 2026-04-25 (SM-5 State Manager session #5 per author 2026-04-25 architectural review surfacing in-place update boundary as item 3 in 6-item Cursor-deprecation transition at-risk list: new "Skill in-place update boundary" Critical constraint subsection added after Cursor deprecation subsection; mirrors CLAUDE.md edit per CO-3; replaces conceptual gap left by retired Cursor-skills freeze (Phase A) per DEC-111; applies to `.claude/skills/` AND `.cursor/skills/` (both via POSIX symlink per `a6a9d39`); preserves underlying principle of "limit infrastructure proliferation; observe before codify; 50% refactor threshold; new skills require author authorization." Earlier 2026-04-25 (SM-1 State Manager session #1 per author 2026-04-25 Cursor-deprecation directive: prior Phase A skills-freeze Critical constraints subsection retired and replaced with brief Cursor deprecation reference per DEC-111; mirrors CLAUDE.md edit per CO-3. DEC-111 supersedes DEC-069 writer-tool assignment; State Manager specialization within CANONICAL-WRITER role per AGENT_ROSTER Section 1.6. Earlier 2026-04-25 (CO-3 lockstep ref-update post-AGENT_ROSTER canonicalization (commit `2d91c56`): session-start scope declaration bullet rewritten to point at `docs/AGENT_ROSTER.md` Section 3 (templates) plus AGENT_ROSTER as the canonical surface for role taxonomy, default scopes, carve-outs registry CO-1 through CO-4 per DEC-108, mechanism selection policy, and AUDIT-REVIEWER guardrails. Prior references to `handoff/multi_session_git_hooks_setup.md` Section 4.2 and `handoff/agent_roles_and_living_state_plan_2026-04-23.md` retained as historical/secondary provenance; canonical surface is now AGENT_ROSTER per Phase 2 deliverable 2.1. CLAUDE.md mirror updated in lockstep per CO-3. Earlier 2026-04-24 (PID-pattern correction LFU application per `.cursor/tasks/Living_File_Updates_2026-04-24_0700_PID_Scope_Declaration_Fix.md`: session-start scope declaration bullet rewritten to distinguish `$$` (persistent-shell sessions) from `ps -o ppid= -p $$` Claude PID lookup (Claude Code ephemeral-shell sessions); references helper script `scripts/declare_session_scope.sh` and setup doc Section 4.2; mirror of CLAUDE.md correction. Earlier 2026-04-24 (Phase 1 execution of the synthesized agent-roles and living state structure plan; three new Critical constraints mirrored from CLAUDE.md: session-start scope declaration via the pattern now corrected in the LFU above; `git commit -a` and `git add -A` prohibition elevated from spirit to hard constraint; pre-commit scope-check bypass annotation rule. Companion infrastructure ships in the same commit: `.claude/skills/cryptozach-living-state-structure/SKILL.md` with `.cursor/skills/` POSIX symlink; `scripts/pre_commit_staging_check.py`; `handoff/multi_session_git_hooks_setup.md`. Retrospective replay against bundling commit `0b3c90a` validates the hook rejects the incident's staged state. Further updated 2026-04-22 (initial author; pairs with `CLAUDE.md` ship same date and `scripts/claude-code-sync.py` v1). Further updated 2026-04-22 (evening): Model B sequential collaboration section added; documents the operational pattern of Cursor authoring specs and a non-Cursor executor (typically Claude Code) running the spec for bulk site-file edits, with `docs/` remaining Cursor-only per DEC-069. Adopted operationally per author authorization; mirrors `CLAUDE.md` "Model B" subsection. See `.cursor/skills/cryptozach-multi-tool-handoff/SKILL.md` for full pattern. Further updated 2026-04-23: Step 0 expanded into 0a (pre-flight git pull-before-work) plus 0b (active sync); new Multi-clone coordination section documents the two-clone setup (primary `/Users/zach/ai-research/CryptoZach/` with symlink `~/cryptozach`; working `/Users/zach/Tokenization_Systems_Website/`); sync script emits a clone-identity line in its header. Mirrors `CLAUDE.md` updates. Further updated 2026-04-23 (evening): new Multi-actor coordination section between Multi-clone coordination and Critical constraints; condenses the full CLAUDE.md section to a 3-trigger summary (mid-session fetch triggers; pre-push recovery; friction-cost expectations). Captures the multi-actor coordination patterns observed during the site-sweep-auditor pass-3 validation cycle. Mirrors `CLAUDE.md` Multi-actor coordination section.
