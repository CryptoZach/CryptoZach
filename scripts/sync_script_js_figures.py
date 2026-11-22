#!/usr/bin/env python3
"""sync_script_js_figures.py: script.js carries the fleet figures the agent page publishes, or the deploy refuses.

Why this exists
---------------
script.js holds the fleet's scale figures as literal strings in the site's explorers, role cards, reading lists,
search index and feed cards: commits, advisory firings, concurrent sessions, the commit chart's bins and series, and
the hard-gate figures. No tool refreshed or read them. On 2026-11-22 the live file said 68,000+ commits six times where
the agent page said 90,000, 63,230 advisory firings where it said 89,425, 14 typical and 61 peak concurrent sessions
where it said 18 and 57, and 79 commit-chart bins where the chart had 87. The same day ten hard-gate lines were
corrected by a literal replacement keyed on the old strings, which the next refresh would have left stale as well.
Queue entry (workflow clone, handoff/unowned/):
site-script-js-fleet-figures-are-hand-typed-and-no-tool-refreshes-or-checks-them.

Source of truth
---------------
The agent page's data-scale-* stamp (agent-infrastructure/index.html), which check_scale_figures.py holds to the
shipped resumes and to the commit chart, and the chart's own JSON (agent-infrastructure/commits-per-3-days.json) for
its bins, series counts and dates. script.js follows them. This tool never measures the fleet.

Each FIGURES row is one phrase shape, the reference values its numbers carry, and the least number of times script.js
carries the shape. A shape found fewer times is reported UNCHECKED and fails the check, so rewording a phrase cannot
switch the check off unless a line here changes with it.

The hold rate is floored to two decimals, never rounded, so a published hold never reads higher than the measured one
(29,999 stopped of 30,000 prints 99.99%, not 100.00%).

Exit codes (the deploy gate's run_check contract)
-------------------------------------------------
0  every figure agrees with the agent page
1  drift, an UNCHECKED shape, or a reference value the stamp or the chart no longer carries (blocks the deploy)
2  a file could not be read (warns, does not block)

Usage
-----
    python3 scripts/sync_script_js_figures.py [--check] [--quiet] [--root DIR]   # --check is the default
    python3 scripts/sync_script_js_figures.py --write [--quiet] [--root DIR]   # rewrite every figure, then check
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAMP_KEYS = ("commits-floored", "concurrency-p75", "concurrency-peak", "advisory-firings", "advisory-classes",
              "hard-gate-deny", "hard-gate-bypass")
N = r"(?<![\d,.])\d{1,3}(?:,\d{3})*"  # a count with thousands separators, never the tail of a longer number
PCT = r"(?<![\d.])\d{2,3}\.\d{2}"     # a two-decimal percentage

# (the shape, its pattern, the least number of times script.js carries it). Each named group is a reference value:
# a name ending in _plain prints without thousands separators, every other number prints with them, and the hold rate
# and the dates print as reference() renders them.
FIGURES = [
    ("fleet commits, floored to the thousand", rf"(?P<commits>{N})\+ (?:fleet )?[Cc]ommits\b", 6),
    ("the search index's fleet line",
     r"\bfleet (?P<commits_plain>\d+) commits (?P<deny_plain>\d+) hard gates (?P<firings_plain>\d+) advisories\b", 1),
    ("advisory firings", rf"(?P<firings>{N}) advisory firings\b", 2),
    ("the warnings explorer's fleet-wide total",
     rf"fleet-wide total now (?P<firings>{N}) across (?P<classes>\d+) classes", 1),
    ("typical and peak concurrent sessions", r"\b(?P<p75>\d+) typical / (?P<peak>\d+) peak\b", 3),
    ("the commit chart card's bins", r"\((?P<bins>\d+) 3-Day Bins, ", 1),
    ("the commit series feed card's bins", r"\b(?P<bins>\d+) 3d bins \+ (?P<bins_1d>\d+) 1d bins\b", 1),
    ("the commit series feed card's counts and dates",
     rf"(?P<series>{N}) commits in series \((?P<on_ref>{N}) on ref\) from (?P<start>[A-Z][a-z]+ \d{{1,2}}) "
     r"through (?P<through>[A-Z][a-z]+ \d{1,2}, \d{4})", 1),
    ("the gates explorer's hold-rate stat",
     rf'hard-gate hold rate</span><span class="b4-stat__val">(?P<hold>{PCT})%</span><span class="b4-stat__sub">'
     rf"(?P<deny>{N}) stopped of (?P<attempts>{N}) attempts", 1),
    ("a hold rate with stopped of attempts", rf"(?P<hold>{PCT})%, (?P<deny>{N}) of (?P<attempts>{N}) stopped\b", 1),
    ("a hold rate with stopped/attempts", rf"(?P<hold>{PCT})% \((?P<deny>{N})/(?P<attempts>{N})\)", 1),
    ("gate attempts refused", rf"(?P<deny>{N}) of (?P<attempts>{N}) gate attempts refused\b", 1),
    ("a gate hold", rf"(?P<hold>{PCT})% (?:gate )?hold\b", 6),
    ("hard-gate stops", rf"(?P<deny>{N}) hard-gate stops\b", 1),
]


def floor_pct(part: int, whole: int) -> str:
    """part/whole as a percentage floored to two decimals."""
    hundredths = (10000 * part) // whole
    return "%d.%02d" % (hundredths // 100, hundredths % 100)


def reference(root: Path) -> dict:
    """The values script.js must carry, read from the agent page's stamp and the commit chart's JSON.

    Raises OSError when a file cannot be read, and ValueError naming the value when the stamp or the chart no longer
    carries one this check needs."""
    raw = (root / "agent-infrastructure" / "index.html").read_text(encoding="utf-8")
    chart_raw = (root / "agent-infrastructure" / "commits-per-3-days.json").read_text(encoding="utf-8")
    stamp = dict(re.findall(r'data-scale-([a-z0-9-]+)="([^"]*)"', raw))
    missing = [k for k in STAMP_KEYS if not stamp.get(k, "").isdigit()]
    if missing:
        raise ValueError("the agent page's stamp carries no " + ", ".join("data-scale-" + k for k in missing))
    try:
        chart = json.loads(chart_raw)
        start = dt.date.fromisoformat(chart["start_date"])
        through = dt.datetime.strptime(chart["captions"]["through"], "%d %B %Y").date()
        bins, bins_1d = int(chart["bins"]), len(chart["series_1d"])
        series, on_ref = int(chart["commits_in_series"]), int(chart["commits_on_ref"])
    except (KeyError, TypeError, ValueError) as e:
        raise ValueError("the commit chart's JSON no longer carries what script.js quotes (%s: %s)"
                         % (type(e).__name__, e)) from e
    deny, bypass = int(stamp["hard-gate-deny"]), int(stamp["hard-gate-bypass"])
    if deny + bypass <= 0:
        raise ValueError("the stamp's hard-gate figures sum to no attempts")
    return {
        "commits": int(stamp["commits-floored"]),
        "firings": int(stamp["advisory-firings"]),
        "classes": int(stamp["advisory-classes"]),
        "p75": int(stamp["concurrency-p75"]),
        "peak": int(stamp["concurrency-peak"]),
        "deny": deny,
        "attempts": deny + bypass,
        "hold": floor_pct(deny, deny + bypass),
        "bins": bins,
        "bins_1d": bins_1d,
        "series": series,
        "on_ref": on_ref,
        "start": "%s %d" % (start.strftime("%B"), start.day),
        "through": "%s %d, %d" % (through.strftime("%B"), through.day, through.year),
    }


def render(group: str, ref: dict) -> str:
    if group.endswith("_plain"):
        return str(ref[group[: -len("_plain")]])
    value = ref[group]
    return f"{value:,}" if isinstance(value, int) else str(value)


def check_text(text: str, ref: dict) -> tuple[list[str], list[str], dict]:
    """(drift lines, UNCHECKED lines, hits per shape) for script.js's text against the reference."""
    drift, hits = [], {what: 0 for what, _, _ in FIGURES}
    for what, pattern, _ in FIGURES:
        for m in re.finditer(pattern, text):
            hits[what] += 1
            line = text.count("\n", 0, m.start()) + 1
            for group in m.groupdict():
                found, want = m.group(group), render(group, ref)
                if found != want:
                    drift.append(f"script.js line {line}, {what}: says {found}, the agent page says {want}")
    unchecked = [f"{what}: found {hits[what]} time(s), expected at least {least}"
                 for what, _, least in FIGURES if hits[what] < least]
    return drift, unchecked, hits


def rewrite_text(text: str, ref: dict) -> str:
    """script.js's text with every figure the FIGURES rows find set to the reference value. Nothing else moves."""
    def sub(m: re.Match) -> str:
        whole, base = m.group(0), m.start()
        out, pos = [], 0
        for (a, b), want in sorted((m.span(g), render(g, ref)) for g in m.groupdict()):
            out.append(whole[pos: a - base])
            out.append(want)
            pos = b - base
        out.append(whole[pos:])
        return "".join(out)

    for _, pattern, _ in FIGURES:
        text = re.sub(pattern, sub, text)
    return text


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n")[0])
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="report drift; exit per the codes above (the default, so "
                      "the pre-push battery's bare --quiet call checks)")
    mode.add_argument("--write", action="store_true", help="rewrite every figure from the reference, then check")
    ap.add_argument("--quiet", action="store_true", help="print only on failure")
    ap.add_argument("--root", type=Path, default=ROOT, help="the site root (default: this checkout)")
    a = ap.parse_args(argv)
    js = a.root / "script.js"
    try:
        ref = reference(a.root)
        text = js.read_text(encoding="utf-8")
    except OSError as e:
        print(f"sync_script_js_figures: WARN could not read an input ({e}); the check did not run.")
        return 2
    except ValueError as e:
        print(f"sync_script_js_figures: DRIFT: {e}. script.js has nothing to follow; restore it before deploying.")
        return 1
    if a.write:
        new = rewrite_text(text, ref)
        if new != text:
            js.write_text(new, encoding="utf-8")
            if not a.quiet:
                print("sync_script_js_figures: rewrote script.js from the agent page's stamp and the commit chart.")
        text = new
    drift, unchecked, hits = check_text(text, ref)
    if drift or unchecked:
        print("sync_script_js_figures: DRIFT between script.js and the agent page (script.js follows the page's "
              "data-scale-* stamp and the commit chart's JSON; run scripts/sync_script_js_figures.py --write):")
        for line in drift + ["UNCHECKED " + u for u in unchecked]:
            print("  - " + line)
        return 1
    if not a.quiet:
        print(f"sync_script_js_figures: OK. {sum(hits.values())} figure phrases in {len(FIGURES)} shapes agree "
              "with the agent page's stamp and the commit chart.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
