# scripts/

Helper scripts for the CryptoZach research-program repo. Most are one-off
sprint tools; the canonical long-lived utility is `audit_session.py`.

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
