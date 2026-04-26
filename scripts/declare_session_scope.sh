#!/usr/bin/env bash
#
# scripts/declare_session_scope.sh
#
# Session-start helper: declare Claude Code session scope for the pre-commit
# staging-scope hook (scripts/pre_commit_staging_check.py).
#
# Usage (MUST be sourced, not executed):
#
#   source scripts/declare_session_scope.sh <role>
#   . scripts/declare_session_scope.sh <role>
#
# Example:
#
#   source scripts/declare_session_scope.sh BULK-EXECUTOR
#
# Role must be one of:
#   BULK-EXECUTOR    research execution; data pipelines; handoff; agent authoring
#   CANONICAL-WRITER docs/ canonical writer (Cursor lane primarily)
#   SITE-EDITOR      site HTML/CSS/JS; deploy infrastructure
#   AUDIT-REVIEWER   read-only audit; handoff reports only
#   AUTHOR-DIRECT    author-manual edits; typically uses ALLOW_CROSS_SCOPE_COMMIT=1
#
# Writes /tmp/session_role_<CLAUDE_PID>.txt with the role's default writes-allowed
# scope per handoff/multi_session_git_hooks_setup.md Section 4.1. The hook's
# ancestor-PID walk finds this file from every subsequent Bash tool call's
# git commit, so no SESSION_ROLE_FILE env-var prefix is required on commits.
#
# Must be SOURCED (not executed):
#
#   Execute: $$ is the script's own shell PID; ps -o ppid= -p $$ returns the
#   invoking shell (B), not Claude (C). Scope file would be named B (ephemeral);
#   hook's walk starts at B (ephemeral already-exited) and fails.
#
#   Source: $$ is the invoking shell's PID (B); ps -o ppid= -p $$ returns B's
#   parent = Claude (C). Scope file named /tmp/session_role_<C>.txt. Hook's
#   walk from git -> bash -> Claude finds it at depth 2-3.
#
# If the session's scope is narrower than the role default (recommended for
# principle-of-least-privilege), rewrite the scope: line in the file after
# this script runs. The hook requires the declared scope to be a subset of
# the role's writes-allowed list, not a superset (Phase 2 deliverable 6.4
# will enforce the subset check at the hook level; pre-Phase-2 it is a
# discipline constraint per handoff/multi_session_git_hooks_setup.md Section 4.1.1).

# Prevent execution; require source.
# When sourced: ${BASH_SOURCE[0]} != $0 (differ by the source). When executed
# (even with bash directly): they are equal.
if [ "${BASH_SOURCE[0]:-}" = "$0" ]; then
    echo "[declare-session-scope] ERROR: this script must be sourced, not executed." >&2
    echo "[declare-session-scope] Use: source scripts/declare_session_scope.sh <role>" >&2
    exit 1
fi

if [ -z "${1:-}" ]; then
    echo "[declare-session-scope] Usage: source scripts/declare_session_scope.sh <role>" >&2
    echo "[declare-session-scope] Role: BULK-EXECUTOR | CANONICAL-WRITER | SITE-EDITOR | AUDIT-REVIEWER | AUTHOR-DIRECT" >&2
    return 1
fi

ROLE="$1"

# Compute Claude Code's PID. $$ in a sourced script is the invoking shell's PID.
# ps -o ppid= -p $$ returns the parent of the invoking shell, which for a
# Claude Code Bash tool call is Claude Code itself.
CLAUDE_PID=$(ps -o ppid= -p $$ | tr -d ' ')

if [ -z "$CLAUDE_PID" ] || [ "$CLAUDE_PID" = "1" ]; then
    echo "[declare-session-scope] ERROR: could not determine Claude Code PID via 'ps -o ppid= -p $$'." >&2
    echo "[declare-session-scope] Fallback to SESSION_ROLE_FILE env-var pattern per setup doc Section 4.2." >&2
    return 1
fi

SCOPE_FILE="/tmp/session_role_${CLAUDE_PID}.txt"

# Role-default writes-allowed scope per handoff/multi_session_git_hooks_setup.md Section 4.1.
# These are full role defaults; sessions may rewrite the scope: line in the file
# for a narrower subset (recommended) after this script runs.
case "$ROLE" in
    BULK-EXECUTOR)
        SCOPE="research_content/ + handoff/ + .cursor/tasks/ + tools/ + scripts/ + .claude/agents/ + .claude/skills/"
        ;;
    CANONICAL-WRITER)
        # Default scope expanded 2026-04-25 per DEC-114 to include handoff/architecture/
        # (architecture-doc subtree functionally canonical-state-of-record at different
        # filesystem location). See docs/AGENT_ROSTER.md Section 2 + docs/DECISION_LOG.md DEC-114.
        SCOPE="docs/ + .cursor/skills/ + .cursor/rules/ + .cursor/tasks/ + handoff/architecture/"
        ;;
    SITE-EDITOR)
        # 26-entry template per 2026-04-24 expansion (commit 5aacf23) post-315187d incident.
        SCOPE="papers/ + research/ + overview/ + frameworks/ + letters/ + resume/ + resumes/ + contact/ + speaker-and-advisory/ + index.html + 404.html + _config.yml + sitemap.xml + styles.css + script.js + assets/ + icons/ + Publication-Images/ + scripts/inline-critical-css.mjs + scripts/bump-cache-buster.py + .github/ + package.json + package-lock.json + Gemfile + purgecss.config.cjs + .gitignore"
        ;;
    AUDIT-REVIEWER)
        # AUDIT-REVIEWER is read-only by role design per AGENT_ROSTER Section 7
        # (canonical: docs/AGENT_ROSTER.md once canonicalization cycle ships;
        # source intent: handoff/agent_roster_draft_2026-04-24.md Section 2 plus 7).
        # Write paths require same-lane re-declaration to BULK-EXECUTOR.
        # Earlier provisional value of "handoff/" updated to empty in commit
        # 01f9a16's hook-impl follow-on per AD-AGENT-3 alignment.
        SCOPE=""
        echo "[declare-session-scope] WARNING: AUDIT-REVIEWER role is read-only by role design per AGENT_ROSTER Section 7." >&2
        echo "[declare-session-scope] All commits will require either:" >&2
        echo "[declare-session-scope]   (a) Same-lane re-declaration to BULK-EXECUTOR (own handoff/ or .cursor/tasks/ memo committing)" >&2
        echo "[declare-session-scope]   (b) ALLOW_CROSS_SCOPE_COMMIT=1 bypass plus 'Pre-commit bypass:' annotation" >&2
        echo "[declare-session-scope]   (c) SESSION_ROLE_FILE override pointing at a custom scope declaration" >&2
        ;;
    AUTHOR-DIRECT)
        # AUTHOR-DIRECT is a terminal role; typically uses ALLOW_CROSS_SCOPE_COMMIT=1 bypass.
        # Declaring an empty scope forces the bypass path for every commit, which is intended.
        SCOPE=""
        echo "[declare-session-scope] WARNING: AUTHOR-DIRECT role typically uses ALLOW_CROSS_SCOPE_COMMIT=1 bypass for commits." >&2
        echo "[declare-session-scope] Empty scope declared; all commits will require bypass + 'Pre-commit bypass:' annotation." >&2
        ;;
    *)
        echo "[declare-session-scope] ERROR: unknown role '$ROLE'." >&2
        echo "[declare-session-scope] Valid roles: BULK-EXECUTOR | CANONICAL-WRITER | SITE-EDITOR | AUDIT-REVIEWER | AUTHOR-DIRECT" >&2
        return 1
        ;;
esac

# pwd here is the shell's CWD when the script was sourced (typically the repo root).
CLONE=$(pwd)

cat > "$SCOPE_FILE" <<EOF
role: $ROLE
clone: $CLONE
scope: $SCOPE
session_start: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "[declare-session-scope] Scope file written: $SCOPE_FILE"
echo "[declare-session-scope] Role:       $ROLE"
echo "[declare-session-scope] Claude PID: $CLAUDE_PID"
echo "[declare-session-scope] Clone:      $CLONE"
echo "[declare-session-scope] Scope line: $SCOPE"
echo "[declare-session-scope] To narrow scope, edit the scope: line in $SCOPE_FILE directly."
