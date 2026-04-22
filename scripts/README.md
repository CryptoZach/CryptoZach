# scripts/

Helper scripts for the CryptoZach research-program repo. Most are one-off
sprint tools; the canonical long-lived utilities are `audit_session.py` and
`claude-code-sync.py`.

---

## claude-code-sync.py (Claude Code CLI session-start sync; v1)

Prints a current-state snapshot of the research program for Claude Code CLI
to ingest at the start of every session in this repo. Replaces the need for
a paste-able project memory dump (Claude Code CLI has direct file access,
so the script reads the canonical files and emits a fresh snapshot every
run).

### Usage

```bash
python3 scripts/claude-code-sync.py                       # full snapshot to stdout
python3 scripts/claude-code-sync.py --terse               # 3 entries per section
python3 scripts/claude-code-sync.py --decisions 10        # tune per section
python3 scripts/claude-code-sync.py > /tmp/cc-sync.md     # write to file, then paste
```

Recommended session-start workflow inside a Claude Code CLI session:

```
> Run scripts/claude-code-sync.py and treat the output as your sync surface
> for this session. Read any canonical file you need to act on; do not
> write to docs/. Confirm you understand your lane before proceeding.
```

Claude Code CLI has shell access; it will execute the script and parse the
markdown output directly into context. Re-run between major task switches
to refresh.

### What it prints (in order)

1. Header: identity, lane reminder, hard constraints, timestamp
2. Canonical-file freshness table (Last-updated date per file, normalized to ISO)
3. SSRN publication snapshot (parsed from `PROGRAM_STATE.md`)
4. Recent decisions (last N `DEC-NNN` entries)
5. Recent corrections (last N `EC-YYYY-MM-DD-X` entries)
6. Critical known unknowns (KU entries under "Critical (Blocks Active Work)")
7. Open outreach (OL entries with non-Closed/FILED/Logged/Declined status)
8. Top pending actions (PROGRAM_STATE "Pending actions (open)" entries)
9. Output conventions (working-tree paths, handoff-memo location)
10. Common workflow pointers (skill files for Dune, surgery, handoff, etc.)
11. Comprehensive memory pointer (`handoff/claude_web_project_memory.md`)

Default output is ~165 lines / ~10.8 KB, well under typical context budgets.
`--terse` brings it to ~150 lines.

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--decisions N` | 5 | Last N `DEC-NNN` entries from `DECISION_LOG.md` |
| `--corrections N` | 5 | Last N `EC-...` entries from `ERROR_CORRECTION_LOG.md` |
| `--outreach N` | 12 | First N open `OL-NNN` entries from `OUTREACH_LOG.md` |
| `--pending N` | 8 | First N `### titles` under PROGRAM_STATE Pending actions |
| `--terse` | off | Sets all counts to 3 (5 for outreach and pending) |

Setting any count to `0` suppresses that section's entries (the section
header still prints with a "no entries" note).

### Caveats

- **"Recent" means file order, not strict chronological order.** The script
  takes the last N matches by file position. For DEC entries (sequential
  numbering) this matches chronological order; for EC entries (date-prefixed
  but appended in commit order) it approximates "most recently appended."
- **Outreach `_is_closed` heuristic.** Statuses containing "closed,"
  "declined," "filed," "logged," "complete," or "completed" are filtered out.
  Edge cases (e.g., a status that says "Closed loop reopened") may misclassify.
- **No commit-history awareness.** The freshness column reflects what the
  file's `Last updated:` line claims, not git mtime. A stale header with a
  recent commit is invisible to the script.
- **No write side effects.** The script reads `docs/` and prints to stdout;
  it does not modify any file. Safe to run from any tool, any time.

### When to update this script

- A new canonical file is added to `docs/`: append to `CANONICAL_FILES`.
- A canonical file's `Last updated:` format changes: update `parse_last_updated`.
- A new entry-prefix pattern appears (e.g., a future `CPA-NNN` for cross-paper
  author decisions): add a `get_recent_entries(... prefix="CPA")` call and a
  matching render function.
- A new skill or workflow becomes a session-start essential: add a row to
  the "Common workflow pointers" table in `render_conventions`.

Pair with `cryptozach-living-files` skill: when canonical files change shape,
this script may need to learn the new shape.

---

## audit_session.py (Cursor session transcript extractor; v1)

Retrospective extractor for Cursor agent session transcripts. Reads a session
JSONL from `~/.cursor/projects/Users-zach-ai-research-CryptoZach/agent-transcripts/`
and emits a per-turn summary showing:

1. What tools were invoked, in execution order
2. Which files were Read and whether the load was full vs snippet (with offset/limit)
3. Per-Read token estimate via tiktoken (cl100k_base, used as a Claude proxy)
4. Cumulative read-token total across the session

Optional `--diffs` flag adds StrReplace and Write diff bodies for forensic
review of what each turn produced.

### Why retrospective and not live?

Per the architecture conversation that produced this script: signal first,
automation second. The transcripts already capture every tool call with full
input parameters; this script is a pure read-side viewer with zero runtime
cost on the agent. To "turn off" the audit, simply do not run the script.

A live-hook alternative (Cursor `postToolUse` hook writing to a structured
log) was considered and explicitly deferred. Add only if retrospective use
proves the gap.

### Usage

```bash
python scripts/audit_session.py                 # latest session (mtime-based)
python scripts/audit_session.py <session-uuid>  # explicit session
python scripts/audit_session.py --latest        # latest session (explicit flag)
python scripts/audit_session.py --diffs         # add StrReplace/Write diff bodies
python scripts/audit_session.py --list          # list all sessions newest first
```

Recommended workflow:

```bash
python scripts/audit_session.py --list | head -10  # find the session you want
python scripts/audit_session.py <uuid>             # extract by UUID
```

### Setup (one-time)

The script needs tiktoken for token estimates. Install to a workspace-local
deps directory (gitignored):

```bash
mkdir -p scripts/.deps
pip3 install --target scripts/.deps tiktoken
```

The script auto-discovers tiktoken from these locations in order:
`scripts/.deps/`, `/tmp/tiktoken_pkgs/`, `~/.cursor/agent-tools/tiktoken_pkgs/`,
or any system-wide install. If none is found, the script still runs but token
columns show `tokens N/A`.

### Output anatomy

```
=== Session: <uuid>
=== Path:    /Users/zach/.cursor/projects/.../<uuid>.jsonl
=== Size:    4,173,079 bytes
=== Tokens:  cl100k_base

--- Turn 1 (user, 36,377 chars typed) ---
  > <user-typed query, with system-injected blocks stripped>

--- Turn 2 (assistant) ---
  Read    [FULL] .cursor/skills/cryptozach-spec-execution/SKILL.md  (~1,193 tok)
  Read    [FULL] .cursor/skills/cryptozach-living-files/SKILL.md  (~1,584 tok)
  Read    [SNIP] docs/PROGRAM_STATE.md offset=1 limit=120  (~4,296 tok)
  Shell   git status --short
  Edit    StrReplace docs/DECISION_LOG.md (-3/+18 lines)
  -> text 437c | reads ~7,073 tok | cumulative ~7,073 tok

=== End of session: 23 turns | cumulative read tokens ~9,469
```

Key fields:

| Token | Meaning |
|---|---|
| `[FULL]` | Read had no offset/limit; entire file loaded |
| `[SNIP]` | Read had offset/limit; partial load |
| `(~N tok)` | tiktoken estimate for what was loaded; computed from current disk state plus offset/limit |
| `[file gone]` | File referenced in transcript no longer exists; tokens reported as 0 |
| `cumulative ~N tok` | Running sum of read tokens across all assistant turns so far |

### Caveats

- **Token estimates are approximate.** The transcript captures the agent's
  intent (`Read path X with offset/limit Y`) but not the actual content
  returned. The script re-reads the file from disk and applies offset/limit
  to estimate. If the file has been edited since the original Read, the
  number drifts.
- **`--latest` is mtime-based.** Reading or grepping a transcript bumps its
  mtime on macOS, which can promote an old session above the active one.
  Prefer `--list` then explicit UUID for the truly active session, or check
  the bottom-of-status indicator in Cursor for the current session ID.
- **Skill descriptions injected at session start are not in the transcript.**
  Only when the agent actually `Read`s a `SKILL.md` does it appear in the
  audit. The system-prompt skill catalog is implicit.
- **No tool_result bodies in the transcript.** Cursor logs the assistant's
  tool_use blocks but not the tool returns. This is why token estimates use
  the disk-and-reapply approach.
- **Subagents.** Parent transcripts log `Task` invocations; subagent tool
  calls live under `subagents/` in the same session directory. v1 does not
  walk subagent transcripts; the `Task` line in the parent shows that a
  subagent ran without itemizing what the subagent did.

### v2 candidates

Tracked here so future sessions can revisit. Add only when retrospective use
of v1 surfaces the need.

- **`--summary` flag** for session-level aggregates: same-file re-read counts
  (Pattern: stale-context recovery vs intentional re-verification), per-tool
  invocation counts, distinct-tool count per turn, distinct-file count per
  session.
- **Session-start skill inventory preamble.** Glob `.cursor/skills/**/SKILL.md`
  and `~/.claude/skills/**/SKILL.md` at session-start time, list available
  skills, then mark which were actually `Read` during the session. Surfaces
  "skill X was available but never consulted".
- **Subagent transcript walking.** Recurse into `subagents/` per-session and
  inline subagent tool calls under their parent `Task` line.
- **--json output** for downstream tooling.
- **Fix for Grep patterns containing literal double quotes.** Currently
  produces ugly `""...""` rendering. Cosmetic.

---

## Other scripts (one-off; not maintained as long-lived utilities)

| Script | Purpose |
|---|---|
| `build-matrix-icons.mjs` | Builds homepage matrix icon sprite. See `cryptozach-matrix-icons` skill. |
| `check-responsive.js` | Local responsive audit. |
| `clone-site-backup.sh` | Clones the site repo for backup. |
| `gen-hyperliquid-webp.mjs` | Generates Hyperliquid webp asset. |
| `generate-sprint4-images.py` | Sprint 4 image generation. |
| `install-pre-push-hook.sh` | Installs the pre-push git hook. |
| `migrate_email_domain.py` | Email domain migration sweep. |
| `pre-push-hook.sh` | Body of the pre-push git hook. See `cryptozach-pre-push` skill. |
| `push-to-github.sh` | Convenience wrapper for safe site push. |
| `remove-meshnet-website-files.sh` | Cleanup script. |
| `safe-push-site.sh` | Safe push with checks. See `cryptozach-git-checkpoint` skill. |
| `serve-debug.js` | Local debug server. See `cryptozach-local-preview` skill. |
| `sprint5-link-rewrite.py` | Sprint 5 link rewrite (gitignored as one-off). |
