#!/usr/bin/env python3
"""check_internal_links.py: internal links must use the canonical trailing-slash form.

Why this exists. Canonical URLs and the sitemap use trailing slashes (/research/),
but on 2026-10-12 the shared header and footer linked /research, /letters and the
rest without one: 1,130 link instances across 53 pages, each answered by GitHub
Pages with a 301 before the page loaded. The redirect costs a round trip on every
navigation and splits link signals between two URLs. This guard fails the deploy
when an href points at a directory page without its trailing slash.

Exit 0 clean, 1 violations, 2 could not run. --quiet prints only failures.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {"_site", "_archive", "node_modules", ".git", ".claude", "scripts", "_layouts"}
HREF = re.compile(r'href="(/[A-Za-z0-9_./-]*?)(?:[#?][^"]*)?"')


def main():
    quiet = "--quiet" in sys.argv
    problems = []
    scanned = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP and not d.startswith(".")]
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(dirpath, fn)
            try:
                text = open(path, encoding="utf-8").read()
            except (OSError, UnicodeDecodeError):
                continue
            scanned += 1
            for m in HREF.finditer(text):
                href = m.group(1)
                if href.endswith("/") or "." in href.rsplit("/", 1)[-1]:
                    continue
                if os.path.isfile(os.path.join(ROOT, href.lstrip("/"), "index.html")):
                    problems.append((os.path.relpath(path, ROOT), href))
    if scanned == 0:
        print("check_internal_links: no html scanned")
        return 2
    if problems:
        print("check_internal_links: %d slash-less internal link(s) to directory pages:" % len(problems))
        for rel, href in sorted(set(problems))[:60]:
            print("  %s: %s (use %s/)" % (rel, href, href))
        return 1
    if not quiet:
        print("check_internal_links: OK (%d pages)" % scanned)
    return 0


if __name__ == "__main__":
    sys.exit(main())
