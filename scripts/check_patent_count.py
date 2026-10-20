#!/usr/bin/env python3
"""Guard and atomic updater for the site's patent application and family counts.

WHY THIS EXISTS
---------------
The USPTO patent portfolio count (`N` applications across `F` families, grouped into
`K` problem areas on `patents/index.html`) appears across visible prose, meta
descriptions, og/twitter cards, JSON-LD `CollectionPage`/`ItemList`, `llms.txt`,
`sitemap.xml`, `agent-infrastructure/index.html` (`data-scale-uspto-*` attributes),
all six resume profile pages (`resume/**/index.html`), and all six downloadable
resume DOCX and PDF files (`resumes/Zukowski_Resume_*.docx` and `.pdf`).

GROUND TRUTH
------------
`patents/index.html` is the single canonical source:
  1. `N` (applications) = count of distinct `\\b\\d{2}/\\d{3},\\d{3}\\b` application
     numbers enumerated inside `<div class="patent-areas">`.
  2. `F` (families) = family count stated in `<p class="patent-intro">` on
     `patents/index.html` (`<N> filed USPTO applications across <F> families`).
  3. `areas` = the `<div class="patent-area">` sections inside `<div class="patent-areas">`,
     each with its heading (`<strong>...</strong>`), problem description, and list of
     application numbers.

WHAT IT CHECKS (AND UPDATES WITH `--write`)
-------------------------------------------
  1. No duplicate USPTO application numbers in `<div class="patent-areas">`.
  2. Every application-count mention across `.html`, `.md`, `.txt`, and `.xml` files
     (including `"All <N>, grouped by primary function"` and
     `data-scale-uspto-applications="<N>"`) equals `N`.
  3. Every patent-family count mention across `.html`, `.md`, `.txt`, and `.xml` files
     (including `(?:across|in) <F> (?:patent )?families` and
     `data-scale-uspto-families="<F>"`) equals `F`.
  4. `patents/index.html` JSON-LD `CollectionPage` `ItemList` matches the `<div class="patent-area">`
     DOM blocks (number of areas, area names, and per-area filing counts).
  5. Every resume DOCX (`resumes/Zukowski_Resume_*.docx`) and PDF (`resumes/*.pdf`)
     states `<N> USPTO patent applications across <F> families`, and the family
     decomposition in `Zukowski_Resume_AI_Governance_Infrastructure.docx` (`four families
     ... other <F-4> families`) sums to `F`.

USAGE
-----
    python3 scripts/check_patent_count.py            # check; exit 1 on any mismatch
    python3 scripts/check_patent_count.py --quiet    # only print on failure
    python3 scripts/check_patent_count.py --write    # atomically rewrite drifted surfaces
    python3 scripts/check_patent_count.py --map      # print complete atomic surface map
    python3 scripts/check_patent_count.py --json     # machine-readable report
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Number words 1..99 (hyphenated and spaced).
WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19,
}
_TENS = {
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}
_ONES = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9,
}
for _tw, _tv in _TENS.items():
    WORDS[_tw] = _tv
    for _ow, _ov in _ONES.items():
        WORDS[f"{_tw}-{_ow}"] = _tv + _ov
        WORDS[f"{_tw} {_ow}"] = _tv + _ov

NUM_TO_WORD = {}
for _k, _v in WORDS.items():
    if " " not in _k:
        NUM_TO_WORD.setdefault(_v, _k)

OPT_TAGS = r"(?:</?(?:a|strong|em|b|i|span|mark|code)\b[^>]*>\s*)*"
SEP = r"(?:\s|</?(?:a|strong|em|b|i|span|mark|code)\b[^>]*>)+"

# Fast count token: compound tens-ones, single word, or 1-3 digit integer; validated via token_to_int().
NUM_TOKEN = (
    r"(?P<n>(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)"
    r"[- ](?:one|two|three|four|five|six|seven|eight|nine)"
    r"|[A-Za-z]+|\d{1,3})"
)
_DECOMP_TOKEN_ALT = (
    r"(?:(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)"
    r"[- ](?:one|two|three|four|five|six|seven|eight|nine)"
    r"|[A-Za-z]+|\d{1,3})"
)

APP_PATTERNS = [
    re.compile(
        r"\b" + NUM_TOKEN + SEP
        + r"(?:filed\s+USPTO\s+(?:patent\s+)?applications?|USPTO\s+(?:provisional\s+|patent\s+)?applications?|"
        r"patents?\s+pending|provisional\s+(?:patent\s+)?applications?|patent\s+applications?)\b",
        re.I,
    ),
    re.compile(r"\bAll\s+" + NUM_TOKEN + r",\s+grouped\s+by\s+primary\s+function\b", re.I),
    re.compile(r'data-scale-uspto-applications="' + NUM_TOKEN + r'"', re.I),
]

FAMILY_PATTERNS = [
    re.compile(
        r"(?:applications?|filings?|patents?\s+pending)" + SEP + r"(?:across|in)"
        + SEP + NUM_TOKEN + SEP + r"(?:patent\s+)?families\b(?!\s+published\s+in\s+full)",
        re.I,
    ),
    re.compile(r'data-scale-uspto-families="' + NUM_TOKEN + r'"', re.I),
]

APP_RE = re.compile(r"\b(\d{2}/\d{3},\d{3})\b")
INTRO_FAMILY_RE = re.compile(
    r'<p class="patent-intro">\s*(?:\d+|[A-Za-z-]+)\s+filed\s+USPTO\s+applications?\s+across\s+'
    + NUM_TOKEN + r"\s+families\b",
    re.I,
)


def word_form(n, like_token):
    w = NUM_TO_WORD.get(n, str(n))
    if like_token[:1].isupper():
        return w[:1].upper() + w[1:]
    return w


def format_like(target_val, tok):
    return str(target_val) if tok.isdigit() else word_form(target_val, tok)


def token_to_int(raw):
    raw_l = raw.strip().lower()
    if raw_l in WORDS:
        return WORDS[raw_l]
    if raw_l.isdigit():
        return int(raw_l)
    return None


def patent_areas_block(text):
    """The FULL `patent-areas` div, nested children included."""
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
    return None


def parse_patent_areas(block):
    """Return list of dicts: [{'name': str, 'description': str, 'apps': [str]}]."""
    areas = []
    pos = 0
    marker = '<div class="patent-area">'
    while True:
        idx = block.find(marker, pos)
        if idx < 0:
            break
        depth = 0
        end_idx = None
        for m in re.finditer(r"<div\b|</div>", block[idx:]):
            if m.group(0) == "</div>":
                depth -= 1
                if depth == 0:
                    end_idx = idx + m.end()
                    break
            else:
                depth += 1
        if end_idx is None:
            break
        sub = block[idx:end_idx]
        pm = re.search(r"<p>\s*<strong>([^<]+)</strong>\s*(.*?)</p>", sub, re.S)
        name = pm.group(1).strip() if pm else ""
        desc = re.sub(r"\s+", " ", pm.group(2).strip()) if pm else ""
        apps = APP_RE.findall(sub)
        areas.append({"name": name, "description": desc, "apps": apps})
        pos = end_idx
    return areas


def enumerated_count(text):
    """Distinct application numbers listed in the patent-areas block."""
    block = patent_areas_block(text)
    if block is None:
        return None, []
    found = APP_RE.findall(block)
    return len(set(found)), found


def derive_patent_truth(text):
    block = patent_areas_block(text)
    if block is None:
        return None
    found = APP_RE.findall(block)
    n_apps = len(set(found))
    areas = parse_patent_areas(block)
    m_fam = INTRO_FAMILY_RE.search(text)
    n_families = token_to_int(m_fam.group("n")) if m_fam else None
    return {
        "n_apps": n_apps,
        "found_apps": found,
        "n_families": n_families,
        "areas": areas,
    }


SCAN_DIRS = [
    "", "letters", "resume", "overview", "frameworks", "research", "resumes",
    "speaker-and-advisory", "agent-infrastructure", "contact", "papers",
    "about", "trackers", "notes", "patents", "data", "privacy",
]
PRUNE_DIRS = {
    ".git", ".claude", ".codex", ".cursor", "_build", "node_modules",
    "_site", "submissions", "vendor",
}


def target_files():
    seen = set()
    for rel in SCAN_DIRS:
        base = ROOT / rel if rel else ROOT
        if not base.is_dir():
            continue
        if rel == "":
            for p in sorted(base.iterdir()):
                if p.is_file() and p.suffix in (".html", ".md") and p not in seen:
                    seen.add(p)
                    yield p
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = sorted(d for d in dirnames if d not in PRUNE_DIRS)
            for name in sorted(filenames):
                if name.endswith(".html") or name.endswith(".md"):
                    p = Path(dirpath) / name
                    if p not in seen:
                        seen.add(p)
                        yield p
    for extra in ("llms.txt", "_config.yml", "sitemap.xml", "AI_Governance_Profile_Content.md"):
        p = ROOT / extra
        if p.is_file() and p not in seen:
            seen.add(p)
            yield p


def plan_line(line, n_apps, n_families):
    if "count-guard-ignore" in line:
        return line, [], []
    spans = []  # (start, end, repl, old, kind, val, expected, snippet)
    seen_ranges = set()

    for pat in APP_PATTERNS:
        for m in pat.finditer(line):
            rng = (m.start("n"), m.end("n"))
            if rng in seen_ranges:
                continue
            tok = m.group("n")
            val = token_to_int(tok)
            if val is None:
                continue
            seen_ranges.add(rng)
            repl = format_like(n_apps, tok)
            spans.append((rng[0], rng[1], repl, tok, "apps_total", val, n_apps, m.group(0).strip()))

    if n_families is not None:
        for pat in FAMILY_PATTERNS:
            for m in pat.finditer(line):
                rng = (m.start("n"), m.end("n"))
                if rng in seen_ranges:
                    continue
                tok = m.group("n")
                val = token_to_int(tok)
                if val is None:
                    continue
                seen_ranges.add(rng)
                repl = format_like(n_families, tok)
                spans.append((rng[0], rng[1], repl, tok, "families_total", val, n_families, m.group(0).strip()))

    hits = [
        {
            "kind": kind,
            "token": old,
            "value": val,
            "expected": exp,
            "text": snippet,
        }
        for (_, _, _, old, kind, val, exp, snippet) in spans
    ]

    drifted = [s for s in spans if s[5] != s[6]]
    if not drifted:
        return line, [], hits

    new = line
    changes = []
    for start, end, repl, old, kind, val, exp, snippet in sorted(drifted, key=lambda s: s[0], reverse=True):
        new = new[:start] + repl + new[end:]
        changes.append((old, repl, kind, val, exp, snippet))
    return new, changes, hits


def check_and_sync_jsonld_areas(index_path, areas, write_mode):
    """Verify (and in --write mode sync) CollectionPage ItemList in patents/index.html."""
    text = index_path.read_text(encoding="utf-8", errors="replace")
    problems = []
    hits = []

    for m in re.finditer(r'<script type="application/ld\+json">\s*(\{.*?\})\s*</script>', text, re.S):
        raw_json = m.group(1)
        try:
            data = json.loads(raw_json)
        except Exception:
            continue
        if data.get("@type") != "CollectionPage":
            continue
        main_ent = data.get("mainEntity") or {}
        if main_ent.get("@type") != "ItemList":
            continue
        items = main_ent.get("itemListElement") or []
        expected_items = [
            {
                "@type": "ListItem",
                "position": idx,
                "name": f"{a['name']} ({len(a['apps'])} filings)",
                "description": a["description"],
            }
            for idx, a in enumerate(areas, start=1)
        ]
        hits.append({
            "file": "patents/index.html",
            "line": text[:m.start()].count("\n") + 1,
            "kind": "jsonld_itemlist",
            "token": str(len(items)),
            "value": len(items),
            "expected": len(expected_items),
            "text": f"CollectionPage ItemList ({len(items)} area items)",
        })
        if main_ent.get("numberOfItems") != len(expected_items) or items != expected_items:
            if write_mode:
                main_ent["numberOfItems"] = len(expected_items)
                main_ent["itemListElement"] = expected_items
                new_json = json.dumps(data, indent=6)
                # Align closing brace indentation with existing script block
                new_json_indented = "\n".join(
                    ("    " + ln if ln else ln) for ln in json.dumps(data, indent=2).splitlines()
                )
                text = text[:m.start(1)] + new_json_indented.lstrip() + text[m.end(1):]
                index_path.write_text(text, encoding="utf-8")
            else:
                problems.append(
                    f"patents/index.html: JSON-LD CollectionPage ItemList disagrees with "
                    f"the {len(expected_items)} <div class=\"patent-area\"> blocks"
                )
    return problems, hits


def check_and_sync_resumes(n_apps, n_families, write_mode):
    """Check and optionally update patent counts in `resumes/Zukowski_Resume_*.docx` and `.pdf`."""
    resumes_dir = ROOT / "resumes"
    if not resumes_dir.is_dir():
        return [], [], 0

    app_pat = re.compile(
        r"\b" + NUM_TOKEN + r"(\s+(?:filed\s+)?USPTO\s+(?:patent\s+)?applications?\b)",
        re.I,
    )
    fam_pat = re.compile(
        r"(applications?\s+(?:across|in)\s+)" + NUM_TOKEN + r"(\s+(?:patent\s+)?families\b)",
        re.I,
    )
    decomp_pat = re.compile(
        r"applications?\s+(?:across|in)\s+(?P<f1>" + _DECOMP_TOKEN_ALT + r")\s+(?:patent\s+)?families\b"
        r".{0,600}?\bthe\s+other\s+(?P<f2>" + _DECOMP_TOKEN_ALT + r")\s+(?:patent\s+)?families\b",
        re.I | re.S,
    )

    problems = []
    hits = []
    changes_count = 0
    modified_docx = []

    for fpath in sorted(resumes_dir.iterdir()):
        rel = f"resumes/{fpath.name}"
        if fpath.suffix == ".docx":
            try:
                with zipfile.ZipFile(fpath, "r") as zf:
                    xml_text = zf.read("word/document.xml").decode("utf-8")
            except Exception:
                continue

            plain = re.sub(r"<[^>]+>", "", xml_text)
            for m in app_pat.finditer(plain):
                val = token_to_int(m.group("n"))
                if val is not None:
                    hits.append({
                        "file": rel, "line": 1, "kind": "resume_docx_apps",
                        "token": m.group("n"), "value": val, "expected": n_apps,
                        "text": m.group(0).strip(),
                    })
                    if val != n_apps and not write_mode:
                        problems.append(
                            f"{rel}: says '{m.group(0).strip()}' but {n_apps} applications are enumerated"
                        )

            if n_families is not None:
                decomp_ranges = [(m.start(), m.end()) for m in decomp_pat.finditer(plain)]
                for m in fam_pat.finditer(plain):
                    if any(ds <= m.start() < de for ds, de in decomp_ranges):
                        continue
                    val = token_to_int(m.group("n"))
                    if val is not None:
                        hits.append({
                            "file": rel, "line": 1, "kind": "resume_docx_families",
                            "token": m.group("n"), "value": val, "expected": n_families,
                            "text": m.group(0).strip(),
                        })
                        if val != n_families and not write_mode:
                            problems.append(
                                f"{rel}: says '{m.group(0).strip()}' but {n_families} families are canonical"
                            )

                for m in decomp_pat.finditer(plain):
                    v1 = token_to_int(m.group("f1"))
                    v2 = token_to_int(m.group("f2"))
                    if v1 is not None and v2 is not None:
                        hits.append({
                            "file": rel, "line": 1, "kind": "resume_docx_family_decomp",
                            "token": f"{m.group('f1')}+{m.group('f2')}",
                            "value": v1 + v2, "expected": n_families,
                            "text": f"{m.group('f1')} families ... the other {m.group('f2')} families",
                        })
                        if v1 + v2 != n_families and not write_mode:
                            problems.append(
                                f"{rel}: family decomposition '{m.group('f1')} + {m.group('f2')}' sums to "
                                f"{v1 + v2}, expected {n_families}"
                            )

            if write_mode:
                new_xml = xml_text

                def _sub_app(m):
                    nonlocal changes_count
                    tok = m.group("n")
                    val = token_to_int(tok)
                    if val is None or val == n_apps:
                        return m.group(0)
                    changes_count += 1
                    repl = format_like(n_apps, tok)
                    s = m.start("n") - m.start(0)
                    e = m.end("n") - m.start(0)
                    full = m.group(0)
                    return full[:s] + repl + full[e:]

                new_xml = app_pat.sub(_sub_app, new_xml)

                if n_families is not None:
                    xml_decomp_ranges = [(m.start(), m.end()) for m in decomp_pat.finditer(new_xml)]

                    def _sub_fam(m):
                        nonlocal changes_count
                        if any(ds <= m.start() < de for ds, de in xml_decomp_ranges):
                            return m.group(0)
                        tok = m.group("n")
                        val = token_to_int(tok)
                        if val is None or val == n_families:
                            return m.group(0)
                        changes_count += 1
                        repl = str(n_families)
                        s = m.start("n") - m.start(0)
                        e = m.end("n") - m.start(0)
                        full = m.group(0)
                        return full[:s] + repl + full[e:]

                    new_xml = fam_pat.sub(_sub_fam, new_xml)

                    def _sub_decomp(m):
                        nonlocal changes_count
                        v1 = token_to_int(m.group("f1"))
                        tok2 = m.group("f2")
                        v2 = token_to_int(tok2)
                        if v1 is None or v2 is None or (v1 + v2 == n_families):
                            return m.group(0)
                        target_v2 = n_families - v1
                        if target_v2 <= 0:
                            return m.group(0)
                        changes_count += 1
                        repl2 = format_like(target_v2, tok2)
                        s = m.start("f2") - m.start(0)
                        e = m.end("f2") - m.start(0)
                        full = m.group(0)
                        return full[:s] + repl2 + full[e:]

                    new_xml = decomp_pat.sub(_sub_decomp, new_xml)

                if new_xml != xml_text:
                    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".docx", dir=str(resumes_dir))
                    os.close(tmp_fd)
                    with zipfile.ZipFile(fpath, "r") as zin, zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zout:
                        for item in zin.infolist():
                            data = new_xml.encode("utf-8") if item.filename == "word/document.xml" else zin.read(item.filename)
                            zout.writestr(item, data)
                    os.replace(tmp_path, fpath)
                    modified_docx.append(fpath)

        elif fpath.suffix == ".pdf" and not write_mode:
            try:
                from pypdf import PdfReader
                reader = PdfReader(str(fpath))
                pdf_text = re.sub(r"\s+", " ", " ".join((p.extract_text() or "") for p in reader.pages))
                for m in app_pat.finditer(pdf_text):
                    val = token_to_int(m.group("n"))
                    if val is not None:
                        hits.append({
                            "file": rel, "line": 1, "kind": "resume_pdf_apps",
                            "token": m.group("n"), "value": val, "expected": n_apps,
                            "text": m.group(0).strip(),
                        })
                        if val != n_apps:
                            problems.append(
                                f"{rel}: PDF says '{m.group(0).strip()}' but {n_apps} applications are enumerated"
                            )
                if n_families is not None:
                    pdf_decomp_ranges = [(m.start(), m.end()) for m in decomp_pat.finditer(pdf_text)]
                    for m in fam_pat.finditer(pdf_text):
                        if any(ds <= m.start() < de for ds, de in pdf_decomp_ranges):
                            continue
                        val = token_to_int(m.group("n"))
                        if val is not None:
                            hits.append({
                                "file": rel, "line": 1, "kind": "resume_pdf_families",
                                "token": m.group("n"), "value": val, "expected": n_families,
                                "text": m.group(0).strip(),
                            })
                            if val != n_families:
                                problems.append(
                                    f"{rel}: PDF says '{m.group(0).strip()}' but {n_families} families are canonical"
                                )
                    for m in decomp_pat.finditer(pdf_text):
                        v1 = token_to_int(m.group("f1"))
                        v2 = token_to_int(m.group("f2"))
                        if v1 is not None and v2 is not None:
                            hits.append({
                                "file": rel, "line": 1, "kind": "resume_pdf_family_decomp",
                                "token": f"{m.group('f1')}+{m.group('f2')}",
                                "value": v1 + v2, "expected": n_families,
                                "text": f"{m.group('f1')} families ... the other {m.group('f2')} families",
                            })
                            if v1 + v2 != n_families:
                                problems.append(
                                    f"{rel}: PDF family decomposition '{m.group('f1')} + {m.group('f2')}' sums to "
                                    f"{v1 + v2}, expected {n_families}"
                                )
            except ImportError:
                pass
            except Exception:
                pass

    if write_mode and modified_docx:
        soffice = shutil.which("soffice") or "/opt/homebrew/bin/soffice"
        if os.path.isfile(soffice):
            for docx_path in modified_docx:
                subprocess.run(
                    [soffice, "--headless", "--convert-to", "pdf", "--outdir", str(resumes_dir), str(docx_path)],
                    check=False,
                    capture_output=True,
                )

    return problems, hits, changes_count


def print_surface_map(truth_info, surface_hits):
    n_apps = truth_info["n_apps"]
    n_fam = truth_info["n_families"]
    w_apps = NUM_TO_WORD.get(n_apps, str(n_apps))
    w_fam = NUM_TO_WORD.get(n_fam, str(n_fam))
    print("=" * 78)
    print("PATENT PORTFOLIO ATOMIC UPDATE MAP")
    print("=" * 78)
    print("Canonical source: patents/index.html (<div class=\"patent-areas\"> + .patent-intro)")
    print(f"  - Filed USPTO applications (N): {n_apps} ('{w_apps}' / '{w_apps.capitalize()}')")
    print(f"  - Patent families (F):          {n_fam} ('{w_fam}' / '{w_fam.capitalize()}')")
    print(f"  - Problem areas (K):            {len(truth_info['areas'])}")
    for idx, a in enumerate(truth_info["areas"], start=1):
        print(f"      {idx}. {a['name']} ({len(a['apps'])} filings)")
    print("-" * 78)
    by_file = {}
    for h in surface_hits:
        by_file.setdefault(h["file"], []).append(h)
    print(f"Tracked surfaces ({len(surface_hits)} verified mentions across {len(by_file)} files/artifacts):")
    for f in sorted(by_file):
        items = by_file[f]
        kinds = sorted({x["kind"] for x in items})
        lines = sorted({x["line"] for x in items})
        line_str = ", ".join(f"L{ln}" for ln in lines[:8])
        if len(lines) > 8:
            line_str += f", ... (+{len(lines) - 8} more)"
        print(f"  {f:52s} [{len(items):2d} hit(s)] ({', '.join(kinds)}) @ {line_str}")
    print("-" * 78)
    print("Atomic update workflow when a new patent application is filed:")
    print("  1. Add the filing <li>...<span class=\"filing-no\">XX/XXX,XXX</span></li> to patents/index.html")
    print("     (and update the family number in <p class=\"patent-intro\"> if it opens a new family)")
    print("  2. Run: python3 scripts/check_patent_count.py --write  (or: npm run sync:counts)")
    print("     (updates all HTML, meta/OG/Twitter, JSON-LD ItemList, llms.txt, sitemap.xml,")
    print("      resumes/*.docx, and regenerates resumes/*.pdf via LibreOffice soffice)")
    print("=" * 78)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--quiet", action="store_true", help="only print on failure")
    ap.add_argument("--write", action="store_true", help="rewrite drifted mentions in place")
    ap.add_argument("--check", action="store_true", help="check mode (default)")
    ap.add_argument("--map", action="store_true", help="print full atomic surface map")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    index = ROOT / "patents" / "index.html"
    if not index.is_file() or '<div class="patent-areas">' not in index.read_text(errors="replace"):
        index = ROOT / "index.html"
    if not index.is_file():
        sys.exit("check_patent_count: neither patents/index.html nor index.html found")
    text = index.read_text(errors="replace")

    truth_info = derive_patent_truth(text)
    if truth_info is None:
        sys.exit(
            "check_patent_count: no <div class=\"patent-areas\"> block found. The guard "
            "derives ground truth from that enumeration; if the page was restructured, "
            "update this script rather than deleting it."
        )

    truth = truth_info["n_apps"]
    n_families = truth_info["n_families"]
    found = truth_info["found_apps"]

    dupes = {a for a in found if found.count(a) > 1}
    problems = []
    if dupes:
        problems.append(f"duplicate application number(s) in the enumeration: {sorted(dupes)}")

    surface_hits = []
    total_written = 0

    for p in target_files():
        rel = str(p.relative_to(ROOT)).replace(os.sep, "/")
        try:
            body = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        lines = body.split("\n")
        file_changed = False
        for i, line in enumerate(lines):
            # In patents/index.html, <p class="patent-intro"> is the source of truth for n_families,
            # while its application count must still match the enumerated `truth`.
            new_line, changes, hits = plan_line(line, truth, n_families)
            for h in hits:
                surface_hits.append({"file": rel, "line": i + 1, **h})
            if changes:
                if args.write:
                    lines[i] = new_line
                    file_changed = True
                    total_written += len(changes)
                else:
                    for old, repl, kind, val, exp, snippet in changes:
                        noun = "applications" if kind == "apps_total" else "families"
                        problems.append(
                            f"{rel}:{i + 1}: says '{snippet}' ({val}) but {exp} {noun} "
                            f"are canonical (expected '{repl}')"
                        )
        if args.write and file_changed:
            p.write_text("\n".join(lines), encoding="utf-8")

    # JSON-LD ItemList parity on patents/index.html
    if index.name == "index.html" and index.parent.name == "patents":
        j_probs, j_hits = check_and_sync_jsonld_areas(index, truth_info["areas"], args.write)
        problems.extend(j_probs)
        surface_hits.extend(j_hits)

    # Resumes DOCX and PDF
    r_probs, r_hits, r_written = check_and_sync_resumes(truth, n_families, args.write)
    problems.extend(r_probs)
    surface_hits.extend(r_hits)
    total_written += r_written

    checked = len(surface_hits)

    if args.map:
        print_surface_map(truth_info, surface_hits)

    if args.json:
        print(json.dumps({
            "n_applications": truth,
            "n_families": n_families,
            "areas": [{"name": a["name"], "count": len(a["apps"])} for a in truth_info["areas"]],
            "mentions_checked": checked,
            "problems": problems,
            "ok": not problems,
        }, indent=2))
        return 1 if problems else 0

    if args.write:
        if problems:
            print(f"check_patent_count: FAIL. {len(problems)} problem(s) could not be auto-written:")
            for p_ in problems:
                print("  " + p_)
            return 1
        print(
            f"check_patent_count: wrote {total_written} change(s); all {checked} patent-count "
            f"and family-count mention(s) agree with N = {truth} applications across "
            f"F = {n_families} families."
        )
        return 0

    if problems:
        print(f"check_patent_count: FAIL. {len(problems)} problem(s).")
        for p_ in problems:
            print("  " + p_)
        print(f"\nGround truth is the patent-areas enumeration: {truth} distinct applications "
              f"across {n_families} families.")
        print("Run `python3 scripts/check_patent_count.py --write` to sync automatically.")
        return 1

    if not args.quiet:
        print(
            f"check_patent_count: OK. All {checked} patent-count and family-count mention(s) "
            f"agree with N = {truth} ('{NUM_TO_WORD.get(truth, truth)}') applications across "
            f"F = {n_families} ('{NUM_TO_WORD.get(n_families, n_families)}') families."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
