#!/usr/bin/env python3
"""cz-broken-ref-prepush.py: broken-image-ref guard for the site-clone pre-push hook.

Given a commit SHA (argv[1] or $CZ_PUSH_SHA), exit non-zero if any site page IN THAT COMMIT
references an image asset that is absent from the same commit. Such a ref is a live 404 on
the GitHub Pages deploy. This is a fast, deterministic, SOURCE-side proxy for the CI deploy
gate (the inline broken-ref step in .github/workflows/build-deploy.yml), fired one step
earlier and locally at push time. Called per pushed ref by scripts/hooks/pre-push.

Design notes (why it is built this way):
  - It validates the PUSHED COMMIT's tree (git ls-tree / git archive on the given SHA), NOT
    the index or working tree, so unrelated working-tree WIP never false-blocks a push and a
    staged-but-uncommitted asset never false-passes.
  - The "does it exist" test is membership in the commit's tree (git ls-tree), i.e. exactly
    what will deploy. That is why it catches an asset that is present on disk but never
    committed (the untracked-asset drift class) and case-mismatched refs that 404 on the
    case-sensitive Linux deploy host.
  - It extracts img/og/icon/srcset/CSS-url()/JSON-LD image refs, matching the CI gate and
    scripts/orphan_figure_guard.py (the workflow clone's standalone guard).
  - Build output (_site/, .jekyll-cache/) and drafts are skipped; external / data: /
    protocol-relative / Liquid-templated refs are skipped (the CI gate, which scans the
    BUILT _site, is the authoritative backstop for post-Jekyll refs this source scan cannot
    resolve).
  - All candidate pages are read in ONE `git archive` stream (not one `git show` per file),
    keeping it sub-second on the full tree.

Bypass is handled by the caller (SKIP_BROKEN_REF_PREPUSH). Fail-soft: any git error on a
ref yields no findings for that ref rather than a spurious block.
"""
import io
import os
import re
import subprocess
import sys
import tarfile

SHA = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("CZ_PUSH_SHA", "")).strip()
if not SHA:
    sys.exit(0)

EXT = "png|jpg|jpeg|webp|svg|gif|ico"
CANON = ("tokenization.systems", "www.tokenization.systems", "cryptozach.com", "www.cryptozach.com")
ATTR   = re.compile(r'(?:src|content|href|data-src)\s*=\s*["\']([^"\']+\.(?:%s)(?:\?[^"\']*)?(?:#[^"\']*)?)["\']' % EXT, re.I)
URL    = re.compile(r'url\(\s*["\']?([^"\')]+\.(?:%s)(?:\?[^"\')]*)?)["\']?\s*\)' % EXT, re.I)
SRCSET = re.compile(r'srcset\s*=\s*["\']([^"\']+)["\']', re.I)
JSONLD = re.compile(r'"(?:image|logo|thumbnailUrl|contentUrl)"\s*:\s*"([^"]+\.(?:%s)(?:\?[^"]*)?)"' % EXT, re.I)
NON_SITE = ("_site/", "node_modules/", ".jekyll-cache/", "_drafts/")


def is_external(r):
    r = r.strip()
    return (r.startswith(("http://", "https://", "//", "data:", "mailto:"))
            or "{{" in r or "{%" in r or r == "")


def canon(r):
    m = re.match(r'https?://([^/]+)(/[^\s]*)?$', r.strip(), re.I)
    return (m.group(2) or "/") if (m and m.group(1).lower() in CANON) else r


def strip(r):
    return r.split("?", 1)[0].split("#", 1)[0].strip()


def refs(text):
    s = set()
    for rx in (ATTR, URL, JSONLD):
        s |= {m.group(1) for m in rx.finditer(text)}
    for m in SRCSET.finditer(text):
        for c in m.group(1).split(","):
            u = c.strip().split()[0] if c.strip() else ""
            if re.search(r"\.(?:%s)(?:[?#]|$)" % EXT, u, re.I):
                s.add(u)
    return s


def git(*a):
    return subprocess.run(["git", *a], capture_output=True)


# The pushed commit's full path set (what will deploy).
trk = set(git("ls-tree", "-r", "--name-only", SHA).stdout.decode("utf-8", "replace").splitlines())
# All .html of the pushed commit in ONE archive stream (git archive does not support :!
# exclude pathspecs, so scope to *.html here and drop build output in the loop; *.html stays
# small/fast since it never pulls the large image/font binaries).
arch = git("archive", "--format=tar", SHA, "--", "*.html")
broken = []
if arch.returncode == 0 and arch.stdout:
    tf = tarfile.open(fileobj=io.BytesIO(arch.stdout))
    for m in tf.getmembers():
        if not m.isfile() or not m.name.endswith(".html"):
            continue
        if any(m.name.startswith(n) for n in NON_SITE):
            continue
        text = tf.extractfile(m).read().decode("utf-8", "replace")
        for r in refs(text):
            rr = canon(strip(r))
            if is_external(rr) or not rr:
                continue
            target = rr.lstrip("/") if rr.startswith("/") else os.path.normpath(os.path.join(os.path.dirname(m.name), rr))
            if target not in trk:
                broken.append((m.name, r, target))

if broken:
    sys.stderr.write("pre-push BLOCKED: pushed page(s) reference an image MISSING from the pushed commit (would 404 on deploy):\n")
    for f, r, t in sorted(set(broken)):
        sys.stderr.write("  %s: %s  ->  missing: %s\n" % (f, r, t))
    sys.stderr.write("Fix: commit the asset (or correct the ref). Bypass once: SKIP_BROKEN_REF_PREPUSH=1 git push ...\n")
    sys.exit(1)
sys.exit(0)
