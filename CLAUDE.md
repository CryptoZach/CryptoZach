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

## Multi-actor coordination

This repo runs at high velocity with multiple actors making changes in parallel: the author, Cursor sessions, Claude Code CLI sessions, and occasional linter passes. Step 0a's session-start fetch handles the initial alignment, but parallel work continues mid-session and produces external file modifications visible only after they happen. The discipline below codifies the recurring patterns observed during the site-sweep-auditor pass-3 validation cycle (3+ external touches in a single 30-minute cycle).

### Mid-session fetch triggers

Re-fetch origin during a session (not just at Step 0a) when any of the following holds:

- A system-reminder appears with the form `Note: <file> was modified, either by the user or by a linter.` This is the explicit signal that an external actor touched a file you are about to edit. Re-fetch immediately, then re-read the file before continuing the edit cycle.
- More than 15 minutes have passed since the last `git fetch` AND you are about to begin a substantive edit cycle in a high-velocity path (see High-velocity paths below).
- An Edit tool call fails with `File has been modified since read, either by the user or by a linter.` This is the post-hoc signal that drift happened during your prep. Re-read the file (the harness invalidates the cached read state); re-fetch before retrying so subsequent edits land on current state.

### Pre-push expectations and recovery

The pre-push git hook in this repo blocks non-fast-forward pushes (force-push is also blocked unless explicitly overridden via `ALLOW_FORCE_PUSH_ORIGIN=1`). Expect rejection in high-velocity cycles; standard recovery when push is rejected:

1. `git fetch origin` (read-only confirmation of divergence).
2. If working tree is dirty with parallel-session unstaged work that is NOT yours, `git stash push -u -m "<short reason for traceability>"` first.
3. `git pull --rebase origin main`.
4. `git stash pop` (if step 2 ran; check for conflicts and resolve only conflicts in YOUR rebased commits, not in the stashed parallel work).
5. Re-push.

Do NOT force-push to recover. Do NOT `git reset --hard` or otherwise discard the parallel work. If the rebase produces conflicts in code your cycle did not author, halt and surface to the author rather than resolving unilaterally.

### High-velocity paths

Paths where multi-actor changes recur frequently and where the mid-session fetch trigger applies:

- `.claude/agents/*.md`: agent-spec evolution cycles (validate-find-fix pattern; pass 1, 2, 3 precedent).
- `.cursor/skills/cryptozach-*/SKILL.md`: skill maintenance (in-place updates allowed; future skill-authoring location TBD per Cursor deprecation per DEC-111).
- `.cursor/tasks/`: Cursor task drops and Living_File_Updates memos.
- `docs/*.md`: Cursor canonical writes (DEC-069 lane).
- `handoff/`: cycle-spanning architecture specs, validation reports, and active handoff prompts.
- `research_content/papers/*/`, `research_content/letters/*/`: active manuscript and letter cycles.

Lower-velocity paths (rarely touched by parallel actors): `assets/`, `icons/`, `ink-brand-kit/`, `tools/canonical-state/`, `_build/`, root-level `.html` files (unless a Model B site cycle is in progress).

### Friction-cost expectations

In high-velocity multi-actor cycles, naive cycle-time estimates underestimate by approximately 1.5x to 2x. Friction sources include: re-fetching after external file touches; re-reading files after Edit tool failures; rebasing on push rejection; stashing and restoring parallel work. Apply a friction multiplier when estimating cycle time so the author has accurate expectations. A naive "10 minute" estimate in `.claude/agents/`, `docs/`, or `handoff/` is more accurately a 15-25 minute estimate during active multi-actor periods.

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

### Session-start scope declaration

Every Claude Code session declares its role and write-scope at session start via `/tmp/session_role_<CLAUDE_PID>.txt`, where `<CLAUDE_PID>` is Claude Code's own PID (not the current shell's `$$`). The distinction is load-bearing: each Bash tool call spawns a fresh shell with a different `$$`, and a scope file named by the session-start shell's PID is not in the pre-commit hook's ancestor-PID walk path from subsequent commit-time shells. Claude's PID is stable across Bash tool calls and always appears in the hook's ancestor chain (hook to git to bash to Claude to terminal). Compute Claude's PID via `ps -o ppid= -p $$` inside a Bash tool call. Canonical boilerplate and helper script (`scripts/declare_session_scope.sh`); session-start declaration templates per role (BULK-EXECUTOR, CANONICAL-WRITER, SITE-EDITOR, AUDIT-REVIEWER, AUTHOR-DIRECT) at `docs/AGENT_ROSTER.md` Section 3 (canonical surface; supersedes prior `handoff/multi_session_git_hooks_setup.md` Section 4.2 reference per Phase 2 deliverable 2.1 canonicalization 2026-04-25). Required for the pre-commit hook scope-check to pass; sessions that skip this step hit a hard-fail rejection on first commit. Emergency fallback via `SESSION_ROLE_FILE=<path>` env-var override. Canonical role-taxonomy spec, default scopes per role, carve-outs registry (CO-1 through CO-4 per DEC-108), mechanism selection policy, and AUDIT-REVIEWER read-only sentinel guardrails all at `docs/AGENT_ROSTER.md` (canonical 18th file).

### `git commit -a` and `git add -A` prohibition

Never use `git commit -a`, `git commit --all`, `git add -A`, or `git add .`. Stage only explicit paths via `git add <path>`. The shared-clone single-index architecture surfaced this failure mode in commit `0b3c90a` (the 2026-04-23 bundling incident, where 17 parallel-session-authored files shipped under a styles.css commit message). Elevated from spirit to hard constraint per Phase 1 of the synthesized agent-roles and living state structure plan.

### Pre-commit scope-check bypass

`ALLOW_CROSS_SCOPE_COMMIT=1` is for emergency or explicitly cross-scope commits. When used, the commit message body must include a line starting with `Pre-commit bypass:` explaining the cross-scope inclusion. Silent bypass is prohibited. The annotation is the audit trail that preserves `0b3c90a`-class failure detection; without it, the bypass regresses to the pre-hook regime where bundling could ship unnoticed.

### Cursor deprecation (per DEC-111; effective 2026-04-25)

Cursor is deprecated as a canonical-state-writing tool per DEC-111. Claude Code in CANONICAL-WRITER role handles all `docs/*.md` writes per AGENT_ROSTER Section 1.2 plus Section 2 plus Section 5 mechanism selection. State Manager specialization (per author 2026-04-25 framing) within CANONICAL-WRITER role for canonical-state-of-record work (DEC entries, role taxonomy updates, lane formalizations, observation ledger refactors). Phase A observation period (originally 2026-04-23 through ~2026-05-21) early-exit per DEC-111; observation ledger at `handoff/cursor_phased_reduction_observations.md` preserved as historical-of-record per audit-trail discipline. The 36 existing `.cursor/skills/` are retained as-is and accessible from Claude Code via `.claude/skills/` POSIX symlinks (per Phase 1 ship `a6a9d39`); future skill-authoring location TBD per author preference.

### Skill in-place update boundary (replaces retired Cursor-skills freeze per DEC-111; effective 2026-04-25; codified per SM-5)

Skills at `.claude/skills/cryptozach-*/SKILL.md` and `.cursor/skills/cryptozach-*/SKILL.md` (the latter POSIX-symlinked into the former per `a6a9d39`) follow the in-place-update-boundary rule:

- **In-place updates allowed.** Maintenance edits, content additions, and version bumps proceed normally without author authorization. Skill body content additions (new rules, new sections, new worked examples) are routine.
- **Refactoring more than 50% counts as freeze violation.** Refactoring that modifies more than 50% of an existing skill (line-count basis: lines added plus lines removed greater than half the original line count) requires author authorization. Borderline cases route to author for decision.
- **New skills require author authorization.** New `cryptozach-*/SKILL.md` files (in either `.claude/skills/` or `.cursor/skills/`) require explicit author approval before creation. Prevents skill proliferation; observe before codify.
- **Versioning required for substantive content additions.** Per `cryptozach-living-files` SKILL prepend discipline: skill body Last updated header bumps required for any substantive content addition.

**Why this rule matters post-Cursor-deprecation.** The original Cursor-skills freeze (Phase A; 2026-04-23 to ~2026-05-21; retired per DEC-111 early-exit 2026-04-25) was Cursor-specific framing for a generalizable principle: limit infrastructure proliferation; observe before codify; deliberate boundary on structural changes to skills. The principle persists post-deprecation; this rule codifies it for any-Claude-Code-skill regardless of `.cursor/` or `.claude/` directory.

**Reversibility: high.** Remove this subsection in CLAUDE.md (and the AGENTS.md mirror) to revert.

### Observation ledger logging discipline (post-DEC-111; effective 2026-04-25; codified per SM-6)

Per the post-DEC-111 architecture: `handoff/cursor_phased_reduction_observations.md` continues as ongoing discipline-miss tracking ledger (per SM-1 spec; structural framework persists). The Cursor-skills freeze subsection that previously codified the logging discipline was retired per DEC-111; this subsection re-codifies the rule for ongoing post-deprecation tracking.

- **Rule:** every commit modifying 3+ canonical-state files (`docs/*.md`) MUST add a row to one of the observation ledger tables (Catches with Attribution column; Null cycles; Reproducibility signals) within 24 hours of the substantive commit. Whichever session ships the original work owns the ledger update. Trivial cycles (one-line typo fixes; cache-buster bumps; pure formatting) do not require rows.
- **Why:** without enforced logging discipline, the ledger goes stale and ongoing discipline-miss tracking reverts to anecdote-driven (the exact failure mode the original Phase A two-table structure was designed to prevent per Enhancement #1; preserved as ongoing discipline post-deprecation per audit-trail-discipline rationale in DEC-111).
- **Attribution column values:** CURSOR-HISTORICAL (frozen; pre-DEC-111 catches; do not add new); HOOK (catches by `scripts/pre_commit_staging_check.py` and `scripts/commit_msg_bypass_annotation_check.py`); DISCIPLINE-SELF (Claude Code session caught its own miss via skill discipline); AGENT (subagent caught miss in parent's work). Additional values can be added as observed.
- **Hook warning surface:** the pre-commit hook surfaces a stderr suggestion when `count(staged docs/*.md) >= 3` reminding the operator about subagent verification per AGENT_ROSTER Section 12.3 plus ledger logging discipline; warn-only, non-blocking. Codified per SM-6 hook warning extension at `scripts/pre_commit_staging_check.py`.
- **Reversibility:** high. Remove this subsection in CLAUDE.md (and the AGENTS.md mirror) to revert to discipline-only enforcement.

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

Last updated: 2026-04-25 (SM-6 State Manager session #6 per author 2026-04-25 evaluation surfacing 6 operational gaps in Cursor-deprecation transition plus audit-methodology codification per Option 3 author-concurrence: new "Observation ledger logging discipline (post-DEC-111)" subsection added at end of Hard constraints area codifying the MUST-add-a-row rule for ongoing discipline-miss tracking (Pre-DEC-111 rule was inside the retired Cursor-skills freeze subsection; SM-1 retired the subsection without preserving the rule; SM-6 re-codifies for ongoing post-deprecation tracking). Rule scoped to commits modifying 3+ docs/*.md files; trivial cycles excluded; Attribution column values enumerated (CURSOR-HISTORICAL frozen; HOOK from pre-commit + commit-msg hooks; DISCIPLINE-SELF from session-self-catch via skill discipline; AGENT from subagent-catch); hook warning surface (count(staged docs/*.md) >= 3) cited per same-cycle SM-6 hook extension. AGENTS.md mirror updated in lockstep per CO-3. Reversibility high. Earlier 2026-04-25 (SM-5 State Manager session #5 per author 2026-04-25 architectural review surfacing in-place update boundary as item 3 in 6-item Cursor-deprecation transition at-risk list: new "Skill in-place update boundary" Hard constraint subsection added after Cursor deprecation subsection; replaces conceptual gap left by retired Cursor-skills freeze (Phase A) per DEC-111; applies to `.claude/skills/` AND `.cursor/skills/` (both via POSIX symlink per `a6a9d39`); preserves underlying principle of "limit infrastructure proliferation; observe before codify; 50% refactor threshold; new skills require author authorization." AGENTS.md mirror updated in lockstep per CO-3. Earlier 2026-04-25 (SM-1 State Manager session #1 per author 2026-04-25 Cursor-deprecation directive: prior Phase A skills-freeze Hard constraints subsection retired and replaced with brief Cursor deprecation reference per DEC-111; high-velocity-paths bullet on `.cursor/skills/cryptozach-*/SKILL.md` updated to cite DEC-111 instead of the now-retired Phase A framing. AGENTS.md mirror updated in lockstep per CO-3. DEC-111 supersedes DEC-069 writer-tool assignment; State Manager specialization within CANONICAL-WRITER role per AGENT_ROSTER Section 1.6. Earlier 2026-04-25 (CO-3 lockstep ref-update post-AGENT_ROSTER canonicalization (commit `2d91c56`): session-start scope declaration bullet rewritten to point at `docs/AGENT_ROSTER.md` Section 3 (templates) plus AGENT_ROSTER as the canonical surface for role taxonomy, default scopes, carve-outs registry CO-1 through CO-4 per DEC-108, mechanism selection policy, and AUDIT-REVIEWER guardrails. Prior references to `handoff/multi_session_git_hooks_setup.md` Section 4.2 and `handoff/agent_roles_and_living_state_plan_2026-04-23.md` retained as historical/secondary provenance; canonical surface is now AGENT_ROSTER per Phase 2 deliverable 2.1. AGENTS.md mirror updated in lockstep per CO-3. Earlier 2026-04-24 (PID-pattern correction LFU application per `.cursor/tasks/Living_File_Updates_2026-04-24_0700_PID_Scope_Declaration_Fix.md`: session-start scope declaration bullet rewritten to clarify `/tmp/session_role_<CLAUDE_PID>.txt` primary pattern (compute via `ps -o ppid= -p $$`) plus `SESSION_ROLE_FILE=<path>` env-var emergency fallback; references helper script `scripts/declare_session_scope.sh` and setup doc Section 4.2; rationale per shared-clone shell-spawn semantics surfaced by 2026-04-24 commit `315187d` bundling-incident investigation. Earlier 2026-04-24 (Phase 1 execution of the synthesized agent-roles and living state structure plan; three new Hard constraints added: session-start scope declaration via the pattern now corrected in the LFU above; `git commit -a` and `git add -A` prohibition elevated from spirit to hard constraint; pre-commit scope-check bypass annotation rule. Companion infrastructure: new consolidation skill `.claude/skills/cryptozach-living-state-structure/SKILL.md` with `.cursor/skills/` POSIX symlink; new pre-commit hook script `scripts/pre_commit_staging_check.py`; new setup doc `handoff/multi_session_git_hooks_setup.md` (handoff-first per two-stage promotion to `docs/setup/` in Phase 2). Retrospective replay against bundling commit `0b3c90a` validates the hook rejects the incident's staged state. AGENTS.md mirror updated in lockstep. Further updated 2026-04-22 (initial author; covers the 2026-04-22 ship of `scripts/claude-code-sync.py` v1 + R1 lane discipline per DEC-069 + em-dash rule + standard handoff execution pattern). Further updated 2026-04-22 (evening): Model B sequential collaboration section added under Common workflow patterns; documents the operational pattern of Cursor authoring specs and Claude Code executing for bulk site-file edits, with `docs/` remaining Cursor-only per DEC-069. Adopted operationally per author authorization; first proof-of-concept cycle is commit `66739cb`. See `cryptozach-multi-tool-handoff` skill for full pattern. Further updated 2026-04-23: Step 0 expanded into 0a (pre-flight git pull-before-work) plus 0b (active sync); new Multi-clone coordination section documents the two-clone setup (primary `/Users/zach/ai-research/CryptoZach/` with symlink `~/cryptozach`; working `/Users/zach/Tokenization_Systems_Website/`); `scripts/claude-code-sync.py` now emits a clone-identity line in its header so every session sees primary-vs-working clone at session start. Convention wraps existing filesystem reality (sync script was already clone-path-agnostic via `Path(__file__).resolve().parent.parent`); zero code-level breakage risk. Further updated 2026-04-23 (evening): new Multi-actor coordination section between Multi-clone coordination and Hard constraints; documents mid-session fetch triggers (system-reminder-driven; time-based; Edit-failure-driven), pre-push expectations and recovery (stash to rebase to pop pattern), high-velocity paths enumeration, and friction-cost expectations (1.5x to 2x multiplier). Captures the multi-actor coordination patterns that surfaced 3+ times during the site-sweep-auditor pass-3 validation cycle (`handoff/site_sweep_auditor_validation_2026-04-23.md`). AGENTS.md mirror updated in lockstep.
