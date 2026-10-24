#!/usr/bin/env python3
"""render_letter_count.py: sync every federal-comment-letter program count to reality.

Build-time injection for the letter program counts:
  - Total federal comment letters (N, derived from `letters/<slug>/index.html`)
  - Unique federal dockets (D, derived from `scripts/letters_registry.json`)
  - Unique federal agencies (A, derived from `scripts/letters_registry.json`)
  - Numbered recommendations (R, derived from `scripts/letters_registry.json`)
  - Principal and supplement counts (P and S, derived from `scripts/letters_registry.json`)
  - Resume DOCX (`resumes/Zukowski_Resume_*.docx`) and PDF (`resumes/*.pdf`) counts

Rewrites every count mention across served HTML, `llms.txt`, `_config.yml`, `sitemap.xml`,
`AI_Governance_Profile_Content.md`, and `resumes/*.docx` (+ regenerates `resumes/*.pdf` via
LibreOffice `soffice` when any DOCX changes) in the form each surface already uses
(word "twenty-five" vs numeral "25", capitalization preserved).

Author workflow when a letter is filed and its page is published:
    python3 scripts/render_letter_count.py --write   (or: npm run build:letter-count)

Modes:
    --check  (default) list any drifted mention; exit 1 on drift
    --write  rewrite every drifted mention in place
    --map    print the full atomic surface map
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_letter_count as clc  # noqa: E402


def word_form(n, like_token):
    """Word form of n, matching the capitalization of like_token."""
    w = clc.INT_TO_WORD.get(n, str(n))
    if like_token[:1].isupper():
        return w[:1].upper() + w[1:]
    return w


def format_like(target_val, tok, rel=""):
    if tok.isdigit():
        return str(target_val)
    w = word_form(target_val, tok)
    rel_norm = rel.replace(os.sep, "/")
    if "-" in w and not rel_norm.startswith("letters/"):
        return str(target_val)
    return w


def plan_line(line, stats, rel):
    """Return (new_line, [changes]) applying program count rewrites on one line."""
    if "count-guard-ignore" in line:
        return line, []

    n = stats["n"]
    dockets = stats["dockets"]
    agencies = stats["agencies"]
    recs = stats["recommendations"]
    principals = stats["principals"]
    supplements = stats["supplements"]
    indiv_letter = clc.is_individual_letter_page(rel)

    spans = []  # (start, end, replacement, old, label)

    # 1. Total federal letter count
    for pat in clc.COUNT_PATTERNS:
        for m in pat.finditer(line):
            span_text = m.group(0).lower()
            if any(mark in span_text for mark in clc.DECOMP_MARKERS):
                continue
            if clc.is_narrative(line, m.start("n")):
                continue
            tok = m.group("n")
            val = clc.token_to_int(tok)
            if val is None or val == n:
                continue
            if (rel.replace(os.sep, "/"), tok.strip().lower()) in clc.ALLOWLIST:
                continue
            repl = format_like(n, tok, rel)
            spans.append((m.start("n"), m.end("n"), repl, tok, "N"))

    # 2. Dockets, agencies, recommendations, and principal/supplement split
    if not indiv_letter and dockets is not None:
        for pat in clc.DOCKET_PATTERNS:
            for m in pat.finditer(line):
                if clc.is_narrative_clause(line, m.start(0)):
                    continue
                tok = m.group("n")
                val = clc.token_to_int(tok)
                if val is None or val == dockets:
                    continue
                repl = format_like(dockets, tok, rel)
                spans.append((m.start("n"), m.end("n"), repl, tok, "D"))

    if not indiv_letter and agencies is not None:
        for pat in clc.AGENCY_PATTERNS:
            for m in pat.finditer(line):
                if clc.is_narrative_clause(line, m.start(0)):
                    continue
                tok = m.group("n")
                val = clc.token_to_int(tok)
                if val is None or val == agencies:
                    continue
                repl = format_like(agencies, tok, rel)
                spans.append((m.start("n"), m.end("n"), repl, tok, "A"))

    if not indiv_letter and recs is not None:
        for pat in clc.REC_PATTERNS:
            for m in pat.finditer(line):
                tok = m.group("n")
                val = clc.token_to_int(tok)
                if val is None or val == recs:
                    continue
                repl = format_like(recs, tok, rel)
                spans.append((m.start("n"), m.end("n"), repl, tok, "R"))

    if rel.replace(os.sep, "/") == "letters/index.html" and principals is not None and supplements is not None:
        for m in clc.PRINC_SUPP_RE.finditer(line):
            tok_p = m.group("p")
            val_p = clc.token_to_int(tok_p)
            if val_p is not None and val_p != principals:
                spans.append((m.start("p"), m.end("p"), format_like(principals, tok_p), tok_p, "P"))
            tok_s = m.group("s")
            val_s = clc.token_to_int(tok_s)
            if val_s is not None and val_s != supplements:
                spans.append((m.start("s"), m.end("s"), format_like(supplements, tok_s), tok_s, "S"))

    if not spans:
        return line, []

    uniq = {}
    for s in spans:
        uniq[(s[0], s[1])] = s
    changes = []
    new = line
    for start, end, repl, old, lbl in sorted(uniq.values(), key=lambda s: s[0], reverse=True):
        new = new[:start] + repl + new[end:]
        changes.append((old, repl, lbl))
    return new, changes


def sync_resumes(root, n, write_mode):
    """Check and optionally update `resumes/Zukowski_Resume_*.docx` and `.pdf`."""
    resumes_dir = os.path.join(root, "resumes")
    if not os.path.isdir(resumes_dir):
        return 0, 0, []

    pats = [
        re.compile(clc.COUNT_TOKEN + r"(\s+federal\s+comment\s+letters\b)", re.I),
        re.compile(r"(Contributed\s+)" + clc.COUNT_TOKEN + r"(\s+comment\s+letters\s+to\s+federal\s+agencies\b)", re.I),
    ]
    total_changes = 0
    files_changed = 0
    report = []
    modified_docx = []

    for fname in sorted(os.listdir(resumes_dir)):
        if not fname.endswith(".docx"):
            continue
        fpath = os.path.join(resumes_dir, fname)
        rel = f"resumes/{fname}"
        try:
            with zipfile.ZipFile(fpath, "r") as zf:
                xml_text = zf.read("word/document.xml").decode("utf-8")
        except Exception:
            continue

        new_xml = xml_text
        file_changes = []
        for pat in pats:
            def _repl(m):
                tok = m.group("n")
                val = clc.token_to_int(tok)
                if val is None or val == n:
                    return m.group(0)
                repl = format_like(n, tok)
                file_changes.append((tok, repl))
                start_n = m.start("n") - m.start(0)
                end_n = m.end("n") - m.start(0)
                full = m.group(0)
                return full[:start_n] + repl + full[end_n:]

            new_xml = pat.sub(_repl, new_xml)

        if file_changes and new_xml != xml_text:
            files_changed += 1
            total_changes += len(file_changes)
            for old, repl in file_changes:
                report.append(f"  {rel}  {old!r} -> {repl!r} [N]")
            if write_mode:
                tmp_fd, tmp_path = tempfile.mkstemp(suffix=".docx", dir=resumes_dir)
                os.close(tmp_fd)
                with zipfile.ZipFile(fpath, "r") as zin, zipfile.ZipFile(tmp_path, "w", zipfile.ZIP_DEFLATED) as zout:
                    for item in zin.infolist():
                        data = new_xml.encode("utf-8") if item.filename == "word/document.xml" else zin.read(item.filename)
                        zout.writestr(item, data)
                os.replace(tmp_path, fpath)
                modified_docx.append(fpath)

    if write_mode and modified_docx:
        soffice = shutil.which("soffice") or "/opt/homebrew/bin/soffice"
        if os.path.isfile(soffice):
            for docx_path in modified_docx:
                subprocess.run(
                    [soffice, "--headless", "--convert-to", "pdf", "--outdir", resumes_dir, docx_path],
                    check=False,
                    capture_output=True,
                )
                pdf_name = os.path.splitext(os.path.basename(docx_path))[0] + ".pdf"
                report.append(f"  resumes/{pdf_name}  regenerated from {os.path.basename(docx_path)}")

    return total_changes, files_changed, report


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="rewrite drifted mentions in place")
    mode.add_argument("--check", action="store_true",
                      help="list drifted mentions (default); exit 1 on drift")
    ap.add_argument("--map", action="store_true", help="print full atomic surface map")
    args = ap.parse_args()

    root = clc.repo_root()
    stats = clc.derive_program_stats(root)
    n = stats["n"]
    slugs = stats["page_slugs"]
    if n == 0:
        print("render_letter_count: ERROR could not derive N (no letters/ pages).",
              file=sys.stderr)
        return 2

    if args.map:
        _, _, surface_hits = clc.scan_detailed(root, stats)
        clc.print_surface_map(stats, surface_hits)
        if not args.write and not args.check:
            return 0

    total_changes, files_changed = 0, 0
    report = []
    for path in clc.html_files(root):
        rel = os.path.relpath(path, root)
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                lines = fh.read().split("\n")
        except OSError:
            continue
        changed = False
        for i, line in enumerate(lines):
            new_line, changes = plan_line(line, stats, rel)
            if changes:
                lines[i] = new_line
                changed = True
                total_changes += len(changes)
                for old, repl, lbl in changes:
                    report.append(f"  {rel}:{i + 1}  {old!r} -> {repl!r} [{lbl}]")
        if changed:
            files_changed += 1
            if args.write:
                with open(path, "w", encoding="utf-8") as fh:
                    fh.write("\n".join(lines))

    r_changes, r_files, r_report = sync_resumes(root, n, args.write)
    total_changes += r_changes
    files_changed += r_files
    report.extend(r_report)

    word = clc.INT_TO_WORD.get(n, str(n))
    if args.write:
        if total_changes:
            print(f"render_letter_count: wrote {total_changes} change(s) across "
                  f"{files_changed} file(s); N = {n} ('{word}'), D = {stats['dockets']}, "
                  f"A = {stats['agencies']}, R = {stats['recommendations']}.")
            for r in report:
                print(r)
        else:
            print(f"render_letter_count: no change. All mentions already match N = {n} "
                  f"('{word}'), D = {stats['dockets']}, A = {stats['agencies']}, "
                  f"R = {stats['recommendations']}.")
        return 0

    if not total_changes:
        print(f"render_letter_count: OK. All count mentions match N = {n} "
              f"('{word}'), D = {stats['dockets']}, A = {stats['agencies']}, "
              f"R = {stats['recommendations']}.")
        return 0
    print(f"render_letter_count: FAIL. {total_changes} mention(s) drift from program totals "
          f"(N={n}, D={stats['dockets']}, A={stats['agencies']}, R={stats['recommendations']}). "
          f"Run: python3 scripts/render_letter_count.py --write")
    for r in report:
        print(r)
    return 1


if __name__ == "__main__":
    sys.exit(main())
