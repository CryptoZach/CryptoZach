#!/usr/bin/env python3
"""check_agent_infra_stats.py: keep the homepage's agent-infrastructure gate
figures in agreement with the agent-infrastructure page.

Why this exists
---------------
The hard-gate figures (attempts that reached an armed gate, how many were
stopped, how many were overridden) appear on two served pages: the
agent-infrastructure page, whose figures are regenerated from their producers
at each revision, and the homepage section #agent-infrastructure-home, which
carries the same three numbers in hand-written prose with no marker and no
render step. On 2026-08-25 the homepage was found still saying 287 attempts
with 245 stopped while the regenerated page said 296 and 254. This checker is
the recurrence guard for that drift class, in the same spirit as
check_letter_count.py (letter count) and check_home_stats.py (hero tiles).

Source of truth
---------------
The agent-infrastructure page (agent-infrastructure/index.html): its figures
come from rerun producers, never retyped, per the page's own method note. The
homepage must follow it. This check does not know the true fleet values; it
only enforces that the two pages agree with each other and that each page is
internally consistent (stopped plus overridden equals attempts).

What it checks
--------------
1. Homepage sentence: "Across N measured attempts ... stopped the action in
   S cases. In the other O, ...".
2. Agent-infrastructure callout: "S of N" (ai-callout-stat) with "the other O
   cases" in the adjacent sentence.
3. Agent-infrastructure scale metric: value N with "S stopped; O overridden".
4. Agent-infrastructure method table: "S refused, O overridden".
All extracted (N, S, O) triples must be identical, and S + O must equal N.

Exit codes (pre-push layer-6 contract; see scripts/hooks/pre-push)
------------------------------------------------------------------
0  all mentions agree and are internally consistent
1  real drift: the pages disagree, or S + O != N   (blocks push / deploy)
2  guard error: a page or pattern could not be read, e.g. the prose was
   reworded; not blocking. Update the patterns here when the wording changes.

Usage
-----
    python3 scripts/check_agent_infra_stats.py           # report; exit per above
    python3 scripts/check_agent_infra_stats.py --quiet   # print only on failure
"""
import argparse
import os
import re
import subprocess
import sys

HOME = "index.html"
AI = os.path.join("agent-infrastructure", "index.html")

# Each entry: (path, label, regex, mapper) where mapper turns the match groups
# into a dict with any of n / s / o. Patterns are deliberately few and anchored
# to distinctive wording; a rewording surfaces as exit 2, not a silent pass.
PATTERNS = [
    (HOME, "homepage gate sentence",
     re.compile(r"Across\s+(\d[\d,]*)\s+measured\s+attempts[^.]*?stopped\s+the\s+action\s+in\s+(\d[\d,]*)\s+cases\.\s*In\s+the\s+other\s+(\d[\d,]*)", re.I | re.S),
     lambda g: {"n": g[0], "s": g[1], "o": g[2]}),
    (AI, "callout S of N",
     re.compile(r'ai-callout-stat">\s*(\d[\d,]*)\s+of\s+(\d[\d,]*)\s*<', re.I),
     lambda g: {"s": g[0], "n": g[1]}),
    (AI, "callout override sentence",
     re.compile(r"In\s+the\s+other\s+(\d[\d,]*)\s+cases,\s+the\s+agent\s+used\s+the\s+documented\s+override", re.I),
     lambda g: {"o": g[0]}),
    (AI, "scale metric",
     re.compile(r'ai-metric-value">\s*(\d[\d,]*)\s*</p>\s*<p class="ai-metric-label">Actions reached a hard gate</p>\s*<p class="ai-metric-was">\s*(\d[\d,]*)\s+stopped;\s+(\d[\d,]*)\s+overridden', re.I),
     lambda g: {"n": g[0], "s": g[1], "o": g[2]}),
    (AI, "method table row",
     re.compile(r"(\d[\d,]*)\s+refused,\s+(\d[\d,]*)\s+overridden\s+with\s+the\s+documented\s+escape", re.I),
     lambda g: {"s": g[0], "o": g[1]}),
]


def repo_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), script_dir):
        try:
            out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                                 capture_output=True, text=True, cwd=cwd)
            if out.returncode == 0 and out.stdout.strip():
                root = out.stdout.strip()
                if os.path.isfile(os.path.join(root, AI)):
                    return root
        except Exception:
            pass
    return os.path.dirname(script_dir)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    root = repo_root()
    texts = {}
    for path in (HOME, AI):
        full = os.path.join(root, path)
        if not os.path.isfile(full):
            print(f"check_agent_infra_stats: WARN cannot read {path}; guard did not run.")
            return 2
        with open(full, encoding="utf-8", errors="replace") as fh:
            texts[path] = fh.read()

    if "agent-infrastructure-home" not in texts[HOME]:
        # The homepage section was removed entirely; nothing to keep in sync.
        if not args.quiet:
            print("check_agent_infra_stats: homepage carries no agent-infrastructure section; OK.")
        return 0

    found = []  # (label, {n/s/o: int})
    for path, label, rx, mapper in PATTERNS:
        m = rx.search(texts[path])
        if not m:
            print(f"check_agent_infra_stats: WARN pattern not found ({label} in {path}). "
                  "The prose was likely reworded; update PATTERNS in this script. Guard did not run.")
            return 2
        vals = {k: int(v.replace(",", "")) for k, v in mapper(m.groups()).items()}
        found.append((label, vals))

    ref = {}
    drift = []
    for label, vals in found:
        for k, v in vals.items():
            if k in ref and ref[k][1] != v:
                drift.append(f"{k.upper()}: {label} says {v} but {ref[k][0]} says {ref[k][1]}")
            else:
                ref.setdefault(k, (label, v))
    n, s, o = ref.get("n", (None, None))[1], ref.get("s", (None, None))[1], ref.get("o", (None, None))[1]
    if not drift and None not in (n, s, o) and s + o != n:
        drift.append(f"internal arithmetic: stopped {s} plus overridden {o} is {s + o}, not attempts {n}")

    if drift:
        print("check_agent_infra_stats: DRIFT between the homepage gate figures and the "
              "agent-infrastructure page (its figures are regenerated from producers; the homepage must follow):")
        for d in drift:
            print(f"  - {d}")
        return 1

    if not args.quiet:
        print(f"check_agent_infra_stats: OK. attempts={n} stopped={s} overridden={o} "
              f"agree across {len(found)} mention(s) on both pages.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
