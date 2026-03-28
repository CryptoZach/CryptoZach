#!/usr/bin/env python3
"""
Replace legacy zach@cryptozach.com and cryptozach.com in site HTML and resume DOCX.
Target contact address: Zach@Tokenization.Systems (display and mailto).

Preserves <link rel="canonical" ...> and <meta property="og:url" ...> unchanged
(CNAME / canonical policy). All other occurrences migrate to tokenization.systems.
"""
from __future__ import annotations

import io
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Tags whose href/content must stay on cryptozach.com until CNAME is confirmed.
_PROTECT = re.compile(
    r"<(?:link|meta)\b[^>]*(?:\brel=[\"']canonical[\"']|\bproperty=[\"']og:url[\"'])[^>]*>",
    re.IGNORECASE,
)


def _migrate_chunk(text: str) -> str:
    text = text.replace("zach@cryptozach.com", "Zach@Tokenization.Systems")
    text = text.replace("zach@tokenization.systems", "Zach@Tokenization.Systems")
    text = text.replace("https://www.cryptozach.com", "https://tokenization.systems")
    text = text.replace("http://www.cryptozach.com", "https://tokenization.systems")
    text = text.replace("https://cryptozach.com", "https://tokenization.systems")
    text = text.replace("http://cryptozach.com", "https://tokenization.systems")
    text = text.replace("cryptozach.com", "tokenization.systems")
    return text


def migrate_html(raw: str) -> str:
    out: list[str] = []
    pos = 0
    for m in _PROTECT.finditer(raw):
        out.append(_migrate_chunk(raw[pos : m.start()]))
        out.append(m.group(0))
        pos = m.end()
    out.append(_migrate_chunk(raw[pos:]))
    return "".join(out)


def patch_docx(path: Path) -> bool:
    buf = io.BytesIO(path.read_bytes())
    changed = False
    out = io.BytesIO()
    with zipfile.ZipFile(buf, "r") as zin, zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename.endswith(".xml") and b"cryptozach" in data:
                text = data.decode("utf-8")
                new_text = _migrate_chunk(text)
                if new_text != text:
                    changed = True
                    data = new_text.encode("utf-8")
            zout.writestr(info, data)
    if changed:
        path.write_bytes(out.getvalue())
    return changed


def main() -> None:
    html_files = sorted(ROOT.rglob("*.html"))
    # Skip Cursor / tooling copies if any under .cursor with html
    html_files = [p for p in html_files if ".cursor" not in p.parts]

    n_html = 0
    for path in html_files:
        raw = path.read_text(encoding="utf-8")
        new = migrate_html(raw)
        if new != raw:
            path.write_text(new, encoding="utf-8")
            n_html += 1
            print(f"HTML: {path.relative_to(ROOT)}")

    docx_globs = list(ROOT.glob("Zukowski_Resume_*.docx"))
    n_docx = 0
    for path in docx_globs:
        if patch_docx(path):
            n_docx += 1
            print(f"DOCX: {path.name}")

    print(f"Done. Updated {n_html} HTML file(s), {n_docx} DOCX file(s).")


if __name__ == "__main__":
    main()
