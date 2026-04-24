#!/usr/bin/env python3
"""
pre_commit_staging_check.py

Pre-commit staging-scope check for the CryptoZach repo's multi-session shared-clone setup.

Reads a session scope declaration at /tmp/session_role_<pid>.txt, compares the
set of staged paths (git diff --cached --name-only) against the declared scope
prefixes, and rejects the commit (exit 1) if any staged file is outside scope.

Rationale: the 2026-04-23 bundling incident (commit 0b3c90a) shipped 17 parallel-
session-authored files under a styles.css commit message because the shared git
index in /Users/zach/ai-research/CryptoZach/ has no structural isolation between
concurrent Claude Code + Cursor sessions. This script is the tier-(c)
infrastructure-enforced fix per Phase 1 of the agent-roles and living state
structure plan (handoff/agent_roles_and_living_state_plan_2026-04-23.md).

Spec sources:
  - handoff/agent_roles_and_living_state_plan_2026-04-23.md Phase 1 Component 2
  - handoff/multi_session_coordination_plan_2026-04-24.md Part B
  - handoff/phase_1_execution_prompt_2026-04-24.md section 5.2

Session scope file format (authored at session start):

    role: BULK-EXECUTOR
    clone: /Users/zach/ai-research/CryptoZach/
    scope: .claude/skills/ + scripts/ + handoff/ + .cursor/tasks/
    session_start: 2026-04-24T05:09:41Z

The scope line is a " + "-delimited list of path prefixes. Staged files are
checked via prefix match; a staged file is in scope iff it starts with at least
one declared prefix.

Locating the session file at commit time:

  1. If SESSION_ROLE_FILE env var is set, use that path (explicit override).
  2. Otherwise, walk the process ancestry starting from os.getppid() and try
     /tmp/session_role_<pid>.txt at each ancestor pid until a match is found
     (depth-limited; git's pre-commit fork chain puts the shell pid N levels up).
  3. If no scope file is found, hard-fail with guidance per spec-detail #1.

Bypass:

  ALLOW_CROSS_SCOPE_COMMIT=1 git commit -m "..."

The commit message body must include a line starting with 'Pre-commit bypass:'
explaining the cross-scope inclusion. That annotation requirement is enforced at
the commit-message-hygiene level by CLAUDE.md Hard constraints; this script
only honors the env var and prints the reminder.

Exit codes:
  0: staged files all in declared scope (or bypass active)
  1: staged files out of scope and no bypass; commit rejected

Python 3 standard library only. Target runtime: <2 seconds.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path
from typing import List, Optional, Set


SCOPE_FILE_PREFIX = "/tmp/session_role_"
SCOPE_FILE_SUFFIX = ".txt"
MAX_ANCESTOR_DEPTH = 10  # guard against infinite walk on unusual process trees
BYPASS_ENV_VAR = "ALLOW_CROSS_SCOPE_COMMIT"
EXPLICIT_SCOPE_FILE_ENV_VAR = "SESSION_ROLE_FILE"


def parent_pid(pid: int) -> Optional[int]:
    """Return the parent pid of `pid`, or None if unavailable."""
    try:
        result = subprocess.run(
            ["ps", "-o", "ppid=", "-p", str(pid)],
            capture_output=True,
            text=True,
            timeout=2,
        )
        if result.returncode != 0:
            return None
        ppid_str = result.stdout.strip()
        return int(ppid_str) if ppid_str else None
    except (subprocess.TimeoutExpired, ValueError, FileNotFoundError):
        return None


def find_scope_file() -> Optional[Path]:
    """Locate the session scope file by env var override or ancestor-pid walk."""
    override = os.environ.get(EXPLICIT_SCOPE_FILE_ENV_VAR)
    if override:
        path = Path(override)
        return path if path.exists() else None

    current_pid: Optional[int] = os.getppid()
    for _ in range(MAX_ANCESTOR_DEPTH):
        if current_pid is None or current_pid <= 1:
            break
        candidate = Path(f"{SCOPE_FILE_PREFIX}{current_pid}{SCOPE_FILE_SUFFIX}")
        if candidate.exists():
            return candidate
        current_pid = parent_pid(current_pid)
    return None


def parse_scope(scope_file: Path) -> List[str]:
    """Parse the `scope:` line into a list of path entries (files or directories)."""
    scope_line: Optional[str] = None
    for line in scope_file.read_text().splitlines():
        stripped = line.strip()
        if stripped.lower().startswith("scope:"):
            scope_line = stripped.split(":", 1)[1].strip()
            break
    if scope_line is None:
        return []

    # Split on '+' separators (with or without surrounding whitespace); tolerate extra whitespace.
    parts = re.split(r"\s*\+\s*", scope_line)
    return [p.strip() for p in parts if p.strip()]


def staged_files() -> List[str]:
    """Return the list of staged file paths via `git diff --cached --name-only`."""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        print(f"[pre-commit] ERROR: failed to run git diff --cached: {exc}", file=sys.stderr)
        sys.exit(2)
    if result.returncode != 0:
        print(
            f"[pre-commit] ERROR: git diff --cached exited with {result.returncode}: {result.stderr.strip()}",
            file=sys.stderr,
        )
        sys.exit(2)
    return [line for line in result.stdout.splitlines() if line.strip()]


def path_in_scope(path: str, entry: str) -> bool:
    """A staged path is in scope if it equals the entry (exact file match) or falls under
    the entry as a directory. An entry that already ends with '/' is treated as a directory
    prefix; an entry without a trailing slash matches either as an exact file OR as a
    directory prefix (path must begin with entry + '/').
    """
    if entry.endswith("/"):
        return path.startswith(entry)
    return path == entry or path.startswith(entry + "/")


def classify(staged: List[str], scope_entries: List[str]) -> tuple[List[str], List[str]]:
    """Partition staged files into (in_scope, out_of_scope) by scope-entry match."""
    in_scope: List[str] = []
    out_of_scope: List[str] = []
    for path in staged:
        # Strip a literal "./" prefix if present; do NOT lstrip individual "." and "/" chars,
        # which would corrupt .cursor/, .claude/, .github/, etc.
        normalized = path[2:] if path.startswith("./") else path
        if any(path_in_scope(normalized, entry) for entry in scope_entries):
            in_scope.append(path)
        else:
            out_of_scope.append(path)
    return in_scope, out_of_scope


def print_missing_scope_file_error() -> None:
    print("[pre-commit] ERROR: no scope declaration at /tmp/session_role_$$.txt", file=sys.stderr)
    print(
        "[pre-commit] Session-start pattern requires declaring scope; see "
        "handoff/multi_session_git_hooks_setup.md.",
        file=sys.stderr,
    )
    print(
        '[pre-commit] Emergency bypass: ALLOW_CROSS_SCOPE_COMMIT=1 git commit -m "..." '
        "(commit message must explain why via 'Pre-commit bypass:' annotation)",
        file=sys.stderr,
    )


def print_rejection(scope_file: Path, scope_entries: List[str], in_scope: List[str], out_of_scope: List[str]) -> None:
    print(f"[pre-commit] Reading session scope from {scope_file}", file=sys.stderr)
    print(f"[pre-commit] Declared scope: {' + '.join(scope_entries)}", file=sys.stderr)
    print("[pre-commit] Staged files:", file=sys.stderr)
    for path in in_scope:
        print(f"  - {path} (in scope)", file=sys.stderr)
    for path in out_of_scope:
        print(f"  - {path} (OUT OF SCOPE)", file=sys.stderr)
    print(
        f"[pre-commit] ERROR: {len(out_of_scope)} file(s) out of declared scope. Commit rejected.",
        file=sys.stderr,
    )
    print("[pre-commit] Options:", file=sys.stderr)
    print("  (a) git reset HEAD -- <out-of-scope-files> to unstage", file=sys.stderr)
    print(
        '  (b) ALLOW_CROSS_SCOPE_COMMIT=1 git commit -m "..." to bypass (use sparingly; '
        "commit message must include 'Pre-commit bypass:' annotation)",
        file=sys.stderr,
    )
    print(
        "  (c) Update /tmp/session_role_<pid>.txt scope if the files belong in this session's lane",
        file=sys.stderr,
    )


def main() -> int:
    bypass = os.environ.get(BYPASS_ENV_VAR) == "1"

    scope_file = find_scope_file()
    if scope_file is None:
        if bypass:
            print(
                "[pre-commit] Bypass active (ALLOW_CROSS_SCOPE_COMMIT=1); no scope file found. "
                "Commit message body must include a 'Pre-commit bypass:' annotation.",
                file=sys.stderr,
            )
            return 0
        print_missing_scope_file_error()
        return 1

    scope_entries = parse_scope(scope_file)
    if not scope_entries:
        print(
            f"[pre-commit] ERROR: scope file {scope_file} has no parseable 'scope:' line.",
            file=sys.stderr,
        )
        print(
            "[pre-commit] Expected format: 'scope: path1/ + path2/ + path3/'",
            file=sys.stderr,
        )
        if bypass:
            print(
                "[pre-commit] Bypass active; allowing commit. Commit message body must "
                "include a 'Pre-commit bypass:' annotation.",
                file=sys.stderr,
            )
            return 0
        return 1

    staged = staged_files()
    if not staged:
        # Nothing staged; nothing to check. Typical of --amend or commits with no new changes.
        return 0

    in_scope, out_of_scope = classify(staged, scope_entries)
    if not out_of_scope:
        return 0

    if bypass:
        print(
            f"[pre-commit] Bypass active (ALLOW_CROSS_SCOPE_COMMIT=1); "
            f"{len(out_of_scope)} file(s) out of scope allowed. Commit message body must "
            f"include a 'Pre-commit bypass:' annotation explaining the cross-scope inclusion.",
            file=sys.stderr,
        )
        return 0

    print_rejection(scope_file, scope_entries, in_scope, out_of_scope)
    return 1


if __name__ == "__main__":
    sys.exit(main())
