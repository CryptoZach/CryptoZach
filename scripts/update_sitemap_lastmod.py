#!/usr/bin/env python3
"""update_sitemap_lastmod.py: set each sitemap <lastmod> from git.

Why this exists. sitemap.xml is hand-maintained and its dates drift: on
2026-10-12, 51 of 54 URLs carried lastmod 2026-09-22 while the homepage had
been modified on 2026-10-10. Search engines use lastmod to decide what to
recrawl, so a stale date delays indexing of real changes and an inflated one
wastes crawl budget. This script derives the date from the last commit that
touched the URL's source file, which is the one fact git always has.

Usage:
    python3 scripts/update_sitemap_lastmod.py          # rewrite sitemap.xml
    python3 scripts/update_sitemap_lastmod.py --check  # exit 1 if a date would change

Run in CI after a full-history checkout (actions/checkout with fetch-depth: 0);
in a shallow clone every file reports the clone's single commit date, so the
script refuses to write when it detects one (git rev-parse --is-shallow-repository).
Exit 2 means the script could not run; the deploy gate treats that as a warning.
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://tokenization.systems"


def source_for(loc):
    path = loc.replace(SITE, "").strip("/")
    candidates = [os.path.join(path, "index.html") if path else "index.html", path + ".html"]
    for rel in candidates:
        if os.path.isfile(os.path.join(ROOT, rel)):
            return rel
    return None


def git_date(rel):
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", rel],
                         capture_output=True, text=True, cwd=ROOT)
    return out.stdout.strip() or None


def main():
    check = "--check" in sys.argv
    shallow = subprocess.run(["git", "rev-parse", "--is-shallow-repository"],
                             capture_output=True, text=True, cwd=ROOT).stdout.strip()
    if shallow == "true":
        print("update_sitemap_lastmod: shallow clone, dates would be meaningless; skipping")
        return 2
    sm_path = os.path.join(ROOT, "sitemap.xml")
    text = open(sm_path, encoding="utf-8").read()
    changes = []

    def repl(m):
        loc, old = m.group(1), m.group(2)
        rel = source_for(loc)
        new = git_date(rel) if rel else None
        if not new or new == old:
            return m.group(0)
        changes.append((loc, old, new))
        return m.group(0).replace("<lastmod>%s</lastmod>" % old, "<lastmod>%s</lastmod>" % new)

    new_text = re.sub(r"<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>", repl, text)
    for loc, old, new in changes:
        print("  %s: %s -> %s" % (loc.replace(SITE, "") or "/", old, new))
    if check:
        print("update_sitemap_lastmod: %d date(s) would change" % len(changes))
        return 1 if changes else 0
    if changes:
        open(sm_path, "w", encoding="utf-8").write(new_text)
    print("update_sitemap_lastmod: %d date(s) updated" % len(changes))
    return 0


if __name__ == "__main__":
    sys.exit(main())
