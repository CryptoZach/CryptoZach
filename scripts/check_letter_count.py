#!/usr/bin/env python3
"""check_letter_count.py: ground the site's federal-comment-letter count to reality.

Why this exists
---------------
The federal-comment-letter count is hand-maintained across ~26 site files (~60
mentions) in both word ("fourteen") and numeral ("14") forms, spread across
visible prose, meta descriptions, og/twitter cards, and JSON-LD. There is no
single source of truth, so every filing needs dozens of manual edits and any
miss ships stale. On 2026-07-03 the FSB companion card and six resume
proof-strips were found stuck at "13"/"thirteen" (they were bumped for the July
FSB filing but never advanced for the SEC DSP-3 letter filed 2026-07-02). This
checker is the recurrence guard for that drift class.

Source of truth
---------------
N = the number of PUBLISHED federal letter pages: `letters/<slug>/index.html`
directories, excluding the letters index and the international standard-setter
pages (FSB), which are a distinct series and do not increment the federal count
(see research_content/letters/2026-07_fsb_ai_consultation/METADATA.md). This is
self-consistent: adding a letter page raises N, so the prose must follow. It
needs no separate file to bump.

METADATA is intentionally NOT the source: `research_content/letters/*/METADATA.md`
`status:` fields are not uniformly structured (only some carry a greppable
FILED), so a naive count from METADATA undercounts.

What it checks
--------------
Every total-count mention of the federal-letter figure across the served site
must equal N. Decomposition figures ("eleven principal letters", "three
supplements", "seven agencies", "nine dockets") are deliberately NOT matched,
and a small ALLOWLIST exempts the intentional narrative-progression sentence on
the overview page ("...eight... twelve... thirteen... fourteen...").

Usage
-----
    python3 scripts/check_letter_count.py            # report; exit 1 on any mismatch
    python3 scripts/check_letter_count.py --quiet     # only print on failure
    python3 scripts/check_letter_count.py --json       # machine-readable

Runs from either clone (resolves the repo root from its own location, falling
back to git). Add to the site-sweep-auditor battery and/or a pre-push check so
a stale count cannot ship.
"""
import argparse
import json
import os
import re
import subprocess
import sys

# Slugs under letters/ that are NOT federal comment letters (distinct series).
# Extend when another international standard-setter response is published.
INTERNATIONAL_SLUGS = {"fsb-ai-sound-practices"}

# Directories to scan for count mentions (served site surfaces). Relative to root.
SCAN_DIRS = ["", "letters", "resume", "overview", "frameworks", "research", "resumes",
             "speaker-and-advisory"]

# Non-.html served files that carry the count. The walker is .html-only, so llms.txt
# (the AI-surface summary) was never scanned and sat 7 filings stale until 2026-07-24.
EXTRA_FILES = ["llms.txt"]

# Directory names never recursed into.
PRUNE_DIRS = {".git", ".claude", "_build", "node_modules", "_site", "submissions"}

# Number words we recognize, both directions, 0-40 (plenty for a letter count).
_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
         "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
         "sixteen", "seventeen", "eighteen", "nineteen"]
_TENS = {"twenty": 20, "thirty": 30, "forty": 40}
WORD_TO_INT = {w: i for i, w in enumerate(_ONES)}
for _w, _v in _TENS.items():
    WORD_TO_INT[_w] = _v
    for _i, _o in enumerate(_ONES[1:10], start=1):
        WORD_TO_INT[f"{_w}-{_o}"] = _v + _i
        WORD_TO_INT[f"{_w} {_o}"] = _v + _i
INT_TO_WORD = {v: k for k, v in WORD_TO_INT.items()}

# Total-count patterns. Each captures the count token in group 'n'. These target
# the WHOLE-PROGRAM federal-letter figure only, not its decomposition.
COUNT_PATTERNS = [
    re.compile(r"(?P<n>[A-Za-z]+|\d+)\s+federal\s+comment\s+letters?", re.I),
    re.compile(r"(?P<n>[A-Za-z]+|\d+)\s+comment\s+letters?\s+filed", re.I),
    # Verb-first order: "filed fifteen comment letters". The noun-first pattern above
    # does not match it, which is how research/index.html sat at "fourteen" through the
    # 15th filing while this guard reported OK (2026-07-24).
    re.compile(r"filed\s+(?P<n>[A-Za-z]+|\d+)\s+comment\s+letters?", re.I),
    re.compile(r"(?P<n>[A-Za-z]+|\d+)\s+letters?,\s+(?:seven|eight|nine|six|five|four)\s+(?:federal\s+)?agenc", re.I),
    re.compile(r"(?P<n>[A-Za-z]+|\d+)\s+letters?\s+across\s+(?:nine|eight|seven|six|five|ten)\s+docket", re.I),
    re.compile(r"Program\s+\((?P<n>[A-Za-z]+|\d+)\s+letters?", re.I),
    re.compile(r"The\s+(?P<n>[A-Za-z]+|\d+)\s+letters?\s*<", re.I),
    # "All N letters" nav copy: <a class="access-link">All fifteen letters</a> plus the
    # sibling <span> blurb, on every letter page. This phrasing carried 28 of the 32
    # stale mentions found 2026-07-24 while this guard reported OK.
    re.compile(r"All\s+(?P<n>[A-Za-z]+|\d+)\s+letters\b", re.I),
]

# Substrings that mark a match as a decomposition, not the total. Skip if present
# in the matched span itself.
DECOMP_MARKERS = ("principal", "supplement")

# Intentional non-current mentions, exempted by (path-suffix, token-lower).
# The overview page narrates the program's growth (April batch of eight, then
# twelve, thirteen, fourteen); those historical figures are correct in context.
ALLOWLIST = {
    ("overview/index.html", "eight"),
    ("overview/index.html", "twelve"),
    ("overview/index.html", "thirteen"),
    ("overview/index.html", "fourteen"),
}


def repo_root():
    # Prefer the git toplevel of the CURRENT working directory, so a deploy-gate
    # in one clone can invoke this script (living in another) against its own
    # tree. Fall back to the script's own clone, then to the parent of scripts/.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), script_dir):
        try:
            out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                                 capture_output=True, text=True, cwd=cwd)
            if out.returncode == 0 and out.stdout.strip():
                root = out.stdout.strip()
                if os.path.isdir(os.path.join(root, "letters")):
                    return root
        except Exception:
            pass
    return os.path.dirname(script_dir)


def derive_n(root):
    letters_dir = os.path.join(root, "letters")
    n = 0
    federal_slugs = []
    if not os.path.isdir(letters_dir):
        return 0, []
    for slug in sorted(os.listdir(letters_dir)):
        d = os.path.join(letters_dir, slug)
        if not os.path.isdir(d):
            continue
        if not os.path.isfile(os.path.join(d, "index.html")):
            continue
        if slug in INTERNATIONAL_SLUGS:
            continue
        n += 1
        federal_slugs.append(slug)
    return n, federal_slugs


def html_files(root):
    seen = set()
    for rel in SCAN_DIRS:
        base = os.path.join(root, rel) if rel else root
        if not os.path.isdir(base):
            continue
        if rel == "":
            # Root-level html only (do not recurse the whole tree from root).
            for name in sorted(os.listdir(base)):
                if name.endswith(".html"):
                    p = os.path.join(base, name)
                    if p not in seen:
                        seen.add(p)
                        yield p
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in PRUNE_DIRS]
            for name in sorted(filenames):
                if name.endswith(".html"):
                    p = os.path.join(dirpath, name)
                    if p not in seen:
                        seen.add(p)
                        yield p
    for rel in EXTRA_FILES:
        p = os.path.join(root, rel)
        if os.path.isfile(p) and p not in seen:
            seen.add(p)
            yield p


def token_to_int(tok):
    tok = tok.strip().lower()
    if tok.isdigit():
        return int(tok)
    return WORD_TO_INT.get(tok)


def scan(root, n):
    mismatches = []
    checked = 0
    for path in html_files(root):
        rel = os.path.relpath(path, root)
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                lines = fh.readlines()
        except OSError:
            continue
        for lineno, line in enumerate(lines, start=1):
            for pat in COUNT_PATTERNS:
                for m in pat.finditer(line):
                    span = m.group(0).lower()
                    if any(mark in span for mark in DECOMP_MARKERS):
                        continue
                    val = token_to_int(m.group("n"))
                    if val is None:
                        continue  # not a number token (e.g. "the federal comment letters")
                    checked += 1
                    if val == n:
                        continue
                    tok = m.group("n").strip().lower()
                    if (rel.replace(os.sep, "/"), tok) in ALLOWLIST:
                        continue
                    if "count-guard-ignore" in line:
                        continue
                    mismatches.append({
                        "file": rel,
                        "line": lineno,
                        "found": val,
                        "expected": n,
                        "text": m.group(0).strip(),
                    })
    return mismatches, checked


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--quiet", action="store_true", help="only print on failure")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    root = repo_root()
    n, federal_slugs = derive_n(root)
    if n == 0:
        print("check_letter_count: ERROR could not derive N (no letters/ pages found).",
              file=sys.stderr)
        return 2

    mismatches, checked = scan(root, n)
    expected_word = INT_TO_WORD.get(n, str(n))

    if args.json:
        print(json.dumps({
            "n": n, "expected_word": expected_word,
            "federal_slugs": federal_slugs,
            "mentions_checked": checked,
            "mismatches": mismatches,
            "ok": not mismatches,
        }, indent=2))
        return 1 if mismatches else 0

    if mismatches:
        print(f"check_letter_count: FAIL. Authoritative federal count N = {n} "
              f"('{expected_word}', from {len(federal_slugs)} published letter pages).")
        print(f"{len(mismatches)} stale mention(s) (of {checked} checked):")
        for mm in mismatches:
            print(f"  {mm['file']}:{mm['line']}  found {mm['found']}, expected {n}"
                  f"   ->  \"{mm['text']}\"")
        print("\nFix each to match N, or add a documented exception "
              "(ALLOWLIST in this script, or an inline 'count-guard-ignore' comment).")
        return 1

    if not args.quiet:
        print(f"check_letter_count: OK. All {checked} federal-letter-count mention(s) "
              f"agree with N = {n} ('{expected_word}', from {len(federal_slugs)} "
              f"published letter pages).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
