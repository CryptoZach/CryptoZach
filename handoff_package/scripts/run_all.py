#!/usr/bin/env python3
"""
Master Runner — Econometric Handoff Package

Executes all three analysis tasks, collects prose inserts, applies them
to the Word document XML, and verifies exhibit alignment afterward.

Usage:
    python scripts/run_all.py              # run all tasks
    python scripts/run_all.py --task3-only # run only Task 3 (no network)
    python scripts/run_all.py --skip-docx  # compute only, skip docx update

Execution order:
    Task 3: Circulating-supply robustness  (no network, no statsmodels)
    Task 2: Fed facility series + heatmap  (needs network)
    Task 1: Cointegration + VECM           (needs statsmodels)
    Apply:  Insert prose into docx XML
    Verify: Check exhibit label alignment
"""

import argparse
import json
import os
import re
import shutil
import sys
import traceback
import xml.etree.ElementTree as ET
import zipfile
from copy import deepcopy
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCX_PATH = ROOT / "Regulating_Routers_Fed_Paper_Final.docx"
RESULTS = ROOT / "results"

# Word XML namespace
WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": WORD_NS}


# ── Task execution ─────────────────────────────────────────────────────

def run_task3():
    """Execute Task 3 (circulating-supply robustness)."""
    from task3_circ_supply import main as task3_main
    return task3_main()


def run_task2():
    """Execute Task 2 (facility series + heatmap)."""
    from task2_facility_series import main as task2_main
    return task2_main()


def run_task1():
    """Execute Task 1 (cointegration + VECM)."""
    from task1_cointegration import main as task1_main
    return task1_main()


# ── Docx XML manipulation ─────────────────────────────────────────────

def _find_paragraph_containing(root, text_fragment):
    """
    Find the first <w:p> element whose concatenated <w:t> text contains
    the given fragment.  Returns (paragraph_element, parent_element) or
    (None, None).
    """
    for body in root.iter(f"{{{WORD_NS}}}body"):
        for p in body.iter(f"{{{WORD_NS}}}p"):
            full_text = ""
            for t in p.iter(f"{{{WORD_NS}}}t"):
                if t.text:
                    full_text += t.text
            if text_fragment in full_text:
                return p, body
    return None, None


def _make_paragraph(text, bold=False, italic=False, size_pt=11):
    """
    Create a new <w:p> element with a single <w:r><w:t> run.
    """
    p = ET.Element(f"{{{WORD_NS}}}p")
    r = ET.SubElement(p, f"{{{WORD_NS}}}r")

    # Run properties
    rpr = ET.SubElement(r, f"{{{WORD_NS}}}rPr")
    sz = ET.SubElement(rpr, f"{{{WORD_NS}}}sz")
    sz.set(f"{{{WORD_NS}}}val", str(size_pt * 2))  # half-points
    sz_cs = ET.SubElement(rpr, f"{{{WORD_NS}}}szCs")
    sz_cs.set(f"{{{WORD_NS}}}val", str(size_pt * 2))
    if bold:
        ET.SubElement(rpr, f"{{{WORD_NS}}}b")
    if italic:
        ET.SubElement(rpr, f"{{{WORD_NS}}}i")

    t = ET.SubElement(r, f"{{{WORD_NS}}}t")
    t.set("xml:space", "preserve")
    t.text = text

    return p


def _insert_after(parent, reference, new_element):
    """Insert new_element immediately after reference in parent."""
    children = list(parent)
    idx = children.index(reference)
    parent.insert(idx + 1, new_element)


# Insertion-point mapping:  prose_key → text fragment to search for
INSERTION_POINTS = {
    # Task 3: robustness footnote after the exhibit inventory sentence in IV
    "footnote_robustness_check": "Twelve exhibits support",
    # Task 3: SVB decomposition after the USDC outflow paragraph in V.B
    "paragraph_svb_decomposition": "SVB crisis",
    # Task 2: facility correlations after the Exhibit 6 heatmap discussion in V.A
    "paragraph_facility_correlations": "Exhibit 6",
    # Task 1: cointegration paragraph after the data sources sentence in IV
    "paragraph_cointegration_test": "Data sources span three tiers",
    # Task 1: VECM interpretation after the funding stress paragraph in V.A
    "paragraph_vecm_interpretation": "Exhibit B overlays",
}

# Fallback: if the search fragment isn't found, insert before conclusion
FALLBACK_FRAGMENT = "Conclusion"


def apply_prose_to_docx(prose_dict, docx_path=DOCX_PATH):
    """
    Open the docx as a ZIP, parse document.xml, insert prose paragraphs
    at the mapped locations, and write the updated docx.
    """
    if not docx_path.exists():
        print(f"  WARNING: {docx_path} not found — skipping docx update")
        return False

    # Work on a backup
    backup_path = docx_path.with_suffix(".docx.bak")
    shutil.copy2(docx_path, backup_path)

    # Read the docx ZIP
    tmp_dir = ROOT / "_docx_tmp"
    tmp_dir.mkdir(exist_ok=True)

    with zipfile.ZipFile(docx_path, "r") as zf:
        zf.extractall(tmp_dir)

    doc_xml_path = tmp_dir / "word" / "document.xml"
    if not doc_xml_path.exists():
        print("  ERROR: word/document.xml not found in docx")
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return False

    # Register namespaces to avoid ns0: prefixes
    namespaces_to_register = [
        ("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main"),
        ("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships"),
        ("wp", "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"),
        ("a", "http://schemas.openxmlformats.org/drawingml/2006/main"),
        ("pic", "http://schemas.openxmlformats.org/drawingml/2006/picture"),
        ("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006"),
        ("wps", "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"),
        ("w14", "http://schemas.microsoft.com/office/word/2010/wordml"),
    ]
    for prefix, uri in namespaces_to_register:
        ET.register_namespace(prefix, uri)

    tree = ET.parse(doc_xml_path)
    root = tree.getroot()

    inserted = 0
    for prose_key, prose_text in prose_dict.items():
        fragment = INSERTION_POINTS.get(prose_key, FALLBACK_FRAGMENT)
        para, parent = _find_paragraph_containing(root, fragment)

        if para is None:
            # Try fallback
            para, parent = _find_paragraph_containing(root, FALLBACK_FRAGMENT)

        if para is not None and parent is not None:
            new_p = _make_paragraph(prose_text, italic=False, size_pt=11)
            _insert_after(parent, para, new_p)
            inserted += 1
            print(f"  Inserted [{prose_key}] after '{fragment[:40]}...'")
        else:
            print(f"  WARNING: Could not find insertion point for [{prose_key}]")

    # Write updated XML
    tree.write(doc_xml_path, xml_declaration=True, encoding="UTF-8")

    # Repack the docx
    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fpath in tmp_dir.rglob("*"):
            if fpath.is_file():
                arcname = fpath.relative_to(tmp_dir)
                zf.write(fpath, arcname)

    # Cleanup
    shutil.rmtree(tmp_dir, ignore_errors=True)

    print(f"\n  Inserted {inserted} prose paragraphs into {docx_path.name}")
    return True


# ── Exhibit verification ───────────────────────────────────────────────

def verify_exhibits(docx_path=DOCX_PATH):
    """
    Scan the docx XML for exhibit labels and verify numbering consistency.
    Returns dict of findings.
    """
    if not docx_path.exists():
        return {"error": "docx not found"}

    with zipfile.ZipFile(docx_path, "r") as zf:
        with zf.open("word/document.xml") as f:
            content = f.read().decode("utf-8")

    # Find all "Exhibit N:" patterns
    exhibit_pattern = re.compile(r"Exhibit\s+(\d+|[A-E])[\s:—–-]")
    matches = exhibit_pattern.findall(content)

    unique_exhibits = sorted(set(matches), key=lambda x: (x.isdigit(), x))
    expected = ["1", "2", "3", "4", "5", "6", "7", "8"]

    missing = [e for e in expected if e not in unique_exhibits]
    found = [e for e in unique_exhibits]

    return {
        "exhibits_found": found,
        "expected_exhibits": expected,
        "missing_exhibits": missing,
        "alignment_ok": len(missing) == 0,
    }


# ── Main ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Run econometric handoff tasks")
    parser.add_argument("--task3-only", action="store_true",
                        help="Run only Task 3 (no network, no statsmodels)")
    parser.add_argument("--skip-docx", action="store_true",
                        help="Skip docx XML insertion")
    parser.add_argument("--skip-verify", action="store_true",
                        help="Skip exhibit verification")
    args = parser.parse_args()

    # Ensure we can import sibling scripts
    sys.path.insert(0, str(Path(__file__).resolve().parent))

    print("╔" + "═" * 58 + "╗")
    print("║  Econometric Handoff Package — Master Runner              ║")
    print("╚" + "═" * 58 + "╝")
    print(f"\n  Timestamp: {datetime.utcnow().isoformat()}Z")
    print(f"  Root:      {ROOT}")
    print(f"  Docx:      {DOCX_PATH}")
    print(f"  Mode:      {'Task 3 only' if args.task3_only else 'All tasks'}")

    all_prose = {}
    all_results = {}
    task_status = {}

    RESULTS.mkdir(exist_ok=True)

    # ── Task 3 (always runs) ──────────────────────────────────────
    print("\n\n" + "━" * 60)
    try:
        results3, prose3 = run_task3()
        all_prose.update(prose3)
        all_results["task3"] = results3
        task_status["task3"] = "PASS" if results3.get("overall_pass") else "FAIL"
    except Exception as e:
        print(f"\n  TASK 3 ERROR: {e}")
        traceback.print_exc()
        task_status["task3"] = f"ERROR: {e}"

    if not args.task3_only:
        # ── Task 2 ────────────────────────────────────────────────
        print("\n\n" + "━" * 60)
        try:
            results2, prose2 = run_task2()
            all_prose.update(prose2)
            all_results["task2"] = results2
            task_status["task2"] = "COMPLETE" if results2.get("facility_data_available") else "PARTIAL"
        except Exception as e:
            print(f"\n  TASK 2 ERROR: {e}")
            traceback.print_exc()
            task_status["task2"] = f"ERROR: {e}"

        # ── Task 1 ────────────────────────────────────────────────
        print("\n\n" + "━" * 60)
        try:
            results1, prose1 = run_task1()
            all_prose.update(prose1)
            all_results["task1"] = results1
            task_status["task1"] = "COMPLETE"
        except Exception as e:
            print(f"\n  TASK 1 ERROR: {e}")
            traceback.print_exc()
            task_status["task1"] = f"ERROR: {e}"

    # ── Apply prose to docx ───────────────────────────────────────
    if not args.skip_docx and all_prose:
        print("\n\n" + "━" * 60)
        print("Applying prose inserts to docx XML")
        print("━" * 60)
        docx_ok = apply_prose_to_docx(all_prose)
    else:
        docx_ok = None
        if args.skip_docx:
            print("\n  Skipping docx update (--skip-docx)")
        elif not all_prose:
            print("\n  No prose inserts to apply")

    # ── Verify exhibit alignment ──────────────────────────────────
    if not args.skip_verify:
        print("\n\n" + "━" * 60)
        print("Verifying exhibit alignment")
        print("━" * 60)
        verify = verify_exhibits()
        print(f"  Exhibits found:   {verify.get('exhibits_found', [])}")
        print(f"  Missing:          {verify.get('missing_exhibits', [])}")
        print(f"  Alignment OK:     {verify.get('alignment_ok', False)}")
    else:
        verify = None

    # ── Summary ───────────────────────────────────────────────────
    summary = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "task_status": task_status,
        "prose_keys_generated": list(all_prose.keys()),
        "docx_updated": docx_ok,
        "exhibit_verification": verify,
    }

    summary_path = RESULTS / "run_all_summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)

    print("\n\n" + "╔" + "═" * 58 + "╗")
    print("║  Summary                                                  ║")
    print("╠" + "═" * 58 + "╣")
    for task, status in task_status.items():
        print(f"║  {task:12s} {status:43s} ║")
    if docx_ok is not None:
        print(f"║  {'docx':12s} {'Updated' if docx_ok else 'Failed':43s} ║")
    if verify:
        align = "OK" if verify.get("alignment_ok") else "MISALIGNED"
        print(f"║  {'exhibits':12s} {align:43s} ║")
    print("╚" + "═" * 58 + "╝")
    print(f"\n  Full summary: {summary_path}")

    return summary


if __name__ == "__main__":
    summary = main()
