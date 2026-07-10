#!/usr/bin/env python3
"""render_chrome.py: stamp the shared page chrome (header + mobile nav, footer)
into every nav-bearing page from one source of truth.

tokenization.systems commits fully-rendered static HTML and uses NO Liquid
templating (see _config.yml), so the site header/nav/footer cannot be a Jekyll
include. Historically each page carried its own copy and the copies drifted
(the Roles/Resume label class, menuToggle nesting, missing aria-labels, a
truncated SSRN icon path). This generator eliminates the class: the canonical
chrome lives in _partials/header.html (the <header> block plus the adjacent
<nav id="nav-mobile"> block) and _partials/footer.html, and this script stamps
it into a marker-delimited region of every nav-bearing page. Author workflow:

    1. edit _partials/header.html or _partials/footer.html
    2. python3 scripts/render_chrome.py --write   (or: npm run build:chrome)
    3. commit the partial + the restamped pages, deploy

The generated regions are bounded by:
    <!-- site-chrome:header START (...) -->  ...  <!-- site-chrome:header END -->
    <!-- site-chrome:footer START (...) -->  ...  <!-- site-chrome:footer END -->
html-minifier-terser strips comments at build time, so the markers never reach
the served pages.

Per-page active-link state is derived from the page path (see active_target):
papers/* and research/ mark /research; letters/* mark /letters; resume/* mark
/resume; overview, frameworks, contact, speaker-and-advisory mark themselves;
index.html, 404.html, and privacy/ have no active link. The active link gets
class="navlink active" plus aria-current="page" in both the desktop and the
mobile nav.

Modes:
    --check   (default) verify every nav-bearing page's chrome regions match
              what the partials would generate; exit 1 on drift or on a
              nav-bearing page that has not been stamped yet. Wired into CI
              (build-deploy.yml).
    --write   restamp the regions in place. Pages that still carry legacy
              (marker-less) chrome are adopted: the raw <header>..</nav> and
              <footer>..</footer> blocks are replaced by marker-bounded
              generated regions.

New page: paste the two marker pairs where the chrome belongs (empty regions
are fine) and run --write; or copy an existing page and restamp.

Resolves the tree from cwd (falling back to the script's clone), so it runs
from either clone. Depends only on the stdlib.
"""
import argparse
import difflib
import os
import re
import subprocess
import sys

PARTIAL_REL = {"header": os.path.join("_partials", "header.html"),
               "footer": os.path.join("_partials", "footer.html")}
SKIP_PARTS = {"_site", "_archive", "_partials", "node_modules"}
START_TMPL = ("<!-- site-chrome:{name} START (generated from _partials/{name}.html;"
              " edit the partial, then: python3 scripts/render_chrome.py --write) -->")
END_TMPL = "<!-- site-chrome:{name} END -->"


def repo_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), script_dir):
        try:
            out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                                 capture_output=True, text=True, cwd=cwd)
            if out.returncode == 0 and out.stdout.strip():
                root = out.stdout.strip()
                if os.path.isfile(os.path.join(root, PARTIAL_REL["header"])):
                    return root
        except Exception:
            pass
    return os.path.dirname(script_dir)


def page_paths(root):
    pages = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root)
        parts = [] if rel_dir == "." else rel_dir.split(os.sep)
        dirnames[:] = [d for d in dirnames
                       if d not in SKIP_PARTS and not d.startswith(".")]
        if any(p in SKIP_PARTS or p.startswith(".") for p in parts):
            continue
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            rel = os.path.join(*(parts + [fn])) if parts else fn
            path = os.path.join(root, rel)
            try:
                with open(path, encoding="utf-8") as fh:
                    text = fh.read()
            except (OSError, UnicodeDecodeError):
                continue
            if 'id="nav-mobile"' in text or "site-chrome:header START" in text:
                pages.append((rel.replace(os.sep, "/"), path, text))
    return sorted(pages)


def active_target(rel):
    """Path-derived active nav link for a page, or None."""
    if rel in ("index.html", "404.html", "privacy/index.html"):
        return None
    top = rel.split("/")[0]
    if top in ("papers", "research"):
        return "/research"
    if top in ("letters", "resume"):
        return "/" + top
    if top in ("overview", "frameworks", "contact", "speaker-and-advisory"):
        return "/" + top
    return None


def apply_active(content, target):
    if not target:
        return content
    plain = '<a class="navlink" href="%s">' % target
    active = '<a class="navlink active" href="%s" aria-current="page">' % target
    return content.replace(plain, active)


def load_partials(root):
    partials = {}
    for name, rel in PARTIAL_REL.items():
        with open(os.path.join(root, rel), encoding="utf-8") as fh:
            partials[name] = fh.read().rstrip("\n")
    return partials


def find_marker_region(lines, name):
    """Return (start_idx, end_idx) of the marker lines, or None."""
    start_re = re.compile(r"^\s*<!--\s*site-chrome:%s START\b" % name)
    end_re = re.compile(r"^\s*<!--\s*site-chrome:%s END\b" % name)
    start_idx = None
    for i, line in enumerate(lines):
        if start_idx is None and start_re.match(line):
            start_idx = i
        elif start_idx is not None and end_re.match(line):
            return start_idx, i
    return None


def find_legacy_region(lines, name):
    """Return (start_idx, end_idx) of a marker-less chrome block, or None."""
    try:
        if name == "header":
            i = next(n for n, l in enumerate(lines)
                     if l.lstrip().startswith("<header"))
            j = next(n for n in range(i + 1, len(lines))
                     if '<nav id="nav-mobile"' in lines[n])
            k = next(n for n in range(j + 1, len(lines))
                     if lines[n].strip() == "</nav>")
            return i, k
        i = next(n for n, l in enumerate(lines)
                 if '<footer class="site-footer' in l)
        k = next(n for n in range(i + 1, len(lines))
                 if lines[n].strip() == "</footer>")
        return i, k
    except StopIteration:
        return None


def marker_indent(name):
    return "  " if name == "header" else "    "


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true",
                      help="restamp the chrome regions in place (adopts marker-less pages)")
    mode.add_argument("--check", action="store_true",
                      help="verify regions match the partials (default); exit 1 on drift")
    args = ap.parse_args()
    do_write = args.write

    root = repo_root()
    try:
        partials = load_partials(root)
    except OSError as e:
        print("render_chrome: ERROR reading partials: %s" % e, file=sys.stderr)
        return 2
    pages = page_paths(root)
    if not pages:
        print("render_chrome: ERROR no nav-bearing pages found under %s" % root,
              file=sys.stderr)
        return 2

    drift = []          # (rel, name, current_lines, expected_lines)
    unstamped = []      # (rel, name)
    structural = []     # (rel, name)
    written = 0

    for rel, path, text in pages:
        lines = text.split("\n")
        changed = False
        for name in ("header", "footer"):
            expected = apply_active(partials[name], active_target(rel)).split("\n")
            region = find_marker_region(lines, name)
            if region:
                s, e = region
                if lines[s + 1:e] != expected:
                    if do_write:
                        lines[s + 1:e] = expected
                        changed = True
                    else:
                        drift.append((rel, name, lines[s + 1:e], expected))
                continue
            legacy = find_legacy_region(lines, name)
            if legacy is None:
                structural.append((rel, name))
                continue
            if do_write:
                s, e = legacy
                ind = marker_indent(name)
                block = ([ind + START_TMPL.format(name=name)] + expected
                         + [ind + END_TMPL.format(name=name)])
                lines[s:e + 1] = block
                changed = True
            else:
                unstamped.append((rel, name))
        if do_write and changed:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write("\n".join(lines))
            written += 1

    if structural:
        for rel, name in structural:
            print("render_chrome: ERROR %s: no %s chrome block or markers found"
                  % (rel, name), file=sys.stderr)
        return 2

    if do_write:
        print("render_chrome: stamped %d of %d page(s) from _partials/." % (written, len(pages)))
        return 0

    if not drift and not unstamped:
        print("render_chrome: OK. %d page(s) in sync with _partials/ (header + footer)."
              % len(pages))
        return 0
    for rel, name in unstamped:
        print("render_chrome: FAIL %s: %s chrome has no markers (legacy copy). "
              "Run: python3 scripts/render_chrome.py --write" % (rel, name))
    for rel, name, cur, exp in drift:
        print("render_chrome: FAIL %s: %s region out of sync with _partials/%s.html"
              % (rel, name, name))
    if drift:
        rel, name, cur, exp = drift[0]
        diff = list(difflib.unified_diff(cur, exp, "%s (committed)" % rel,
                                         "generated from partial", lineterm=""))
        for d in diff[:40]:
            print("  " + d)
        if len(diff) > 40:
            print("  ... (%d more diff lines)" % (len(diff) - 40))
    print("render_chrome: run: python3 scripts/render_chrome.py --write")
    return 1


if __name__ == "__main__":
    sys.exit(main())
