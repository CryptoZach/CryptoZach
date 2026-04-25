#!/usr/bin/env python3
"""
commit_msg_bypass_annotation_check.py

Commit-msg hook enforcing the CLAUDE.md "Pre-commit scope-check bypass"
hard constraint: when ALLOW_CROSS_SCOPE_COMMIT=1 is set, the commit message
body MUST include a line starting with `Pre-commit bypass:` explaining the
bypass. Silent bypass is hook-rejected (was author-discipline-enforced only
prior to this hook; the gap surfaced 2026-04-24 in commits 692eae2 and
0240311 where the env var was set without annotation).

Hook contract (git commit-msg signature):

  $1 = path to the commit-msg file (rendered template; not yet committed)

Behavior:

  - Env var ALLOW_CROSS_SCOPE_COMMIT not set: exit 0 (no annotation required;
    not a bypass commit).
  - Env var set: read the commit message body; check for any line starting
    with `Pre-commit bypass:` (case-sensitive prefix match). Annotation
    present: exit 0. Annotation absent: print rejection text and exit 1.

Edge cases:

  - Comment lines (#-prefixed) are NOT special-cased. If a user puts the
    annotation inside a # comment, the line still starts with `#`, not
    `Pre-commit bypass:`, so the annotation is treated as absent. This is
    consistent with git's comment-stripping semantics: comments in the
    final message are dropped, so an annotation inside a comment would
    not survive into the committed message body.
  - Merge / rebase commits: hook still fires; annotation requirement
    applies only when the env var is set, so non-bypass merges and
    rebases pass through normally.
  - Empty messages: pass through if env var is not set; reject (no
    annotation) if env var is set.

Exit codes:

  0: pass (annotation present, or env var not set)
  1: discipline violation (env var set; annotation absent)
  2: configuration error (commit-msg file path missing or unreadable)

Spec source: handoff/hook_phase2_6_4_implementation_handoff_2026-04-24.md
Phase 3. Python 3 standard library only. Target runtime: <500ms.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BYPASS_ENV_VAR = "ALLOW_CROSS_SCOPE_COMMIT"
ANNOTATION_PREFIX = "Pre-commit bypass:"


def main() -> int:
    if os.environ.get(BYPASS_ENV_VAR) != "1":
        return 0  # no bypass; no annotation requirement

    if len(sys.argv) < 2:
        print(
            "[commit-msg] ERROR: hook invoked without commit-msg file path argument.",
            file=sys.stderr,
        )
        return 2

    msg_file = Path(sys.argv[1])
    if not msg_file.is_file():
        print(
            f"[commit-msg] ERROR: commit-msg file not found at {msg_file}.",
            file=sys.stderr,
        )
        return 2

    msg_body = msg_file.read_text(encoding="utf-8")
    has_annotation = any(
        line.lstrip().startswith(ANNOTATION_PREFIX)
        for line in msg_body.splitlines()
    )

    if has_annotation:
        return 0  # bypass acknowledged

    print(
        f"[commit-msg] ERROR: {BYPASS_ENV_VAR}=1 set but commit message body "
        f"missing required '{ANNOTATION_PREFIX}' annotation line.",
        file=sys.stderr,
    )
    print(
        "[commit-msg] CLAUDE.md hard constraint: when bypass is used, the commit "
        "message body MUST include a line starting with 'Pre-commit bypass:' "
        "explaining the cross-scope inclusion. Silent bypass is prohibited.",
        file=sys.stderr,
    )
    print(
        "[commit-msg] Annotation examples (from precedents b001ab9, aba317e):",
        file=sys.stderr,
    )
    print(
        "  - Pre-commit bypass: SESSION_ROLE_FILE override pointing at "
        "/tmp/cursor_session_role_<descriptor>.txt. <rationale>",
        file=sys.stderr,
    )
    print(
        "  - Pre-commit bypass: ALLOW_CROSS_SCOPE_COMMIT=1 bypass for "
        "<emergency-rationale>",
        file=sys.stderr,
    )
    print(
        "[commit-msg] Options: (a) git commit --amend with the annotation added; "
        "(b) edit commit message via $EDITOR; (c) abort and re-stage with proper "
        "scope declaration.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
