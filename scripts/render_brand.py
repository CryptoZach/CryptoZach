#!/usr/bin/env python3
"""render_brand.py: one brandmark for the whole site, stamped from one source and checked on every page.

The brandmark is the header's dial, wordmark and tagline. Until 2026-10-12 it was drawn two ways: the home
page had its own markup, its own rules (Archivo wordmark, one-line tagline) and a newer copy of the dial's
drawing code, and the other 61 pages used the shared stylesheet (a system font that changes with the
visitor's machine, different spacing, a tagline that wrapped on a phone) and an older copy of the dial.
Measured that day at 1440 and 390 px: wordmark font, wordmark position, tagline box and, on a phone,
tagline size and header height all differed between the home page and every other page.

Source of truth, in _partials/:
    brand.html   the markup inside <div class="brand">
    brand.css    every rule that draws it
and vaultMountDial() in home.js is the one copy of the dial's drawing code.

What gets stamped (marker-bounded regions; edit the partial, never the region):
    index.html               brand.html, and brand.css at the end of its inline stylesheet
    _partials/header.html    brand.html (scripts/render_chrome.py then carries it to every other page)
    styles.css               brand.css, as its last block
    vault.js                 vaultMountDial(), copied from home.js

Modes:
    --check  (default) every region equals its source, every stamped page carries the brand markup, and
             no page with a header is missing the mark; exit 1 on drift, 2 when a file or marker is missing
    --write  restamp the regions (run scripts/render_chrome.py --write afterwards for the 61 pages)
    --quiet  print only failures
"""
import os
import re
import subprocess
import sys

MARK = ("<!-- site-brand:mark START (generated from _partials/brand.html; edit that file, then: "
        "python3 scripts/render_brand.py --write) -->", "<!-- site-brand:mark END -->")
CSS = ("/* site-brand:css START (generated from _partials/brand.css; edit that file, then: "
       "python3 scripts/render_brand.py --write) */", "/* site-brand:css END */")
DIAL = "function vaultMountDial"
SKIP = {"_site", "_archive", "_partials", "node_modules", "_build", "handoff"}


def root():
    here = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), here):
        try:
            out = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, cwd=cwd)
            if out.returncode == 0 and os.path.isfile(os.path.join(out.stdout.strip(), "_partials", "brand.html")):
                return out.stdout.strip()
        except OSError:
            pass
    return os.path.dirname(here)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def region(text, markers, payload, what):
    """-> text with the region between the markers set to payload. Raises LookupError when the markers
    are not there exactly once."""
    a, b = markers
    if text.count(a) != 1 or text.count(b) != 1 or text.index(a) > text.index(b):
        raise LookupError("%s: the %s markers are not present exactly once, in order" % (what, a.split(" ")[1]))
    i, j = text.index(a) + len(a), text.index(b)
    return text[:i] + "\n" + payload.strip("\n") + "\n" + text[j:]


def function_text(text, what):
    if text.count(DIAL) != 1:
        raise LookupError("%s: %s() is not defined exactly once" % (what, DIAL.split()[1]))
    i = text.index(DIAL)
    j = text.index("{", i)
    depth, k = 1, j + 1
    while depth:
        depth += text[k] == "{"
        depth -= text[k] == "}"
        k += 1
    return i, k


def pages(top):
    for d, dirs, files in os.walk(top):
        dirs[:] = [x for x in dirs if x not in SKIP and not x.startswith(".")]
        for f in sorted(files):
            if f.endswith(".html"):
                yield os.path.join(d, f)


def plan(top):
    """-> [(path, new_text)] for every file whose stamped content differs from its source."""
    mark = read(os.path.join(top, "_partials", "brand.html"))
    css = read(os.path.join(top, "_partials", "brand.css"))
    out = []

    def want(rel, fn):
        path = os.path.join(top, rel)
        old = read(path)
        new = fn(old, rel)
        if new != old:
            out.append((path, new))

    want("index.html", lambda t, rel: region(region(t, MARK, mark, rel), CSS, css, rel))
    want(os.path.join("_partials", "header.html"), lambda t, rel: region(t, MARK, mark, rel))
    want("styles.css", lambda t, rel: region(t, CSS, css, rel))
    home = read(os.path.join(top, "home.js"))
    a, b = function_text(home, "home.js")
    dial = home[a:b]

    def dial_into(t, rel):
        i, k = function_text(t, rel)
        return t[:i] + dial + t[k:]
    want("vault.js", dial_into)
    return out


def unstamped(top):
    """Pages that have a header but not the stamped mark (a page added by hand, or never restamped)."""
    bad = []
    for path in pages(top):
        t = read(path)
        if re.search(r"<header\b", t) and '<div class="brand">' in t and MARK[0] not in t:
            bad.append(os.path.relpath(path, top))
    return bad


def main(argv):
    quiet, write = "--quiet" in argv, "--write" in argv
    top = root()
    try:
        todo = plan(top)
    except (OSError, LookupError) as exc:
        print("render_brand: CANNOT RUN: %s" % exc, file=sys.stderr)
        return 2
    if write:
        for path, new in todo:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(new)
            print("render_brand: restamped %s" % os.path.relpath(path, top))
        if not todo and not quiet:
            print("render_brand: nothing to restamp")
        return 0
    missing = unstamped(top)
    if todo or missing:
        for path, _ in todo:
            print("render_brand: DRIFT %s differs from its source in _partials/ (or home.js for the dial)" % os.path.relpath(path, top), file=sys.stderr)
        for rel in missing:
            print("render_brand: UNSTAMPED %s has a header without the stamped brand mark (run scripts/render_chrome.py --write)" % rel, file=sys.stderr)
        print("render_brand: FAIL. Fix: python3 scripts/render_brand.py --write && python3 scripts/render_chrome.py --write", file=sys.stderr)
        return 1
    if not quiet:
        print("render_brand: OK. One brandmark: markup, rules and dial code in sync on every page with a header.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
