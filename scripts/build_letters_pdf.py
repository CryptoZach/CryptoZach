#!/usr/bin/env python3
"""build_letters_pdf.py: compile the federal comment letters into one PDF for reviewers.

Reads scripts/letters_registry.json (the letters registry), takes the federal letters in
filing order, and writes letters/all-letters.pdf: a cover page with a table of contents
(number, letter, filed date, agency, proceeding, page), then every filed PDF in order,
with an outline bookmark at the first page of each letter.

Run it after a new letter page and its PDF are published, then commit the output:

    python3 scripts/build_letters_pdf.py       (or: npm run build:letters-pdf)

The hub links the file from its index note (render_letters.py adds the link and the size
when the file exists). The international series (FSB) is not included; its PDF stays on
its own page. Depends on pypdf and reportlab.
"""
import datetime as dt
import json
import os
import subprocess
import sys

try:
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
except ImportError as exc:  # pragma: no cover
    print(f"build_letters_pdf: missing dependency ({exc}); pip install pypdf reportlab", file=sys.stderr)
    sys.exit(2)

REGISTRY_REL = os.path.join("scripts", "letters_registry.json")
OUT_REL = os.path.join("letters", "all-letters.pdf")
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]


def repo_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), script_dir):
        try:
            out = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, cwd=cwd)
            if out.returncode == 0 and os.path.isfile(os.path.join(out.stdout.strip(), REGISTRY_REL)):
                return out.stdout.strip()
        except Exception:
            pass
    return os.path.dirname(script_dir)


def fmt_date(iso):
    y, m, d = (int(p) for p in iso.split("-"))
    return f"{MONTHS[m - 1]} {d}, {y}"


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_cover(path, letters, pages, compiled, total_pages):
    doc = SimpleDocTemplate(path, pagesize=letter, leftMargin=0.8 * inch, rightMargin=0.8 * inch,
                            topMargin=0.8 * inch, bottomMargin=0.8 * inch,
                            title="Federal Comment Letter Program: the letters", author="Zach Zukowski, Tokenization Systems")
    title = ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=18, leading=22, spaceAfter=6)
    sub = ParagraphStyle("s", fontName="Helvetica", fontSize=10, leading=14, textColor=colors.HexColor("#4b5260"))
    cell = ParagraphStyle("c", fontName="Helvetica", fontSize=8.5, leading=11)
    cell_b = ParagraphStyle("cb", parent=cell, fontName="Helvetica-Bold")
    head = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.HexColor("#4b5260"))
    n = len(letters)
    story = [Paragraph(f"Federal Comment Letter Program: the {n} letters", title),
             Paragraph(f"Tokenization Systems (Zach Zukowski). Filed {fmt_date(letters[0]['filed'])} to "
                       f"{fmt_date(letters[-1]['filed'])}. Compiled {compiled}. {total_pages} pages. "
                       f"Index, outcomes and the recommendation table: https://tokenization.systems/letters/", sub),
             Spacer(1, 14)]
    rows = [[Paragraph(h, head) for h in ("No.", "Letter", "Filed", "Agency", "Proceeding", "Page")]]
    for l, page in zip(letters, pages):
        rows.append([Paragraph(str(l["number"]), cell),
                     Paragraph(esc(l["headline"]), cell_b),
                     Paragraph(fmt_date(l["filed"]), cell),
                     Paragraph(esc(l["agency_display"]), cell),
                     Paragraph(esc(l["docket"]["label"]), cell),
                     Paragraph(str(page) if page is not None else "text only", cell)])
    table = Table(rows, colWidths=[0.4 * inch, 2.55 * inch, 0.95 * inch, 1.05 * inch, 1.35 * inch, 0.5 * inch], repeatRows=1)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, colors.HexColor("#4b5260")),
        ("LINEBELOW", (0, 1), (-1, -1), 0.25, colors.HexColor("#d0d4dc")),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("ALIGN", (5, 0), (5, -1), "RIGHT"),
    ]))
    story.append(table)
    story.append(Spacer(1, 10))
    if any(p is None for p in pages):
        story.append(Paragraph("A letter marked text only was filed as comment-box text with no attachment; its text is "
                               "on its page at https://tokenization.systems/letters/.", sub))
        story.append(Spacer(1, 6))
    story.append(Paragraph("Each letter follows in filing order; the PDF outline carries one bookmark per letter. "
                           "The international standard-setter response (FSB, July 1, 2026) is a distinct series and is not included.", sub))
    doc.build(story)


def main():
    root = repo_root()
    with open(os.path.join(root, REGISTRY_REL), encoding="utf-8") as fh:
        reg = json.load(fh)
    letters = sorted((l for l in reg["letters"] if l["series"] == "federal"), key=lambda l: (l["filed"], l["number"] or 0))
    readers = []
    for l in letters:
        if not l.get("pdf"):
            readers.append(None)   # filed as comment-box text with no attachment: listed, no pages
            continue
        pdf = os.path.join(root, l["pdf"].lstrip("/"))
        if not os.path.isfile(pdf):
            print(f"build_letters_pdf: missing {l['pdf']}", file=sys.stderr)
            return 1
        readers.append(PdfReader(pdf))
    # cover first, so the contents can carry page numbers: cover pages are counted once built
    compiled = fmt_date(dt.date.today().isoformat())
    cover_path = os.path.join(root, "letters", ".all-letters-cover.pdf")
    counts = [len(r.pages) if r is not None else 0 for r in readers]
    cover_pages = 1
    for _ in range(3):  # the cover may spill to a second page; settle the page numbers
        pages, p = [], cover_pages + 1
        for c, r in zip(counts, readers):
            pages.append(p if r is not None else None)
            p += c
        build_cover(cover_path, letters, pages, compiled, cover_pages + sum(counts))
        new_cover_pages = len(PdfReader(cover_path).pages)
        if new_cover_pages == cover_pages:
            break
        cover_pages = new_cover_pages
    writer = PdfWriter()
    for page in PdfReader(cover_path).pages:
        writer.add_page(page)
    writer.add_outline_item("Contents", 0)
    for l, r, page in zip(letters, readers, pages):
        if r is None:
            continue
        start = len(writer.pages)
        for pg in r.pages:
            writer.add_page(pg)
        writer.add_outline_item(f"No. {l['number']}: {l['headline']} ({fmt_date(l['filed'])})", start)
    writer.add_metadata({"/Title": f"Federal Comment Letter Program: the {len(letters)} letters",
                         "/Author": "Zach Zukowski, Tokenization Systems",
                         "/Subject": "Comment letters filed April to October 2026, compiled for reviewers"})
    out = os.path.join(root, OUT_REL)
    with open(out, "wb") as fh:
        writer.write(fh)
    os.remove(cover_path)
    size = os.path.getsize(out)
    print(f"build_letters_pdf: wrote {OUT_REL}: {len(letters)} letters, {len(writer.pages)} pages, {size / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
