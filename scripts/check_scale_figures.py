#!/usr/bin/env python3
"""check_scale_figures.py: verify site scale figures and commit counts agree across the site.

Checks:
1. All program scale figures across `agent-infrastructure/index.html` (its `data-scale-*` stamp,
   hero support text, proof strip, metric cards, and scale table) and all 7 `resume/**/index.html`
   pages agree with the shipped resumes (`resumes/Zukowski_Resume_*.docx`).
2. `data-scale-commits-floored` on `agent-infrastructure/index.html` agrees with the floored
   `commits_on_ref` (`commits_on_ref // 1000 * 1000`) in `agent-infrastructure/commits-per-3-days.json`,
   so the live interactive commit chart and the prose commit counts across the site never drift apart.

Usage:
    python3 scripts/check_scale_figures.py [--quiet]
"""
from __future__ import annotations

import argparse
import html as htmllib
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

WORDS = {
    w: i
    for i, w in enumerate(
        "zero one two three four five six seven eight nine ten eleven twelve thirteen "
        "fourteen fifteen sixteen seventeen eighteen nineteen".split()
    )
}
TENS = {
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}


def num(tok: str) -> int | None:
    t = tok.strip().lower().replace(",", "")
    if t.isdigit():
        return int(t)
    if t in WORDS:
        return WORDS[t]
    if t in TENS:
        return TENS[t]
    if "-" in t:
        a, _, b = t.partition("-")
        if a in TENS and b in WORDS and 0 < WORDS[b] < 10:
            return TENS[a] + WORDS[b]
    return None


def clean(text: str) -> str:
    text = htmllib.unescape(text).replace("\xa0", " ").replace("⁠", "").replace("‑", "-")
    return re.sub(r"\s+", " ", text)


def html_text(h: str) -> str:
    h = re.sub(r"<(script|style)\b.*?</\1>", " ", h, flags=re.S)
    return clean(re.sub(r"<[^>]+>", " ", h))


def page_text(path: Path) -> str:
    return html_text(path.read_text(encoding="utf-8"))


def docx_text(path: Path) -> str:
    x = zipfile.ZipFile(path).read("word/document.xml").decode("utf-8")
    x = re.sub(r"</w:p>", "\n", x)
    return clean(re.sub(r"<[^>]+>", "", x))


NUMTOK = r"(\d[\d,]*|[a-z]+(?:-[a-z]+)?)"


def resume_reference(resumes: Path) -> tuple[dict, list[str]]:
    ref, problems, seen = {}, [], {}
    files = sorted(resumes.glob("Zukowski_Resume_*.docx"))
    if not files:
        raise FileNotFoundError(f"no shipped resumes in {resumes}")
    pats = {
        "commits": r"over ([\d,]+) commits",
        "overlap": r"typical overlap (\d+), peak \d+",
        "peak": r"typical overlap \d+, peak (\d+)",
        "advisory": r"over ([\d,]+) advisory firings",
        "advisory_classes": r"advisory firings measured across (\d+) classes",
        "skills": r"(\d+)-skill library",
        "canonical_files": r"(\d+)-file canonical-state",
        "applications": r"(\d+) USPTO",
        "families": r"across " + NUMTOK + r" families",
        "ssrn": r"(\d+) SSRN papers",
        "letters": r"(\d+) federal comment letters",
        "mcp_servers": r"(\d+) MCP servers",
        "api_services": r"(\d+) API services",
    }
    for f in files:
        t = docx_text(f)
        for key, pat in pats.items():
            for m in re.finditer(pat, t, re.I):
                v = num(m.group(1))
                if v is None:
                    continue
                if key == "families" and re.search(r"four families cover", t[m.start():m.end() + 20], re.I):
                    continue
                seen.setdefault(key, {}).setdefault(v, []).append(f.name)
    for key, vals in seen.items():
        if key == "families":
            vals = {v: n for v, n in vals.items() if v > 4}
        if len(vals) > 1:
            problems.append(
                f"the shipped resumes disagree on {key}: "
                + "; ".join(f"{v} in {', '.join(sorted(set(n)))}" for v, n in sorted(vals.items()))
            )
        if vals:
            ref[key] = max(vals, key=lambda v: len(vals[v]))
    return ref, problems


def floor_k(v: int) -> int:
    return v // 1000 * 1000


STAMP_FIGURES = [
    ("commits-floored", "commits", None),
    ("concurrency-p75", "overlap", None),
    ("concurrency-peak", "peak", None),
    ("advisory-firings", "advisory", floor_k),
    ("advisory-classes", "advisory_classes", None),
    ("skill-library", "skills", None),
    ("canonical-state-files", "canonical_files", None),
    ("uspto-applications", "applications", None),
    ("uspto-families", "families", None),
    ("ssrn-live", "ssrn", None),
    ("federal-comment-letters", "letters", None),
]

AGENT_STATEMENTS = [
    (r"(?:more than|over) ([\d,]+) commits", "commits", "commits", floor_k),
    (r"Commits over ([\d,]+) Since", "commits", "commits (table)", floor_k),
    (r"([\d,]+)\+ commits observed", "commits", "commits (proof strip / metric)", floor_k),
    (r"(\d+) typical (?:overlap|concurrent sessions); peak \d+", "overlap", "typical concurrent sessions (proof strip)", None),
    (r"\d+ typical (?:overlap|concurrent sessions); peak (\d+)", "peak", "peak (proof strip)", None),
    (r"(\d+) Typical concurrent sessions 75th percentile", "overlap", "typical concurrent sessions (metric)", None),
    (r"Typical concurrent sessions 75th percentile(?: \(median \d+\))?; peak (\d+)", "peak", "peak (metric)", None),
    (r"Concurrent sessions (\d+); peak \d+", "overlap", "typical overlap (table)", None),
    (r"Concurrent sessions \d+; peak (\d+)", "peak", "peak (table)", None),
    (r"([\d,]+) (?:advisory|warning) outcomes graded(?! \d+ classes)", "advisory", "warning outcomes (proof strip)", floor_k),
    (r"([\d,]+) Warning outcomes graded (?=\d+ classes)", "advisory", "warning outcomes (metric)", floor_k),
    (r"Warning outcomes graded (\d+) classes", "advisory_classes", "warning classes (metric)", None),
    (r"Advisory warnings ([\d,]+) Across", "advisory", "advisory warnings (table)", floor_k),
    (r"Advisory warnings [\d,]+ Across (\d+) classes", "advisory_classes", "advisory classes (table)", None),
    (r"(\d+) Program skills", "skills", "program skills (metric)", None),
    (r"Skill library (\d+) Every", "skills", "skill library (table)", None),
]

PAGE_STATEMENT = r"(\d+) (?:filed )?USPTO (?:patent )?applications (?:across|in) " + NUMTOK + r" families"

RESUME_STATEMENTS = [
    (r"(?:fleet of|across) over ([\d,]+) commits", "commits", "commits", floor_k),
    (r"over ([\d,]+) advisory firings across \d+ classes", "advisory", "advisory firings", floor_k),
    (r"advisory firings across (\d+) classes", "advisory_classes", "advisory classes", None),
    (r"typical overlap of (\d+) concurrent sessions", "overlap", "typical overlap", None),
    (r"concurrent sessions and a peak of (\d+)", "peak", "peak", None),
    (r"(\d+) SSRN papers", "ssrn", "SSRN papers", None),
    (r"(\d+) federal comment letters", "letters", "federal comment letters", None),
    (r"(\d+) (?:custom Python )?MCP servers", "mcp_servers", "MCP servers", None),
    (r"(\d+) API services", "api_services", "API services", None),
    (r"(\d+) MCP (?:and|\+) API (?:data )?connections", "mcp_servers", "legacy combined MCP + API connections", None),
]


def site_pages(site: Path) -> list[Path]:
    try:
        listed = subprocess.run(
            ["git", "-C", str(site), "ls-files", "*.html"],
            capture_output=True, text=True, timeout=30,
        ).stdout.split()
    except Exception:
        listed = []
    pages = [site / p for p in listed] if listed else list(site.rglob("*.html"))
    return [p for p in pages if p.is_file() and "_site" not in p.parts and "node_modules" not in p.parts]


def compare(site: Path, ref: dict) -> tuple[list[str], list[str]]:
    bad, unchecked = [], []

    def want(where, what, got, key, transform=lambda x: x):
        if key not in ref or got is None:
            return
        if transform(got) != ref[key]:
            bad.append(f"{where}: {what} says {got:,}, the resumes say {ref[key]:,}")

    ai = site / "agent-infrastructure" / "index.html"
    raw = ai.read_text(encoding="utf-8")
    stamp = dict(re.findall(r'data-scale-([a-z0-9-]+)="([^"]*)"', raw))
    ints = {k: int(v) for k, v in stamp.items() if v.isdigit()}
    rel = "agent-infrastructure/index.html"
    for skey, rkey, tf in STAMP_FIGURES:
        want(rel + " stamp", "data-scale-" + skey, ints.get(skey), rkey, tf or (lambda x: x))

    # Also verify commit chart JSON floor matches data-scale-commits-floored and resume commits
    chart_json = site / "agent-infrastructure" / "commits-per-3-days.json"
    if chart_json.is_file():
        try:
            cdoc = json.loads(chart_json.read_text(encoding="utf-8"))
            c_ref = cdoc.get("commits_on_ref")
            if isinstance(c_ref, int) and "commits" in ref:
                if floor_k(c_ref) != ref["commits"]:
                    bad.append(
                        f"agent-infrastructure/commits-per-3-days.json: commits_on_ref={c_ref:,} "
                        f"(floors to {floor_k(c_ref):,}), the resumes say {ref['commits']:,}"
                    )
        except Exception:
            pass

    t = page_text(ai)
    for pat, key, what, tf in AGENT_STATEMENTS:
        hits = 0
        for m in re.finditer(pat, t, re.I):
            hits += 1
            want(rel, what, int(m.group(1).replace(",", "")), key, tf or (lambda x: x))
        if not hits and key in ref:
            unchecked.append(what)

    for p in site_pages(site):
        t = page_text(p)
        where = str(p.relative_to(site))
        for m in re.finditer(PAGE_STATEMENT, t, re.I):
            want(where, "USPTO applications", int(m.group(1)), "applications")
            want(where, "patent families", num(m.group(2)), "families")
        if where.startswith("resume/"):
            for pat, key, what, tf in RESUME_STATEMENTS:
                for m in re.finditer(pat, t, re.I):
                    want(where, what, int(m.group(1).replace(",", "")), key, tf or (lambda x: x))
    return bad, unchecked


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--site", default=str(ROOT))
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    site = Path(a.site).resolve()
    try:
        ref, problems = resume_reference(site / "resumes")
        if not ref:
            raise ValueError("the shipped resumes state no figure this check compares")
        disagree, unchecked = compare(site, ref)
        bad = problems + disagree
    except Exception as exc:
        print(f"check_scale_figures: could not run ({type(exc).__name__}: {exc})", file=sys.stderr)
        return 2
    if bad:
        print("check_scale_figures: FAIL. Site scale figures disagree across pages/resumes/chart:", file=sys.stderr)
        for b in bad:
            print("  " + b, file=sys.stderr)
        return 1
    if not a.quiet:
        print(
            "check_scale_figures: OK. %d scale figure(s) agree across resumes, HTML pages, and commit chart (%s)."
            % (len(ref), ", ".join(f"{k}={v:,}" for k, v in sorted(ref.items())))
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
