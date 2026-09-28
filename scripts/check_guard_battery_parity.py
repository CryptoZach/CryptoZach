#!/usr/bin/env python3
"""check_guard_battery_parity.py: the two guard batteries must not drift apart.

WHY THIS EXISTS
---------------
This site runs its single-source-of-truth guards from TWO hand-maintained lists that must
agree and that, until this script, nothing compared:

  scripts/hooks/pre-push          a shell `for g in ...` loop naming the guards
  .github/workflows/build-deploy.yml   a sequence of `run_check scripts/<guard>` lines

MEASURED 2026-09-10, which is why this file exists rather than a comment somewhere. The
pre-push list held six guards; the CI list held three of them. check_paper_count.py, the
guard that catches a stale published paper count, was in the hook and not in CI. It had been
added to the hook THAT MORNING by a session that did not know there was a second list.

The exposure is not theoretical: the ninth paper went live 2026-09-06 and left 39 stale
"eight paper" mentions across 17 files for four days with no push blocked, because
check_paper_count.py was in NEITHER battery then.

THE INVARIANT, and note it is one-directional on purpose:

    every guard in the PRE-PUSH battery must also appear in the CI battery.
    CI may hold more. It may never hold fewer.

"Derive one list from the other" would be wrong. The two genuinely differ in both
directions and should: CI additionally runs render_chrome.py --check and a built-_site
cache-buster gate, neither of which can run pre-push because there is no built tree then.
CI is the BROADER gate (the hook covers one clone whose hooks someone installed by hand;
CI covers every path to origin), so the containment runs hook-subset-of-CI.

THE UNCALLED-GUARD TALLY (warn only) covers the sharper third case, which a pure
list-versus-list check cannot see: a guard that is in NEITHER battery is in no list to
compare. check_paper_count.py and check_patent_count.py spent their whole lives in exactly
that state, finished and calling nobody. A guard nothing calls is not a control, it is a
file. That tally is deliberately NON-blocking: a check_*.py can legitimately be a library, a
one-off, or author-manual, so a hard failure there would be wrong.

PRECISION OF THAT TALLY, measured on its first run rather than assumed. It fired once, on
scripts/render_letter_count.py, and that firing was a FALSE POSITIVE: the script is the
build-time WRITER paired with check_letter_count.py and it is invoked from package.json as
`npm run build:letter-count` and `npm run check:site-numbers`. npm scripts are a third call
site neither battery contains, so the tally read "called by nobody" when the truth was
"called from a place I did not look". package.json is now read too, which takes that tally
to zero findings on this tree. A warn that is wrong the first time it speaks is how a check
teaches its readers to skip it, so this was fixed before the first push rather than after.

NO THIRD-PARTY IMPORTS, deliberately. An earlier draft parsed the workflow with PyYAML.
PyYAML is not guaranteed on a GitHub Actions runner, the import would raise, this script
would exit 2, and exit 2 is FAIL-OPEN in both batteries: the checker would have been
silently vacuous in CI, which is the exact class of defect it was written to catch. Plain
line parsing with comment stripping has no such failure mode.

EXIT CODES, matching the convention both batteries already use:
  0  every pre-push guard is present in CI
  1  at least one is missing (real drift; blocks)
  2  a list could not be parsed (fail-open; warns, does not block)
"""

import os
import re
import subprocess
import sys

HOOK_REL = os.path.join("scripts", "hooks", "pre-push")
CI_REL = os.path.join(".github", "workflows", "build-deploy.yml")

# A guard token is a bare .py filename (hook list) or scripts/<name>.py (CI lines).
GUARD_RE = re.compile(r"[A-Za-z0-9_.-]+\.py")
FOR_LOOP_RE = re.compile(r"\bfor\s+g\s+in\s+(?P<list>[^;]+);\s*do")
# Both `run_check scripts/x.py` and a direct `python3 scripts/x.py`, since the workflow
# uses both forms (the cache-buster gate is a direct python3 call, not a run_check).
CI_CALL_RE = re.compile(r"(?:run_check|python3)\s+(?:\"|')?(?:\./)?scripts/(?P<g>[A-Za-z0-9_.-]+\.py)")


def repo_root():
    try:
        out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, timeout=30)
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except Exception:
        pass
    return os.getcwd()


def strip_comment(line):
    """Drop a shell/YAML trailing comment. Both languages use # to end-of-line, and the
    workflow's guard names appear inside prose comments as often as in real call sites, so
    without this the CI list would read as complete when it is not."""
    i = line.find("#")
    return line if i < 0 else line[:i]


def read(path):
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def parse_hook(root):
    """-> (set of guard filenames, error-or-None). The battery is the `for g in ...` list."""
    path = os.path.join(root, HOOK_REL)
    if not os.path.isfile(path):
        return set(), "%s not found" % HOOK_REL
    guards = set()
    for line in read(path).splitlines():
        m = FOR_LOOP_RE.search(strip_comment(line))
        if m:
            guards.update(GUARD_RE.findall(m.group("list")))
    if not guards:
        return set(), "no `for g in ...; do` guard battery found in %s" % HOOK_REL
    return guards, None


def parse_ci(root):
    """-> (set of guard filenames, error-or-None)."""
    path = os.path.join(root, CI_REL)
    if not os.path.isfile(path):
        return set(), "%s not found" % CI_REL
    guards = set()
    for line in read(path).splitlines():
        for m in CI_CALL_RE.finditer(strip_comment(line)):
            guards.add(m.group("g"))
    if not guards:
        return set(), "no guard invocations found in %s" % CI_REL
    return guards, None


def npm_called(root):
    """Guard-shaped scripts invoked from package.json npm scripts. A THIRD call site that
    neither battery contains: the render_*.py generators live there, and without this the
    uncalled tally reports them as controls nobody runs. Plain regex, no json import needed
    for correctness (a malformed file simply yields no matches and the tally stays
    conservative in the direction of over-reporting, which is warn-only anyway)."""
    path = os.path.join(root, "package.json")
    if not os.path.isfile(path):
        return set()
    try:
        return set(re.findall(r"scripts/([A-Za-z0-9_.-]+\.py)", read(path)))
    except Exception:
        return set()


def guard_shaped(root):
    """Every script that LOOKS like a guard, for the uncalled tally."""
    d = os.path.join(root, "scripts")
    if not os.path.isdir(d):
        return set()
    return {f for f in os.listdir(d)
            if f.endswith(".py") and (f.startswith("check_") or f.startswith("render_"))}


def main():
    quiet = "--quiet" in sys.argv
    root = repo_root()

    hook, err_h = parse_hook(root)
    ci, err_c = parse_ci(root)
    if err_h or err_c:
        # FAIL-OPEN. Same contract the batteries use for an absent or erroring guard: a
        # checker that cannot read its inputs must not block a deploy on its own confusion.
        print("check_guard_battery_parity: CANNOT VERIFY (%s); not blocking."
              % "; ".join(x for x in (err_h, err_c) if x), file=sys.stderr)
        return 2

    missing = sorted(hook - ci)

    # Warn-only tally: guard-shaped scripts neither battery calls.
    uncalled = sorted(guard_shaped(root) - hook - ci - npm_called(root))
    if uncalled and not quiet:
        print("check_guard_battery_parity: NOTE, %d guard-shaped script(s) are called by "
              "NEITHER battery and not by package.json. Not blocking (a check_*.py may be a "
              "library, a one-off, or author-manual), but a guard nothing calls is not a "
              "control:" % len(uncalled))
        for g in uncalled:
            print("    scripts/%s" % g)

    if missing:
        print("check_guard_battery_parity: FAIL. %d guard(s) run in the pre-push battery "
              "(%s) and NOT in the CI battery (%s):" % (len(missing), HOOK_REL, CI_REL))
        for g in missing:
            print("    %s" % g)
        print("  CI is the broader gate: the pre-push hook only covers a local push from a "
              "clone whose hooks were installed, while CI covers the GitHub web editor, PR "
              "merges, un-hooked clones, and SKIP_SITE_NUMBER_PREPUSH=1 pushes. A guard "
              "trusted at push time and absent at deploy time is the drift this blocks.")
        print("  Fix: add `run_check scripts/<guard> --quiet` to the consistency-gate step "
              "in %s." % CI_REL)
        return 1

    if not quiet:
        print("check_guard_battery_parity: OK. All %d pre-push guard(s) are present in the "
              "CI battery (CI runs %d)." % (len(hook), len(ci)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
