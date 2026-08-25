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
# The tens and their compounds, added 2026-08-25. The original table stopped at twenty,
# so once the portfolio passed twenty a spelled-out count ("thirty patents pending")
# matched nothing and the guard went blind on exactly the prose it exists to catch.
# Enumerating a fixed ceiling is the failure this fix repeats at a higher number, so the
# compounds are GENERATED rather than typed, and extending the ceiling is a one-line edit.
_TENS = {"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60}
_ONES = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
         "six": 6, "seven": 7, "eight": 8, "nine": 9}
for _tw, _tv in _TENS.items():
    WORDS[_tw] = _tv
    for _ow, _ov in _ONES.items():
        WORDS[f"{_tw}-{_ow}"] = _tv + _ov
NUM_TO_WORD = {v: k for k, v in WORDS.items()}

# A count word or digit immediately followed by a patent noun phrase.
COUNT_RE = re.compile(
    r"\b(" + "|".join(WORDS) + r"|\d{1,2})\s+"
    r"(filed\s+USPTO\s+applications?|USPTO\s+(?:provisional\s+)?applications?|"
    r"patents?\s+pending|provisional\s+(?:patent\s+)?applications?|patent\s+applications?)",
    re.I,
)
APP_RE = re.compile(r"\b(\d{2}/\d{3},\d{3})\b")


def patent_areas_block(text):
    """The FULL `patent-areas` div, nested children included.

    CORRECTED 2026-08-25. This was `re.search(r'<div class="patent-areas">(.*?)</div>')`,
    which is non-greedy and therefore stops at the FIRST nested `</div>`. The block holds
    one nested `patent-area` div per area, so the extractor only ever saw the first area:
    it reported 7 enumerated applications against a block that enumerates 30, and the
    guard failed on every run with a number that was its own artifact rather than the
    page's. Verified at the time of the fix: full block 30 distinct numbers, non-greedy
    match 7, page prose "30 patents pending" CORRECT and the guard wrong. The failure was
    invisible because this guard is not in the deploy workflow, so its FAIL reached no
    reader. Depth-counting is used rather than a wider regex because a wider regex would
    over-capture at the next restructure exactly as this one under-captured.
    """
    start = text.find('<div class="patent-areas">')
    if start < 0:
        return None
    depth = 0
    for m in re.finditer(r"<div\b|</div>", text[start:]):
        if m.group(0) == "</div>":
            depth -= 1
            if depth == 0:
                return text[start:start + m.end()]
        else:
            depth += 1
    return None  # unbalanced markup: refuse rather than guess


def enumerated_count(text):
    """Distinct application numbers listed in the patent-areas block."""
    block = patent_areas_block(text)
    if block is None:
        return None, []
    found = APP_RE.findall(block)
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
