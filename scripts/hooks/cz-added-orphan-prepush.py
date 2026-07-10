#!/usr/bin/env python3
"""cz-added-orphan-prepush.py: added-orphan publication-image guard for the site-clone pre-push hook.

Given a pushed local SHA (argv[1]) and the remote SHA it replaces (argv[2], all-zeros for a new
ref), exit non-zero if the push range ADDS a publication image (Publication-Images/, exhibits/)
that NOTHING in the pushed commit's text files references. Such a file would be born an orphan:
shipped weight with no page, the class that previously accumulated for months until a bulk triage
(the 2026-07-10 orphan disposition removed the last 7). Catching it AT PUSH TIME, while the author
still has context, is the forcing function.

Design notes (mirroring cz-broken-ref-prepush.py):
  - It validates the PUSHED COMMIT's tree, not the index or working tree, so unrelated WIP never
    false-blocks and a staged-but-uncommitted reference never false-passes.
  - "Added" is git diff --diff-filter=A between the remote tip (or the origin/main merge-base for
    a new ref) and the pushed tip: exactly what this push introduces.
  - "Referenced" reuses the conservative scan of scripts/orphan_figure_guard.py (workflow clone):
    image-path tokens from every text file in the pushed tree, matched by path OR basename, so a
    ref from CSS, markdown, JSON-LD, or a saved page still counts and near-misses do not block.
  - All text files are read from ONE `git archive` stream of the pushed commit (no per-file git
    show), keeping it sub-second.
  - Only ADDED images are judged. Pre-existing orphans never block a push here (the standing set
    is dispositioned separately); this guard only stops NEW orphans at birth.

Bypass is handled by the caller (SKIP_ADDED_ORPHAN_PREPUSH). Fail-soft: any git/IO error yields
no findings rather than a spurious block.
"""
import io
import os
import re
import subprocess
import sys
import tarfile

LOCAL = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
REMOTE = (sys.argv[2] if len(sys.argv) > 2 else "").strip()
if not LOCAL:
    sys.exit(0)

IMG_EXT = ("png", "jpg", "jpeg", "webp", "svg", "gif", "ico")
_EXT_ALT = "|".join(IMG_EXT)
PUBLICATION_IMAGE_DIRS = ("Publication-Images", "exhibits")
TEXT_SPECS = ["*.html", "*.css", "*.md", "*.js", "*.json", "*.xml", "*.yml", "*.yaml", "*.txt"]
NON_SITE = ("_site/", "node_modules/", ".jekyll-cache/", "_drafts/")
ANY_IMG_TOKEN = re.compile(r'''["'(\s]([^"'()\s]+\.(?:%s))(?:[?#][^"'()\s]*)?''' % _EXT_ALT, re.I)


def git(*a):
    return subprocess.run(["git", *a], capture_output=True)


def base_for_range():
    """The comparison base: the remote tip being replaced, or the origin/main merge-base for a
    brand-new ref. None means no safe base (skip rather than guess)."""
    if REMOTE and set(REMOTE) != {"0"}:
        return REMOTE
    r = git("merge-base", "origin/main", LOCAL)
    mb = r.stdout.decode().strip()
    return mb if r.returncode == 0 and mb else None


try:
    base = base_for_range()
    if not base:
        sys.exit(0)
    r = git("diff", "--name-only", "--diff-filter=A", base, LOCAL)
    if r.returncode != 0:
        sys.exit(0)
    img_suffixes = tuple("." + e for e in IMG_EXT)
    cand = []
    for p in r.stdout.decode("utf-8", "replace").splitlines():
        p = p.strip().replace(os.sep, "/")
        if p and p.split("/", 1)[0] in PUBLICATION_IMAGE_DIRS and p.lower().endswith(img_suffixes):
            cand.append(p)
    if not cand:
        sys.exit(0)

    # git archive hard-fails on a pathspec matching NOTHING (e.g. no *.yaml in the tree),
    # so pass only the specs whose suffix exists in the pushed tree.
    ls = git("ls-tree", "-r", "--name-only", LOCAL)
    if ls.returncode != 0:
        sys.exit(0)
    names = ls.stdout.decode("utf-8", "replace").splitlines()
    present = [spec for spec in TEXT_SPECS
               if any(n.lower().endswith(spec[1:]) for n in names)]
    if not present:
        sys.exit(0)
    arch = git("archive", "--format=tar", LOCAL, "--", *present)
    if arch.returncode != 0 or not arch.stdout:
        # fail-soft: judging candidates against an EMPTY reference set would flag
        # every added image; on a failed read, do not block.
        sys.exit(0)
    referenced_paths, referenced_basenames = set(), set()
    tf = tarfile.open(fileobj=io.BytesIO(arch.stdout))
    for m in tf.getmembers():
        if not m.isfile() or any(m.name.startswith(n) for n in NON_SITE):
            continue
        text = tf.extractfile(m).read().decode("utf-8", "replace")
        for tok in ANY_IMG_TOKEN.finditer(text):
            t = tok.group(1).split("?", 1)[0].split("#", 1)[0]
            referenced_paths.add(t.lstrip("/"))
            referenced_basenames.add(os.path.basename(t))

    orphans = [p for p in cand
               if p not in referenced_paths and os.path.basename(p) not in referenced_basenames]
except Exception:
    sys.exit(0)

if orphans:
    sys.stderr.write("pre-push BLOCKED: this push ADDS publication image(s) referenced by no page "
                     "(born orphans; shipped weight with no surface):\n")
    for o in sorted(orphans):
        sys.stderr.write("  %s\n" % o)
    sys.stderr.write("Fix: wire each image onto a page (or drop it from the push). "
                     "Bypass once: SKIP_ADDED_ORPHAN_PREPUSH=1 git push ...\n")
    sys.exit(1)
sys.exit(0)
