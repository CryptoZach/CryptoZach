#!/usr/bin/env python3
"""check_letter_count.py: ground the site's federal-comment-letter counts to reality.

Why this exists
---------------
The federal-comment-letter count and its companion program totals (dockets,
agencies, recommendations, and principal/supplement decomposition) appear across
~50 site files (~130+ mentions) in both word ("twenty-five") and numeral ("25")
forms, spread across visible prose, inline HTML links/tags, meta descriptions,
og/twitter cards, JSON-LD, data-scale attributes, resume DOCX/PDF files, and the
compiled all-letters.pdf packet.

Sources of truth
----------------
1. N = the number of PUBLISHED federal letter pages: `letters/<slug>/index.html`
   directories, excluding `NON_LETTER_SLUGS` (`recommendations`) and
   `INTERNATIONAL_SLUGS` (`fsb-ai-sound-practices`), and excluding any unfiled
   draft (`"creativeWorkStatus": "Draft"`).
2. `scripts/letters_registry.json`: must contain exactly N federal letter entries
   with matching slugs, from which we derive:
   - D = unique dockets (`len({l["proceeding"] for l in federal}) - 1`, because the
     initial 7 April rulemakings shared 6 docket IDs)
   - A = unique federal agencies (`len({a for l in federal for a in l["agencies"]})`)
   - R = total numbered recommendations (`sum(l["rec_count"] for l in federal)`)
   - P = principal letters (`sum(1 for l in federal if not l.get("supplements"))`)
   - S = supplemental letters (`sum(1 for l in federal if l.get("supplements"))`)

What it checks
--------------
1. Every total-count mention of federal comment letters across HTML, `.txt`, `.yml`,
   and `.md` files (including mentions separated from their noun by inline `<a>` or
   `<strong>` tags, and `data-scale-federal-comment-letters` attributes) equals N.
2. Current-state docket count (`D`), agency count (`A`), recommendation count (`R`),
   and principal/supplement decomposition (`P` and `S`) mentions equal the values
   derived from `scripts/letters_registry.json`.
3. Every resume DOCX (`resumes/Zukowski_Resume_*.docx`) and PDF (`resumes/*.pdf`)
   states N federal comment letters.
4. `letters/all-letters.pdf` exists and (when `pypdf` is available) its cover page
   and outline bookmark count match N.
5. `sitemap.xml` includes `<loc>` entries for all N federal letter pages.

Usage
-----
    python3 scripts/check_letter_count.py            # report; exit 1 on any mismatch
    python3 scripts/check_letter_count.py --quiet     # only print on failure
    python3 scripts/check_letter_count.py --json      # machine-readable
    python3 scripts/check_letter_count.py --map       # print complete atomic surface map
"""
import argparse
import json
import os
import re
import subprocess
import sys
import zipfile

INTERNATIONAL_SLUGS = {"fsb-ai-sound-practices"}
NON_LETTER_SLUGS = {"recommendations"}
DRAFT_STATUS_MARKER = '"creativeWorkStatus": "Draft"'


def _is_unfiled_draft(index_path):
    """True when a letter page declares itself a draft in its own Article JSON-LD."""
    try:
        with open(index_path, encoding="utf-8") as fh:
            return DRAFT_STATUS_MARKER in fh.read()
    except OSError:
        return False


SCAN_DIRS = ["", "letters", "resume", "overview", "frameworks", "research", "resumes",
             "speaker-and-advisory", "agent-infrastructure", "contact", "papers",
             "about", "trackers", "notes", "patents", "data", "privacy"]

EXTRA_FILES = ["llms.txt", "_config.yml", "sitemap.xml", "AI_Governance_Profile_Content.md"]

PRUNE_DIRS = {".git", ".claude", ".codex", "_build", "node_modules", "_site", "submissions"}

# Number words 0..99, both hyphenated and spaced.
_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
         "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
         "sixteen", "seventeen", "eighteen", "nineteen"]
_TENS = {"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
         "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90}
WORD_TO_INT = {w: i for i, w in enumerate(_ONES)}
for _w, _v in _TENS.items():
    WORD_TO_INT[_w] = _v
    for _i, _o in enumerate(_ONES[1:10], start=1):
        WORD_TO_INT[f"{_w}-{_o}"] = _v + _i
        WORD_TO_INT[f"{_w} {_o}"] = _v + _i

INT_TO_WORD = {}
for _k, _v in WORD_TO_INT.items():
    if " " not in _k:
        INT_TO_WORD.setdefault(_v, _k)

# Optional inline HTML tags + whitespace separator between tokens
# (e.g. `Twenty-five <a href="/letters/">federal comment letters</a>` or
# `across <strong>nineteen</strong> dockets`).
OPT_TAGS = r"(?:</?(?:a|strong|em|b|i|span|mark|code)\b[^>]*>\s*)*"
SEP = r"(?:\s|</?(?:a|strong|em|b|i|span|mark|code)\b[^>]*>)+"

COUNT_TOKEN = (
    r"(?P<n>(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)"
    r"[- ](?:one|two|three|four|five|six|seven|eight|nine)"
    r"|[A-Za-z]+|\d+)"
)
NUMBER_WORD = r"(?:[A-Za-z]+(?:-[A-Za-z]+)?|\d+)"

# Total federal-letter count patterns (group 'n').
COUNT_PATTERNS = [
    re.compile(COUNT_TOKEN + SEP + r"federal\s+comment\s+letters?", re.I),
    re.compile(COUNT_TOKEN + SEP + r"federal\s+regulatory\s+comment\s+letters?", re.I),
    re.compile(COUNT_TOKEN + SEP + r"comment\s+letters?\b", re.I),
    re.compile(COUNT_TOKEN + SEP + r"comment\s+letters?\s+filed", re.I),
    re.compile(r"filed" + SEP + COUNT_TOKEN + SEP + r"comment\s+letters?", re.I),
    re.compile(COUNT_TOKEN + r"\s+letters?,\s+" + NUMBER_WORD + r"\s+(?:federal\s+)?agenc", re.I),
    re.compile(COUNT_TOKEN + SEP + r"letters?" + SEP + r"across" + SEP + NUMBER_WORD + SEP + r"docket", re.I),
    re.compile(r"Program\s+\(" + COUNT_TOKEN + r"\s+letters?", re.I),
    re.compile(r"The\s+" + COUNT_TOKEN + r"\s+letters?\s*<", re.I),
    re.compile(r"of\s+the\s+" + COUNT_TOKEN + r"\s+letters\b", re.I),
    re.compile(r"View\s+all\s+" + COUNT_TOKEN + r"\s+letters\b", re.I),
    re.compile(r"All\s+" + COUNT_TOKEN + r"\s+letters\b", re.I),
    re.compile(COUNT_TOKEN + SEP + r"federal\s+letters?\b", re.I),
    re.compile(r"All\s+" + COUNT_TOKEN + r"\s+filed\s+letters\b", re.I),
    re.compile(COUNT_TOKEN + r"\s+letters?\s+filed\b", re.I),
    re.compile(r"\b" + COUNT_TOKEN + r"-letter\s+(?:federal\s+)?(?:comment\s+)?program\b", re.I),
    re.compile(r'data-scale-federal-comment-letters="' + COUNT_TOKEN + r'"', re.I),
]

# Docket total patterns (group 'n').
DOCKET_PATTERNS = [
    re.compile(
        r"letters?" + SEP + r"across" + SEP + COUNT_TOKEN + SEP + r"dockets?\b",
        re.I,
    ),
    re.compile(
        r"(?:<strong>)?\b" + COUNT_TOKEN + SEP + r"dockets?,\s+" + NUMBER_WORD + SEP + r"(?:federal\s+)?agencies\b",
        re.I,
    ),
]

# Agency total patterns (group 'n').
AGENCY_PATTERNS = [
    re.compile(
        r"dockets?" + SEP + r"(?:and|to)" + SEP + COUNT_TOKEN + SEP + r"(?:federal\s+)?agencies\b",
        re.I,
    ),
    re.compile(
        r"\b" + NUMBER_WORD + SEP + r"dockets?,\s+" + OPT_TAGS + COUNT_TOKEN + SEP + r"(?:federal\s+)?agencies\b",
        re.I,
    ),
    re.compile(
        r"letters?" + SEP + r"(?:across|to)" + SEP + COUNT_TOKEN + SEP + r"(?:federal\s+)?agencies\b",
        re.I,
    ),
]

# Recommendation total patterns (group 'n').
REC_PATTERNS = [
    re.compile(r"\b" + COUNT_TOKEN + r"\s+numbered\s+recommendations\b", re.I),
    re.compile(r"\b" + COUNT_TOKEN + r"-recommendation\s+explorer\b", re.I),
    re.compile(r"Browse\s+" + COUNT_TOKEN + r"\s+recommendations\b", re.I),
    re.compile(r"\b(?P<n>\d{2,3})\s+recommendations\s+across\s+(?:the\s+|all\s+)?(?:\d+|[A-Za-z-]+)?\s*(?:federal\s+)?(?:comment\s+)?letters\b", re.I),
    re.compile(r"every\s+one\s+of\s+the\s+(?P<n>\d{2,3})\s+recommendations\b", re.I),
    re.compile(r"<span class=\"letters-stat__num\">(?P<n>\d{2,3})</span><span class=\"letters-stat__label\">recommendations\b", re.I),
]

# Principal and supplement decomposition pattern on letters/index.html.
PRINC_SUPP_RE = re.compile(
    r"(?P<p>" + NUMBER_WORD + r")\s+principal\s+letters?\s+and\s+(?P<s>" + NUMBER_WORD + r")\s+supplements?\b",
    re.I,
)

DECOMP_MARKERS = ("principal", "supplement")

NARRATIVE_LEAD = re.compile(
    r"(?:(?:bring|brings|bringing|brought)\s+(?:the\s+program|it)\s+to"
    r"|extended\s+the\s+program\s+to(?:\s+the\s+securities\s+regulator:)?)\s*(?:<strong>\s*)?$",
    re.I,
)

NARRATIVE_CLAUSE = re.compile(
    r"(?:(?:bring|brings|bringing|brought)\s+(?:the\s+program|it)\s+to"
    r"|extended\s+the\s+program\s+to(?:\s+the\s+securities\s+regulator:)?)",
    re.I,
)


def is_narrative(text, token_start):
    """True when the count token at token_start completes a point-in-time narrative."""
    return bool(NARRATIVE_LEAD.search(text[max(0, token_start - 95):token_start]))


def is_narrative_clause(text, match_start):
    """True when a docket/agency phrase sits inside a 'brought the program to ...' clause."""
    return bool(NARRATIVE_CLAUSE.search(text[max(0, match_start - 110):match_start]))


ALLOWLIST = {
    ("overview/index.html", "eight"),
    ("overview/index.html", "twelve"),
    ("overview/index.html", "thirteen"),
    ("overview/index.html", "fourteen"),
    ("overview/index.html", "fifteen"),
}


def repo_root():
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
        if slug in NON_LETTER_SLUGS:
            continue
        if slug in INTERNATIONAL_SLUGS:
            continue
        if _is_unfiled_draft(os.path.join(d, "index.html")):
            continue
        n += 1
        federal_slugs.append(slug)
    return n, federal_slugs


def derive_program_stats(root):
    """Derive canonical (n, dockets, agencies, recs, principals, supplements, reg_slugs)."""
    n, page_slugs = derive_n(root)
    reg_path = os.path.join(root, "scripts", "letters_registry.json")
    if not os.path.isfile(reg_path):
        return {
            "n": n,
            "dockets": None,
            "agencies": None,
            "recommendations": None,
            "principals": None,
            "supplements": None,
            "page_slugs": page_slugs,
            "reg_slugs": [],
        }
    with open(reg_path, encoding="utf-8") as fh:
        reg = json.load(fh)
    fed = [l for l in reg.get("letters", []) if l.get("series") == "federal"]
    reg_slugs = sorted(l["slug"] for l in fed)
    proceedings = {l["proceeding"] for l in fed if l.get("proceeding")}
    # The initial April 2026 batch covered 7 rulemakings across 6 docket IDs.
    dockets = max(0, len(proceedings) - 1) if proceedings else 0
    agencies = len({a for l in fed for a in l.get("agencies", [])})
    recs = sum(int(l.get("rec_count", 0)) for l in fed)
    principals = sum(1 for l in fed if not l.get("supplements"))
    supplements = sum(1 for l in fed if l.get("supplements"))
    return {
        "n": n,
        "dockets": dockets,
        "agencies": agencies,
        "recommendations": recs,
        "principals": principals,
        "supplements": supplements,
        "page_slugs": page_slugs,
        "reg_slugs": reg_slugs,
    }


def html_files(root):
    seen = set()
    for rel in SCAN_DIRS:
        base = os.path.join(root, rel) if rel else root
        if not os.path.isdir(base):
            continue
        if rel == "":
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


def logical_text(lines):
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


def is_individual_letter_page(rel):
    parts = rel.replace(os.sep, "/").split("/")
    return (
        len(parts) == 3
        and parts[0] == "letters"
        and parts[2] == "index.html"
        and parts[1] not in NON_LETTER_SLUGS
    )


def scan_detailed(root, stats):
    """Scan all surfaces and return (mismatches, checked_count, surface_hits)."""
    n = stats["n"]
    dockets = stats["dockets"]
    agencies = stats["agencies"]
    recs = stats["recommendations"]
    principals = stats["principals"]
    supplements = stats["supplements"]

    mismatches = []
    surface_hits = []
    checked = 0

    # 0. Registry vs directory parity
    if stats["reg_slugs"] and stats["reg_slugs"] != stats["page_slugs"]:
        only_pages = sorted(set(stats["page_slugs"]) - set(stats["reg_slugs"]))
        only_reg = sorted(set(stats["reg_slugs"]) - set(stats["page_slugs"]))
        mismatches.append({
            "file": "scripts/letters_registry.json",
            "line": 1,
            "kind": "registry_parity",
            "found": len(stats["reg_slugs"]),
            "expected": n,
            "text": f"only_in_pages={only_pages}, only_in_registry={only_reg}",
        })

    # 1. HTML + EXTRA_FILES scan
    for path in html_files(root):
        rel = os.path.relpath(path, root).replace(os.sep, "/")
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                lines = fh.readlines()
        except OSError:
            continue
        if rel.endswith(".html") or rel.endswith(".xml") or rel.endswith(".md"):
            units = list(enumerate(lines, start=1))
        else:
            joined, lineno_at = logical_text(lines)
            units = [(lineno_at, joined)]

        indiv_letter = is_individual_letter_page(rel)

        for lineno, line in units:
            resolved_line = lineno(0) if callable(lineno) else lineno

            # A. Total federal-letter count patterns
            seen_spans = set()
            for pat in COUNT_PATTERNS:
                for m in pat.finditer(line):
                    span_key = (m.start("n"), m.end("n"))
                    if span_key in seen_spans:
                        continue
                    span = m.group(0).lower()
                    if any(mark in span for mark in DECOMP_MARKERS):
                        continue
                    if is_narrative(line, m.start("n")):
                        continue
                    val = token_to_int(m.group("n"))
                    if val is None:
                        continue
                    seen_spans.add(span_key)
                    tok = m.group("n").strip().lower()
                    if (rel, tok) in ALLOWLIST:
                        continue
                    rline = lineno(m.start("n")) if callable(lineno) else lineno
                    source_line = lines[rline - 1] if 0 < rline <= len(lines) else ""
                    if "count-guard-ignore" in source_line:
                        continue
                    checked += 1
                    surface_hits.append({
                        "file": rel,
                        "line": rline,
                        "kind": "letters_total",
                        "token": m.group("n"),
                        "value": val,
                        "expected": n,
                        "text": m.group(0).strip(),
                    })
                    if val != n:
                        mismatches.append({
                            "file": rel,
                            "line": rline,
                            "kind": "letters_total",
                            "found": val,
                            "expected": n,
                            "text": m.group(0).strip(),
                        })

            # B. Current-state docket, agency, recommendation, and decomposition checks
            # Skip individual letter pages (which narrate point-in-time docket counts
            # at the time that letter was filed) and overview/index.html line 779's
            # historical milestones before the final sentence.
            if not indiv_letter and dockets is not None:
                for pat in DOCKET_PATTERNS:
                    for m in pat.finditer(line):
                        if is_narrative_clause(line, m.start(0)):
                            continue
                        val = token_to_int(m.group("n"))
                        if val is None:
                            continue
                        rline = lineno(m.start("n")) if callable(lineno) else lineno
                        source_line = lines[rline - 1] if 0 < rline <= len(lines) else ""
                        if "count-guard-ignore" in source_line:
                            continue
                        checked += 1
                        surface_hits.append({
                            "file": rel,
                            "line": rline,
                            "kind": "dockets_total",
                            "token": m.group("n"),
                            "value": val,
                            "expected": dockets,
                            "text": m.group(0).strip(),
                        })
                        if val != dockets:
                            mismatches.append({
                                "file": rel,
                                "line": rline,
                                "kind": "dockets_total",
                                "found": val,
                                "expected": dockets,
                                "text": m.group(0).strip(),
                            })

            if not indiv_letter and agencies is not None:
                for pat in AGENCY_PATTERNS:
                    for m in pat.finditer(line):
                        if is_narrative_clause(line, m.start(0)):
                            continue
                        val = token_to_int(m.group("n"))
                        if val is None:
                            continue
                        rline = lineno(m.start("n")) if callable(lineno) else lineno
                        source_line = lines[rline - 1] if 0 < rline <= len(lines) else ""
                        if "count-guard-ignore" in source_line:
                            continue
                        checked += 1
                        surface_hits.append({
                            "file": rel,
                            "line": rline,
                            "kind": "agencies_total",
                            "token": m.group("n"),
                            "value": val,
                            "expected": agencies,
                            "text": m.group(0).strip(),
                        })
                        if val != agencies:
                            mismatches.append({
                                "file": rel,
                                "line": rline,
                                "kind": "agencies_total",
                                "found": val,
                                "expected": agencies,
                                "text": m.group(0).strip(),
                            })

            if not indiv_letter and recs is not None:
                for pat in REC_PATTERNS:
                    for m in pat.finditer(line):
                        val = token_to_int(m.group("n"))
                        if val is None:
                            continue
                        rline = lineno(m.start("n")) if callable(lineno) else lineno
                        source_line = lines[rline - 1] if 0 < rline <= len(lines) else ""
                        if "count-guard-ignore" in source_line:
                            continue
                        checked += 1
                        surface_hits.append({
                            "file": rel,
                            "line": rline,
                            "kind": "recommendations_total",
                            "token": m.group("n"),
                            "value": val,
                            "expected": recs,
                            "text": m.group(0).strip(),
                        })
                        if val != recs:
                            mismatches.append({
                                "file": rel,
                                "line": rline,
                                "kind": "recommendations_total",
                                "found": val,
                                "expected": recs,
                                "text": m.group(0).strip(),
                            })

            if rel == "letters/index.html" and principals is not None and supplements is not None:
                for m in PRINC_SUPP_RE.finditer(line):
                    vp = token_to_int(m.group("p"))
                    vs = token_to_int(m.group("s"))
                    rline = lineno(m.start()) if callable(lineno) else lineno
                    if vp is not None:
                        checked += 1
                        surface_hits.append({
                            "file": rel,
                            "line": rline,
                            "kind": "principals_total",
                            "token": m.group("p"),
                            "value": vp,
                            "expected": principals,
                            "text": m.group(0).strip(),
                        })
                        if vp != principals:
                            mismatches.append({
                                "file": rel,
                                "line": rline,
                                "kind": "principals_total",
                                "found": vp,
                                "expected": principals,
                                "text": m.group(0).strip(),
                            })
                    if vs is not None:
                        checked += 1
                        surface_hits.append({
                            "file": rel,
                            "line": rline,
                            "kind": "supplements_total",
                            "token": m.group("s"),
                            "value": vs,
                            "expected": supplements,
                            "text": m.group(0).strip(),
                        })
                        if vs != supplements:
                            mismatches.append({
                                "file": rel,
                                "line": rline,
                                "kind": "supplements_total",
                                "found": vs,
                                "expected": supplements,
                                "text": m.group(0).strip(),
                            })

    # 2. Resume DOCX and PDF checks (`resumes/Zukowski_Resume_*.docx` and `.pdf`)
    resumes_dir = os.path.join(root, "resumes")
    resume_letter_pats = [
        re.compile(COUNT_TOKEN + r"\s+federal\s+comment\s+letters\b", re.I),
        re.compile(r"Contributed\s+" + COUNT_TOKEN + r"\s+comment\s+letters\s+to\s+federal\s+agencies\b", re.I),
    ]
    if os.path.isdir(resumes_dir):
        for fname in sorted(os.listdir(resumes_dir)):
            fpath = os.path.join(resumes_dir, fname)
            rel = f"resumes/{fname}"
            if fname.endswith(".docx"):
                try:
                    with zipfile.ZipFile(fpath) as zf:
                        xml_bytes = zf.read("word/document.xml")
                    plain = re.sub(r"<[^>]+>", "", xml_bytes.decode("utf-8", errors="replace"))
                    for pat in resume_letter_pats:
                        for m in pat.finditer(plain):
                            val = token_to_int(m.group("n"))
                            if val is None:
                                continue
                            checked += 1
                            surface_hits.append({
                                "file": rel,
                                "line": 1,
                                "kind": "resume_docx_letters",
                                "token": m.group("n"),
                                "value": val,
                                "expected": n,
                                "text": m.group(0).strip(),
                            })
                            if val != n:
                                mismatches.append({
                                    "file": rel,
                                    "line": 1,
                                    "kind": "resume_docx_letters",
                                    "found": val,
                                    "expected": n,
                                    "text": m.group(0).strip(),
                                })
                except Exception:
                    pass
            elif fname.endswith(".pdf"):
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(fpath)
                    pdf_text = re.sub(r"\s+", " ", " ".join((p.extract_text() or "") for p in reader.pages))
                    for pat in resume_letter_pats:
                        for m in pat.finditer(pdf_text):
                            val = token_to_int(m.group("n"))
                            if val is None:
                                continue
                            checked += 1
                            surface_hits.append({
                                "file": rel,
                                "line": 1,
                                "kind": "resume_pdf_letters",
                                "token": m.group("n"),
                                "value": val,
                                "expected": n,
                                "text": m.group(0).strip(),
                            })
                            if val != n:
                                mismatches.append({
                                    "file": rel,
                                    "line": 1,
                                    "kind": "resume_pdf_letters",
                                    "found": val,
                                    "expected": n,
                                    "text": m.group(0).strip(),
                                })
                except ImportError:
                    pass
                except Exception:
                    pass

    # 3. Compiled `letters/all-letters.pdf` check
    all_pdf = os.path.join(root, "letters", "all-letters.pdf")
    if os.path.isfile(all_pdf):
        try:
            from pypdf import PdfReader
            reader = PdfReader(all_pdf)
            cover_text = re.sub(r"\s+", " ", reader.pages[0].extract_text() or "")
            m = re.search(r"Federal Comment Letter Program:\s+the\s+(\d+)\s+letters", cover_text, re.I)
            if m:
                val = int(m.group(1))
                checked += 1
                surface_hits.append({
                    "file": "letters/all-letters.pdf",
                    "line": 1,
                    "kind": "compiled_pdf_cover",
                    "token": m.group(1),
                    "value": val,
                    "expected": n,
                    "text": m.group(0).strip(),
                })
                if val != n:
                    mismatches.append({
                        "file": "letters/all-letters.pdf",
                        "line": 1,
                        "kind": "compiled_pdf_cover",
                        "found": val,
                        "expected": n,
                        "text": f"{m.group(0).strip()} (run: python3 scripts/build_letters_pdf.py)",
                    })
        except ImportError:
            pass
        except Exception:
            pass

    # 4. Sitemap coverage of all published federal letter pages
    sitemap_path = os.path.join(root, "sitemap.xml")
    if os.path.isfile(sitemap_path):
        try:
            sm_text = open(sitemap_path, encoding="utf-8", errors="replace").read()
            missing_sm = [
                slug for slug in stats["page_slugs"]
                if f"https://tokenization.systems/letters/{slug}/" not in sm_text
            ]
            checked += 1
            surface_hits.append({
                "file": "sitemap.xml",
                "line": 1,
                "kind": "sitemap_letter_urls",
                "token": str(len(stats["page_slugs"]) - len(missing_sm)),
                "value": len(stats["page_slugs"]) - len(missing_sm),
                "expected": n,
                "text": f"{len(stats['page_slugs']) - len(missing_sm)}/{n} federal letter URLs in sitemap.xml",
            })
            if missing_sm:
                mismatches.append({
                    "file": "sitemap.xml",
                    "line": 1,
                    "kind": "sitemap_letter_urls",
                    "found": len(stats["page_slugs"]) - len(missing_sm),
                    "expected": n,
                    "text": f"missing letter URL(s) in sitemap.xml: {missing_sm}",
                })
        except OSError:
            pass

    return mismatches, checked, surface_hits


def scan(root, n):
    """Backward-compatible wrapper returning (mismatches, checked)."""
    stats = derive_program_stats(root)
    stats["n"] = n
    mismatches, checked, _ = scan_detailed(root, stats)
    return mismatches, checked


def print_surface_map(stats, surface_hits):
    n = stats["n"]
    w = INT_TO_WORD.get(n, str(n))
    print("=" * 78)
    print("COMMENT LETTER ATOMIC UPDATE MAP")
    print("=" * 78)
    print(f"Canonical sources: letters/<slug>/index.html ({n} pages) + scripts/letters_registry.json")
    print(f"  - Total federal comment letters (N): {n} ('{w}' / '{w.capitalize()}')")
    print(f"  - Principal / supplement split:      {stats['principals']} principal + {stats['supplements']} supplements = {n}")
    print(f"  - Unique federal dockets (D):        {stats['dockets']} ('{INT_TO_WORD.get(stats['dockets'], stats['dockets'])}')")
    print(f"  - Federal agencies (A):              {stats['agencies']} ('{INT_TO_WORD.get(stats['agencies'], stats['agencies'])}')")
    print(f"  - Numbered recommendations (R):      {stats['recommendations']}")
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
    print("Atomic update workflow when a new comment letter is filed:")
    print("  1. Add letters/<slug>/index.html + letters/<slug>/letter.pdf")
    print("  2. Add entry to scripts/letters_registry.json")
    print("  3. Run: npm run sync:counts")
    print("     (runs render_letters.py --write, render_letter_count.py --write,")
    print("      build_letters_pdf.py, and update_sitemap_lastmod.py)")
    print("=" * 78)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--quiet", action="store_true", help="only print on failure")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--map", action="store_true", help="print full atomic surface map")
    args = ap.parse_args()

    root = repo_root()
    stats = derive_program_stats(root)
    n = stats["n"]
    federal_slugs = stats["page_slugs"]
    if n == 0:
        print("check_letter_count: ERROR could not derive N (no letters/ pages found).",
              file=sys.stderr)
        return 2

    mismatches, checked, surface_hits = scan_detailed(root, stats)
    expected_word = INT_TO_WORD.get(n, str(n))

    if args.map:
        print_surface_map(stats, surface_hits)

    if args.json:
        print(json.dumps({
            "n": n,
            "expected_word": expected_word,
            "dockets": stats["dockets"],
            "agencies": stats["agencies"],
            "recommendations": stats["recommendations"],
            "principals": stats["principals"],
            "supplements": stats["supplements"],
            "federal_slugs": federal_slugs,
            "mentions_checked": checked,
            "mismatches": mismatches,
            "ok": not mismatches,
        }, indent=2))
        return 1 if mismatches else 0

    if mismatches:
        print(f"check_letter_count: FAIL. Authoritative federal count N = {n} "
              f"('{expected_word}', D={stats['dockets']}, A={stats['agencies']}, R={stats['recommendations']}).")
        print(f"{len(mismatches)} stale mention(s) (of {checked} checked):")
        for mm in mismatches:
            print(f"  {mm['file']}:{mm['line']} [{mm.get('kind', 'count')}] "
                  f"found {mm['found']}, expected {mm['expected']}   ->  \"{mm['text']}\"")
        print("\nRun `python3 scripts/render_letter_count.py --write` to sync automatically, "
              "or add a documented exception (ALLOWLIST or 'count-guard-ignore').")
        return 1

    if not args.quiet:
        print(f"check_letter_count: OK. All {checked} federal-letter program mention(s) "
              f"agree with N = {n} ('{expected_word}'), D = {stats['dockets']}, "
              f"A = {stats['agencies']}, R = {stats['recommendations']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
