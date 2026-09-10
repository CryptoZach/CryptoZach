#!/usr/bin/env python3
"""check_paper_count.py: ground the site's SSRN paper count to reality.

Why this exists
---------------
The paper count is hand-maintained across the served site in word ("nine"),
numeral ("9") and hyphenated ("nine-paper") forms, spread across visible prose,
meta descriptions, og and twitter cards, JSON-LD, llms.txt and the Jekyll site
description. There is no single source of truth, so every publication needs
dozens of manual edits and any miss ships stale.

On 2026-09-06 the ninth paper (Who Controls Agentic Payments, SSRN 7396241) went
live in site commit dbe346e4b5. That cycle advanced index.html's meta block and
research/index.html and reached nothing else, leaving 37 stale mentions across 17
files for four days. This checker is the recurrence guard for that drift class.
It is the paper-count sibling of check_letter_count.py, and it deliberately does
NOT inherit that script's two known blind spots: its walker reads .txt and .yml,
not only .html, and it scans wrapped prose across line breaks.

Source of truth
---------------
N = the number of DISTINCT SSRN abstract ids linked from `papers/<slug>/index.html`.

That works because paper pages cross-link each other's SSRN entries and nothing
else: measured 2026-09-10, the union over papers/ is exactly the program's nine
ids, and research/index.html contributes none beyond it. So publishing a tenth
paper introduces a tenth id and raises N on its own, and the prose must follow.
It needs no separate file to bump, which is the same property that makes
check_letter_count.py's derivation trustworthy.

Counting papers/ SUBDIRECTORIES would be wrong: papers/ also holds companion
pages that are not separate SSRN entries (control-layer-war, dollar-v3,
tokenized-equity carry no SSRN link of their own), so a directory count reads 16.

What it checks
--------------
Every total-count mention of the paper figure across the served site must equal N.
Adjacency is required, so decomposition and unrelated counts do not match: "nine
AI-integration patterns", "a nine-product sample", "eight where the paper expands",
"the 8th paper", "completing 8-of-8 SSRN" and "8 paper pages" are all correctly
ignored. A small ALLOWLIST covers deliberate historical mentions.

Usage
-----
    python3 scripts/check_paper_count.py            # report; exit 1 on any mismatch
    python3 scripts/check_paper_count.py --quiet    # only print on failure
    python3 scripts/check_paper_count.py --json     # machine-readable

Runs from either clone (resolves the repo root from its own location, falling back
to git).
"""
import argparse
import json
import os
import re
import subprocess
import sys

# Directories to scan for count mentions (served site surfaces). Relative to root.
SCAN_DIRS = ["", "letters", "resume", "overview", "frameworks", "research", "resumes",
             "speaker-and-advisory", "agent-infrastructure", "contact", "papers", "privacy"]

# Non-.html served files that carry the count. check_letter_count.py sat blind to
# _config.yml until 2026-09-10, when its site description was found four filings
# stale on the letter count while that gate reported OK across all 81 mentions it
# could see. This walker reads both extensions from the start.
EXTRA_FILES = ["llms.txt", "_config.yml"]

PRUNE_DIRS = {".git", ".claude", "_build", "_archive", "node_modules", "_site", "submissions"}

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

_N = r"(?P<n>[A-Za-z]+|\d+)"

# Total-count patterns. Adjacency is deliberately tight: the count token, an optional
# qualifier, then the PLURAL noun. Loosening any of these re-admits the false
# positives named in the module docstring.
COUNT_PATTERNS = [
    # "nine papers", "nine SSRN papers", "nine working papers", "nine formal-program
    # papers", "nine SSRN working papers".
    re.compile(_N + r"\s+(?:(?:SSRN|working|formal-program|filed)\s+){0,2}papers\b", re.I),
    # "nine-paper program", "nine-paper research program". The hyphenated form is the
    # one the 2026-09-10 dispatch's own grep missed, which is how frameworks/,
    # llms.txt and contact/ went unlisted.
    re.compile(_N + r"-paper\b", re.I),
]

# A match is dropped if any of these appears inside the matched span: they mark a
# decomposition or an unrelated noun rather than the whole-program figure.
DECOMP_MARKERS = ("track a", "track b", "peer-reviewed", "conference")

# Leading context that makes a match a decomposition no matter what follows.
# "one of four papers in the Track A dollar-infrastructure sequence" on
# papers/seven-dollars is a within-track cluster count: you cannot be "one of N"
# and also be the whole-program figure. Checked against the text immediately
# BEFORE the count token, which is tighter than widening DECOMP_MARKERS to a
# character window; a window that reaches far enough to see "Track A" here would
# also reach across unrelated markup on the tag-dense research/index.html lines.
DECOMP_PREFIXES = ("one of ", "one of the ")

# Deliberate non-current mentions, exempted by (path-suffix, token-lower).
# letters/fdic-ag19 narrates the April 2026 8-of-8 milestone, which is correct in
# context; its phrasing does not match the patterns above, and the entry is kept so
# a future rewording of that page fails loudly here rather than silently shipping.
ALLOWLIST = {
    ("letters/fdic-ag19-ppsi-activities/index.html", "eight"),
    ("letters/fdic-ag19-ppsi-activities/index.html", "8"),
}


def repo_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), script_dir):
        try:
            out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                                 capture_output=True, text=True, cwd=cwd)
            if out.returncode == 0 and out.stdout.strip():
                root = out.stdout.strip()
                if os.path.isdir(os.path.join(root, "papers")):
                    return root
        except Exception:
            pass
    return os.path.dirname(script_dir)


def derive_n(root):
    """N = distinct SSRN abstract ids linked from papers/<slug>/index.html."""
    papers_dir = os.path.join(root, "papers")
    if not os.path.isdir(papers_dir):
        return 0, []
    pat = re.compile(r"abstract_id=(\d+)")
    ids = set()
    for slug in sorted(os.listdir(papers_dir)):
        page = os.path.join(papers_dir, slug, "index.html")
        if not os.path.isfile(page):
            continue
        try:
            with open(page, encoding="utf-8", errors="replace") as fh:
                ids.update(pat.findall(fh.read()))
        except OSError:
            continue
    return len(ids), sorted(ids)


def scan_files(root):
    seen = set()
    for rel in SCAN_DIRS:
        base = os.path.join(root, rel) if rel else root
        if not os.path.isdir(base):
            continue
        if rel == "":
            for name in sorted(os.listdir(base)):
                if name.endswith((".html", ".txt")):
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


def logical_text(lines):
    """Join lines into one string, returning it plus an offset-to-lineno mapper.

    Wrapped prose is the reason this exists. A YAML folded scalar or a hard-wrapped
    .txt paragraph can put the count on one line and its noun on the next, which a
    line-by-line scan can never match: that is exactly how _config.yml's
    "fourteen federal\\n  comment letters" stayed invisible to check_letter_count.py.
    Joining with a single space makes the phrase matchable while keeping every match
    reportable at the line where its count token sits.
    """
    text_parts, starts, pos = [], [], 0
    for line in lines:
        stripped = line.rstrip("\n")
        starts.append(pos)
        text_parts.append(stripped)
        pos += len(stripped) + 1
    joined = " ".join(text_parts)

    def lineno_at(offset):
        lo, hi = 0, len(starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if starts[mid] <= offset:
                lo = mid
            else:
                hi = mid - 1
        return lo + 1

    return joined, lineno_at


def token_to_int(tok):
    tok = tok.strip().lower()
    if tok.isdigit():
        return int(tok)
    return WORD_TO_INT.get(tok)


def scan(root, n):
    mismatches, checked = [], 0
    for path in scan_files(root):
        rel = os.path.relpath(path, root).replace(os.sep, "/")
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                lines = fh.readlines()
        except OSError:
            continue
        # HTML is scanned line-by-line: a joined scan over minified or
        # tag-dense markup would match across unrelated element boundaries.
        # Wrapped prose formats get the joined scan.
        if rel.endswith(".html"):
            units = [(i, line) for i, line in enumerate(lines, start=1)]
            for lineno, unit in units:
                checked += _scan_unit(unit, lambda _o: lineno, rel, n, lines, mismatches)
        else:
            joined, lineno_at = logical_text(lines)
            checked += _scan_unit(joined, lineno_at, rel, n, lines, mismatches)
    return mismatches, checked


def _scan_unit(text, lineno_at, rel, n, lines, mismatches):
    checked = 0
    for pat in COUNT_PATTERNS:
        for m in pat.finditer(text):
            span = m.group(0).lower()
            if any(mark in span for mark in DECOMP_MARKERS):
                continue
            prefix = text[max(0, m.start() - 16):m.start()].lower()
            if any(prefix.endswith(p) for p in DECOMP_PREFIXES):
                continue
            val = token_to_int(m.group("n"))
            if val is None:
                continue  # not a number token, e.g. "the papers"
            checked += 1
            if val == n:
                continue
            if (rel, m.group("n").strip().lower()) in ALLOWLIST:
                continue
            lineno = lineno_at(m.start())
            source_line = lines[lineno - 1] if 0 < lineno <= len(lines) else ""
            if "count-guard-ignore" in source_line:
                continue
            mismatches.append({"file": rel, "line": lineno, "found": val,
                               "expected": n, "text": m.group(0).strip()})
    return checked


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--quiet", action="store_true", help="only print on failure")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    root = repo_root()
    n, ssrn_ids = derive_n(root)
    if n == 0:
        print("check_paper_count: ERROR could not derive N (no SSRN ids under papers/).",
              file=sys.stderr)
        return 2

    mismatches, checked = scan(root, n)
    expected_word = INT_TO_WORD.get(n, str(n))

    if args.json:
        print(json.dumps({"n": n, "expected_word": expected_word, "ssrn_ids": ssrn_ids,
                          "mentions_checked": checked, "mismatches": mismatches,
                          "ok": not mismatches}, indent=2))
        return 1 if mismatches else 0

    if mismatches:
        print(f"check_paper_count: FAIL. Authoritative paper count N = {n} "
              f"('{expected_word}', from {len(ssrn_ids)} distinct SSRN ids under papers/).")
        print(f"{len(mismatches)} stale mention(s) (of {checked} checked):")
        for mm in mismatches:
            print(f"  {mm['file']}:{mm['line']}  found {mm['found']}, expected {n}"
                  f"   ->  \"{mm['text']}\"")
        print("\nFix each to match N, or add a documented exception "
              "(ALLOWLIST in this script, or an inline 'count-guard-ignore' comment).")
        return 1

    if not args.quiet:
        print(f"check_paper_count: OK. All {checked} paper-count mention(s) agree with "
              f"N = {n} ('{expected_word}', from {len(ssrn_ids)} distinct SSRN ids "
              f"under papers/).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
