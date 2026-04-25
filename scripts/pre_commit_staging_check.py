#!/usr/bin/env python3
"""
pre_commit_staging_check.py

Pre-commit staging-scope check for the CryptoZach repo's multi-session shared-clone setup.

Reads a session scope declaration at /tmp/session_role_<pid>.txt, runs three
checks against the declared scope plus the staged paths:

  1. clone-label-check: scope-file `clone:` field matches `git rev-parse
     --show-toplevel` after path normalization (realpath + strip-trailing-slash
     + lowercase-on-darwin). HARD-FAIL on real mismatch.
  2. subset-check: declared `scope:` is a subset of the role's default scope
     per scripts/declare_session_scope.sh case branches (mirrored as
     ROLE_DEFAULT_SCOPES below; mixed-role declarations split on '+').
     HARD-FAIL on over-expansion.
  3. path-in-scope check: every staged file lies under some declared scope
     entry (existing original behavior). HARD-FAIL on out-of-scope staging.

Checks run in order (cheap structural first); collect-all-output (no
short-circuit): operator gets the full picture in one run.

Rationale: the 2026-04-23 bundling incident (commit 0b3c90a) shipped 17 parallel-
session-authored files under a styles.css commit message because the shared git
index in /Users/zach/ai-research/CryptoZach/ has no structural isolation between
concurrent Claude Code + Cursor sessions. The 2026-04-24 incidents 315187d (over-
broad SITE-EDITOR scope), 692eae2 + 0240311 (silent ALLOW_CROSS_SCOPE_COMMIT=1
without annotation), and the 50153 scope-file clone-label drift surfaced the
need for the 3-check bundle (subset-check + annotation-enforcement + clone-
label-check). Annotation-enforcement ships as a separate commit-msg hook
(scripts/commit_msg_bypass_annotation_check.py) since pre-commit fires before
the commit message is on disk.

Spec sources:
  - handoff/agent_roles_and_living_state_plan_2026-04-23.md Phase 1 Component 2
  - handoff/multi_session_coordination_plan_2026-04-24.md Part B
  - handoff/phase_1_execution_prompt_2026-04-24.md section 5.2
  - handoff/hook_phase2_6_4_implementation_handoff_2026-04-24.md (Phase 2
    deliverable 6.4 spec; 3-check bundle plus retrospective replay)

Session scope file format (authored at session start by
scripts/declare_session_scope.sh or equivalent):

    role: BULK-EXECUTOR
    clone: /Users/zach/ai-research/CryptoZach
    scope: .claude/skills/ + scripts/ + handoff/ + .cursor/tasks/
    session_start: 2026-04-24T05:09:41Z

Mixed roles (per b001ab9, aba317e, c6f179e precedents) declare via '+'
separator on the role: line; trailing parenthetical annotation is parsed and
discarded:

    role: BULK-EXECUTOR+CANONICAL-WRITER (mixed; CO-1 narrates-staged-content)

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
explaining the cross-scope inclusion. The annotation requirement is enforced
at the commit-msg-hook level by scripts/commit_msg_bypass_annotation_check.py
(Phase 2 deliverable 6.4 ship); this pre-commit hook honors the env var and
prints the reminder.

Exit codes:
  0: all checks pass (or bypass active)
  1: discipline violation; commit rejected (any of the 3 checks HARD-FAIL)
  2: configuration error (existing semantics for git diff failure preserved)

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


# Role default scopes. Mirror of the case branches in
# scripts/declare_session_scope.sh per Phase 2 deliverable 6.4 spec
# (handoff/hook_phase2_6_4_implementation_handoff_2026-04-24.md Phase 1).
# Drift between this mapping and the bash script is a HALT-5 condition;
# the drift unit test in the acceptance gate (Test #3) detects it.
#
# AUDIT-REVIEWER and AUTHOR-DIRECT are empty by role design: writes route
# through same-lane re-declaration to BULK-EXECUTOR (AUDIT-REVIEWER) or
# ALLOW_CROSS_SCOPE_COMMIT=1 with annotation (AUTHOR-DIRECT). See
# handoff/agent_roster_draft_2026-04-24.md Section 7 (read-only sentinel)
# and AGENT_ROSTER Section 2 once canonicalized.
ROLE_DEFAULT_SCOPES: dict[str, list[str]] = {
    "BULK-EXECUTOR": [
        "research_content/",
        "handoff/",
        ".cursor/tasks/",
        "tools/",
        "scripts/",
        ".claude/agents/",
        ".claude/skills/",
    ],
    "CANONICAL-WRITER": [
        "docs/",
        ".cursor/skills/",
        ".cursor/rules/",
        ".cursor/tasks/",
    ],
    "SITE-EDITOR": [
        "papers/",
        "research/",
        "overview/",
        "frameworks/",
        "letters/",
        "resume/",
        "resumes/",
        "contact/",
        "speaker-and-advisory/",
        "index.html",
        "404.html",
        "_config.yml",
        "sitemap.xml",
        "styles.css",
        "script.js",
        "assets/",
        "icons/",
        "Publication-Images/",
        "scripts/inline-critical-css.mjs",
        "scripts/bump-cache-buster.py",
        ".github/",
        "package.json",
        "package-lock.json",
        "Gemfile",
        "purgecss.config.cjs",
        ".gitignore",
    ],
    "AUDIT-REVIEWER": [],
    "AUTHOR-DIRECT": [],
}
VALID_ROLES = set(ROLE_DEFAULT_SCOPES.keys())


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


def parse_role_field(scope_file: Path) -> str:
    """Return the raw value of the `role:` line, or empty string if absent."""
    for line in scope_file.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.lower().startswith("role:"):
            return stripped.split(":", 1)[1].strip()
    return ""


def split_mixed_role(role_value: str) -> List[str]:
    """Split a `role:` field value into individual role tokens.

    Format: <role-1>+<role-2>+... with '+' separator.
    Trailing parenthetical annotation is stripped before splitting:
      'CANONICAL-WRITER+BULK-EXECUTOR (mixed; CO-1 ...)' yields
      ['CANONICAL-WRITER', 'BULK-EXECUTOR'].
    """
    cleaned = re.sub(r"\s*\(.*?\)\s*$", "", role_value).strip()
    parts = [p.strip() for p in cleaned.split("+") if p.strip()]
    return parts


def role_default_scope(role: str) -> List[str]:
    """Return the union of role default scopes for a (possibly mixed) role declaration.

    Raises ValueError on unknown role tokens (HALT-2 condition for the caller).
    """
    parts = split_mixed_role(role)
    union: List[str] = []
    for r in parts:
        if r not in ROLE_DEFAULT_SCOPES:
            raise ValueError(f"unknown role token: {r!r}")
        for entry in ROLE_DEFAULT_SCOPES[r]:
            if entry not in union:
                union.append(entry)
    return union


def _entry_within_default(entry: str, default: str) -> bool:
    """Return True if a declared scope entry is contained in some role default entry.

    Subset semantics for path entries:
      - default ends with '/': any path or directory under default is within it
        (e.g., 'handoff/foo.md' within 'handoff/'; 'handoff/sub/' within 'handoff/').
      - default does not end with '/': matches the entry only if entry equals
        default (file match) or starts with default + '/' (directory prefix).
    """
    if default.endswith("/"):
        if entry == default.rstrip("/"):
            return True
        return entry.startswith(default)
    return entry == default or entry.startswith(default + "/")


def subset_check(declared_scope: List[str], role: str) -> tuple[bool, List[str]]:
    """Return (in_subset, over_expansion).

    in_subset is True iff every declared entry is contained in some role default
    entry. over_expansion lists the declared entries NOT in any default (empty
    when in_subset=True). Unknown role tokens collapse to (False, declared_scope)
    so the caller surfaces an HARD-FAIL with the unknown-role rejection format.
    """
    try:
        defaults = role_default_scope(role)
    except ValueError:
        return False, list(declared_scope)
    over_expansion = [
        entry for entry in declared_scope
        if not any(_entry_within_default(entry, d) for d in defaults)
    ]
    return (len(over_expansion) == 0), over_expansion


def parse_clone_field(scope_file: Path) -> str:
    """Return the raw value of the `clone:` line, or empty string if absent."""
    for line in scope_file.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.lower().startswith("clone:"):
            return stripped.split(":", 1)[1].strip()
    return ""


def normalize_clone_path(raw: str) -> str:
    """Canonicalize a clone path for comparison.

    Steps:
      - Strip trailing slash (git rev-parse never returns one; declarations may).
      - Resolve symlinks via os.path.realpath (e.g., /Users/zach/cryptozach to
        /Users/zach/ai-research/CryptoZach).
      - Lowercase on darwin (macOS APFS / HFS+ default is case-insensitive).
        Linux / non-darwin treats case as significant.

    The darwin lowercase heuristic assumes the default case-insensitive APFS
    or HFS+ volume; case-sensitive APFS volumes are rare and not the canonical
    setup. A stricter check would stat the path in both cases but adds
    per-call overhead; revisit if a case-sensitive volume enters the clone surface.
    """
    if not raw:
        return ""
    resolved = os.path.realpath(raw.rstrip("/"))
    return resolved.lower() if sys.platform == "darwin" else resolved


def clone_label_check(scope_file: Path) -> tuple[bool, str, str]:
    """Return (matches, declared_raw, actual_raw).

    Compares the scope file's `clone:` field against `git rev-parse
    --show-toplevel` after normalization. Legacy scope files without a
    `clone:` line skip silently (return matches=True with empty strings).
    git rev-parse failure is treated as skip-with-stderr-note rather than
    HARD-FAIL, since a hook running inside git context structurally has
    rev-parse available; failure indicates corrupted setup and warn-noise
    adds friction.
    """
    raw_declared = parse_clone_field(scope_file)
    if not raw_declared:
        # Legacy format; skip silently without note (the absence is benign).
        return (True, "", "")
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print(
            "[pre-commit] note: git rev-parse --show-toplevel unavailable; "
            "clone-label-check skipped (corrupted git context).",
            file=sys.stderr,
        )
        return (True, raw_declared, "")
    if result.returncode != 0:
        print(
            "[pre-commit] note: git rev-parse --show-toplevel returned non-zero; "
            "clone-label-check skipped.",
            file=sys.stderr,
        )
        return (True, raw_declared, "")
    raw_actual = result.stdout.strip()
    declared_norm = normalize_clone_path(raw_declared)
    actual_norm = normalize_clone_path(raw_actual)
    return (declared_norm == actual_norm, raw_declared, raw_actual)


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


def print_clone_label_rejection(declared_raw: str, actual_raw: str, declared_norm: str, actual_norm: str) -> None:
    print("[pre-commit] ERROR: scope-file clone-label drift detected.", file=sys.stderr)
    print(f"[pre-commit]   Declared (in scope file `clone:` field): {declared_raw}", file=sys.stderr)
    print(f"[pre-commit]   Actual (git rev-parse --show-toplevel):  {actual_raw}", file=sys.stderr)
    print(f"[pre-commit]   Normalized declared (realpath + strip / + lowercase-on-darwin): {declared_norm}", file=sys.stderr)
    print(f"[pre-commit]   Normalized actual:                                              {actual_norm}", file=sys.stderr)
    print("[pre-commit] Per Pattern 27 catch on /tmp/session_role_50153.txt 2026-04-24", file=sys.stderr)
    print("[pre-commit]   (clone label said working clone; actual session was in primary", file=sys.stderr)
    print("[pre-commit]   clone per filesystem forensics on bundling commits 692eae2 +", file=sys.stderr)
    print("[pre-commit]   0240311). Resolution paths:", file=sys.stderr)
    print("[pre-commit]   (a) Update the scope file `clone:` field to match the actual clone", file=sys.stderr)
    print("[pre-commit]       (most common; typo or stale label).", file=sys.stderr)
    print("[pre-commit]   (b) Move the session to the declared clone (cd to the right path", file=sys.stderr)
    print("[pre-commit]       and re-declare scope from there).", file=sys.stderr)
    print('[pre-commit]   (c) Cross-clone bypass: ALLOW_CROSS_SCOPE_COMMIT=1 git commit -m "..."', file=sys.stderr)
    print("[pre-commit]       with `Pre-commit bypass: cross-clone scenario; <rationale>`", file=sys.stderr)
    print("[pre-commit]       annotation in the commit message body (now hook-enforced via", file=sys.stderr)
    print("[pre-commit]       commit-msg stage per scripts/commit_msg_bypass_annotation_check.py).", file=sys.stderr)


def print_subset_rejection(declared_scope: List[str], role: str, over_expansion: List[str]) -> None:
    print("[pre-commit] ERROR: declared scope is not a subset of role default.", file=sys.stderr)
    print(f"[pre-commit]   Role:                  {role}", file=sys.stderr)
    try:
        defaults = role_default_scope(role)
        rendered = " + ".join(defaults) if defaults else "(empty by role design)"
        print(f"[pre-commit]   Role default scope:    {rendered}", file=sys.stderr)
    except ValueError as exc:
        print(f"[pre-commit]   Role default scope:    UNKNOWN ROLE TOKEN ({exc})", file=sys.stderr)
    declared_rendered = " + ".join(declared_scope) if declared_scope else "(empty)"
    print(f"[pre-commit]   Declared scope:        {declared_rendered}", file=sys.stderr)
    print("[pre-commit]   Over-expansion (declared entries NOT in role default):", file=sys.stderr)
    for entry in over_expansion:
        print(f"     - {entry}", file=sys.stderr)
    print("[pre-commit] Resolution paths:", file=sys.stderr)
    print("[pre-commit]   (a) Narrow declared scope to a subset of the role default", file=sys.stderr)
    print("[pre-commit]       (re-declare via scripts/declare_session_scope.sh or rewrite", file=sys.stderr)
    print("[pre-commit]       the scope: line in the scope file).", file=sys.stderr)
    print("[pre-commit]   (b) SESSION_ROLE_FILE override pointing at a custom scope file with a", file=sys.stderr)
    print("[pre-commit]       different role declaration that legitimately covers these paths", file=sys.stderr)
    print("[pre-commit]       (e.g., mixed BULK-EXECUTOR+CANONICAL-WRITER role for a CO-1", file=sys.stderr)
    print("[pre-commit]       narrates-staged-content carve-out cycle).", file=sys.stderr)
    print("[pre-commit]   (c) ALLOW_CROSS_SCOPE_COMMIT=1 with `Pre-commit bypass:` annotation", file=sys.stderr)
    print("[pre-commit]       (now hook-enforced via commit-msg stage) when the cross-default", file=sys.stderr)
    print("[pre-commit]       inclusion is intentional per a CO-N carve-out (CO-1 narrates-", file=sys.stderr)
    print("[pre-commit]       staged-content; CO-2/3/4 see AGENT_ROSTER once canonicalized).", file=sys.stderr)


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
        # Empty scope is legal for AUDIT-REVIEWER and AUTHOR-DIRECT roles by design;
        # any staged files in those roles must route through bypass + annotation.
        # If bypass is not active and there are staged files, the path-in-scope check
        # (Check 3 below) will catch them via classify() with an empty scope_entries
        # list (every staged file is OUT OF SCOPE).
        pass

    role_value = parse_role_field(scope_file)

    # Collect-all-output: run all 3 checks; capture HARD-FAIL signals; emit
    # rejection text inline. After all 3, exit 1 if any HARD-FAIL and no bypass;
    # else exit 0. Bypass mode runs all 3 checks for visibility but exits 0.

    any_hard_fail = False

    # --- Check 1: clone-label-check (cheapest structural check; runs first) ---
    matches, declared_clone, actual_clone = clone_label_check(scope_file)
    if not matches:
        declared_norm = normalize_clone_path(declared_clone)
        actual_norm = normalize_clone_path(actual_clone)
        print_clone_label_rejection(declared_clone, actual_clone, declared_norm, actual_norm)
        any_hard_fail = True

    # --- Check 2: subset-check (declared scope vs role default) ---
    if role_value:
        in_subset, over_expansion = subset_check(scope_entries, role_value)
        if not in_subset:
            print_subset_rejection(scope_entries, role_value, over_expansion)
            any_hard_fail = True
    else:
        # Legacy scope file without role: line; subset-check skipped silently.
        # (No HARD-FAIL; future declarations should include a role: line per
        # scripts/declare_session_scope.sh canonical format.)
        pass

    # --- Check 3: path-in-scope (existing original behavior) ---
    staged = staged_files()
    if staged:
        in_scope_files, out_of_scope_files = classify(staged, scope_entries)
        if out_of_scope_files:
            print_rejection(scope_file, scope_entries, in_scope_files, out_of_scope_files)
            any_hard_fail = True

    if any_hard_fail and not bypass:
        return 1

    if any_hard_fail and bypass:
        print(
            "[pre-commit] Bypass active (ALLOW_CROSS_SCOPE_COMMIT=1); HARD-FAIL signal(s) "
            "above suppressed. Commit message body must include a 'Pre-commit bypass:' "
            "annotation explaining the bypass (now hook-enforced via commit-msg stage).",
            file=sys.stderr,
        )
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
