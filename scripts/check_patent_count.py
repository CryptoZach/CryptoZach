#!/usr/bin/env python3
"""Guard the site's patent count against its own enumeration.

WHY THIS EXISTS. The federal-letter count has been guarded since the 2026-07 count
reconciliation, and that guard found 35 stale mentions. The patent count had no
equivalent, and on 2026-07-27 it went stale the moment application 64/120,240 was filed:
index.html said "16 patents pending" and "Sixteen filed USPTO applications" while the
expandable enumeration below it listed the applications one by one. A page that states a
count and then lists the items is carrying the same fact twice, and nothing was checking
that the two agreed.

GROUND TRUTH is the enumeration, not a hardcoded number. The `patent-areas` block lists
every application by its USPTO application number, so the count is derivable from the page
itself. That means this guard needs no maintenance when the next application is filed:
add the number to the enumeration and the guard tells you which prose still disagrees.

WHAT IT CHECKS
  1. Every count-word or digit immediately preceding a patent noun ("seventeen filed USPTO
     applications", "17 patents pending") agrees with the number of distinct application
     numbers enumerated.
  2. No application number appears twice in the enumeration (a duplicate would inflate
     nothing but signals a copy-paste error).

EXIT 0 when everything agrees, 1 otherwise, naming each disagreeing line.

    python3 scripts/check_patent_count.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20,
}
NUM_TO_WORD = {v: k for k, v in WORDS.items()}

# A count word or digit immediately followed by a patent noun phrase.
COUNT_RE = re.compile(
    r"\b(" + "|".join(WORDS) + r"|\d{1,2})\s+"
    r"(filed\s+USPTO\s+applications?|USPTO\s+(?:provisional\s+)?applications?|"
    r"patents?\s+pending|provisional\s+(?:patent\s+)?applications?|patent\s+applications?)",
    re.I,
)
APP_RE = re.compile(r"\b(\d{2}/\d{3},\d{3})\b")


def enumerated_count(text):
    """Distinct application numbers listed in the patent-areas block."""
    m = re.search(r'<div class="patent-areas">(.*?)</div>', text, re.S)
    if not m:
        return None, []
    found = APP_RE.findall(m.group(1))
    return len(set(found)), found


def main():
    index = ROOT / "index.html"
    if not index.is_file():
        sys.exit("check_patent_count: index.html not found")
    text = index.read_text(errors="replace")

    truth, found = enumerated_count(text)
    if truth is None:
        sys.exit(
            "check_patent_count: no <div class=\"patent-areas\"> block found. The guard "
            "derives ground truth from that enumeration; if the page was restructured, "
            "update this script rather than deleting it."
        )

    dupes = {a for a in found if found.count(a) > 1}
    problems = []
    if dupes:
        problems.append(f"duplicate application number(s) in the enumeration: {sorted(dupes)}")

    # Scan every html and md page for count claims.
    targets = [p for p in ROOT.rglob("*.html") if "_site" not in p.parts and ".claude" not in p.parts]
    targets += [p for p in ROOT.rglob("*.md") if "_site" not in p.parts and ".claude" not in p.parts]
    checked = 0
    for p in sorted(targets):
        try:
            body = p.read_text(errors="replace")
        except OSError:
            continue
        for i, line in enumerate(body.splitlines(), 1):
            for m in COUNT_RE.finditer(line):
                raw = m.group(1).lower()
                val = WORDS.get(raw, None)
                if val is None:
                    try:
                        val = int(raw)
                    except ValueError:
                        continue
                checked += 1
                if val != truth:
                    rel = p.relative_to(ROOT)
                    problems.append(
                        f"{rel}:{i}: says '{m.group(0).strip()}' but {truth} applications "
                        f"are enumerated (expected '{NUM_TO_WORD.get(truth, truth)}' or '{truth}')"
                    )

    if problems:
        print(f"check_patent_count: FAIL. {len(problems)} problem(s).")
        for p_ in problems:
            print("  " + p_)
        print(f"\nGround truth is the patent-areas enumeration: {truth} distinct applications.")
        print("Fix the prose, or add the new application number to the enumeration first.")
        return 1

    print(
        f"check_patent_count: OK. All {checked} patent-count mention(s) agree with "
        f"N = {truth} ('{NUM_TO_WORD.get(truth, truth)}', from {truth} enumerated "
        f"application numbers)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
