#!/usr/bin/env python3
"""check_built_cache_busters.py: did the content-hash cache-buster actually FIRE on _site?

RUN IT ON THE BUILT OUTPUT, IN CI, AFTER build:postprocess. It is meaningless against the
source tree and says so if pointed there.

WHY THIS EXISTS, and why it replaced a check that looked almost identical. The obvious check
is "every source page references styles.css at one ?v=". That check is WRONG here, and it was
written, wired, measured and removed before this one was built. scripts/inline-critical-css.mjs
derives ?v= from a sha256 of the FINAL post-PurgeCSS post-minify asset and rewrites every .css
href on the _site output, applying one version to every page; the source integers are local-dev
convenience that never reach production. Measured over 200 html-touching commits spanning 99
days, the source-side predicate fired on 47.5% of commits with an unbroken run of 86 at HEAD,
because nothing in the normal edit path reduces a distinct-value count. That is not a gate, it
is a standing refusal, and it guards a value the build discards.

THE REAL FAILURE MODE IS THE ONE NOBODY WAS WATCHING. If the content-hash step silently
no-ops, every built page ships the SOURCE INTEGER instead. The site still renders, the deploy
still succeeds, and returning visitors keep a stale stylesheet until the integer happens to
change. Nothing in the pipeline notices, because the pages look fine and the integers look
like versions. That is the class this repo keeps paying for: a control whose visible signal
matches its name while meaning something else. This check asks the only question that
distinguishes them: is the shipped ?v= a CONTENT HASH, or is it the source integer that the
build was supposed to replace?

WHAT COUNTS AS A PASS. Every reference to a hashed asset on _site carries a hash-shaped value
(the build emits 8 lowercase hex), and each asset resolves to exactly ONE such value, because
one file has one hash. An integer is a hard failure. An unrecognised shape is reported as
UNKNOWN and fails, rather than being waved through, because a value this script cannot
classify is a value it cannot vouch for.

A ZERO SCAN IS A FAILURE, NEVER A PASS. If no page carries a versioned reference, the glob or
the pattern has stopped matching and this check has quietly stopped running. That is exit 2,
not exit 0, and the distinction is the whole reason the check is trustworthy when it is green.

NON-VACUITY: --selftest builds a temporary _site carrying one correct page and one regressed
page and asserts that this script's OWN predicate passes the first and fails the second. A
check nobody has watched fail has not been shown to work.

Usage (CI):   python3 scripts/check_built_cache_busters.py _site
Usage (self): python3 scripts/check_built_cache_busters.py --selftest

Exit: 0 all hashed assets carry one content hash, 1 a source integer or unknown shape shipped,
      2 nothing was scanned (broken scan, never reported as clean).
"""

from __future__ import annotations

import collections
import os
import pathlib
import re
import sys
import tempfile

# Assets whose ?v= the build derives from content. Anything else is left alone on purpose:
# images are handled by cache-bust-images.mjs with the same discipline but a different step,
# and a third-party URL is none of our business.
HASHED_ASSETS = ("styles.css", "script.js")

REF = re.compile(r'(?:href|src)="(?P<url>[^"]*?(?P<asset>' +
                 "|".join(a.replace(".", r"\.") for a in HASHED_ASSETS) +
                 r'))\?v=(?P<v>[^"&]+)"')

HASH_SHAPED = re.compile(r"^[0-9a-f]{7,64}$")
INTEGER_SHAPED = re.compile(r"^\d+$")


def classify(value: str) -> str:
    if HASH_SHAPED.match(value):
        return "hash"
    if INTEGER_SHAPED.match(value):
        return "integer"
    return "unknown"


def scan(site_dir: pathlib.Path):
    """{asset: {kind: {value: [pages]}}} over every built html page."""
    found = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))
    pages = 0
    for path in sorted(site_dir.rglob("*.html")):
        pages += 1
        rel = path.relative_to(site_dir).as_posix()
        text = path.read_text(encoding="utf-8", errors="replace")
        for m in REF.finditer(text):
            asset = m.group("asset")
            v = m.group("v")
            found[asset][classify(v)][v].append(rel)
    return found, pages


def report(found, pages, site_dir) -> int:
    if pages == 0:
        print(f"check_built_cache_busters: FAIL(2). No .html under {site_dir}. That is a broken "
              f"scan, not a clean site: run this AFTER the build, against the built output.")
        return 2
    if not found:
        print(f"check_built_cache_busters: FAIL(2). Scanned {pages} built page(s) and found no "
              f"versioned reference to any of {', '.join(HASHED_ASSETS)}. Either the pattern "
              f"stopped matching or the build stopped emitting ?v= at all. Reporting this as a "
              f"pass is how a check quietly stops running.")
        return 2

    rc = 0
    for asset in sorted(found):
        kinds = found[asset]
        n = sum(len(pgs) for k in kinds for pgs in kinds[k].values())
        integers = kinds.get("integer", {})
        unknowns = kinds.get("unknown", {})
        hashes = kinds.get("hash", {})

        if integers:
            rc = 1
            total = sum(len(p) for p in integers.values())
            print(f"check_built_cache_busters: FAIL. {asset} ships a SOURCE INTEGER on {total} "
                  f"of {n} built reference(s). The content-hash step did not fire for these, so "
                  f"the shipped ?v= no longer changes when the asset changes and returning "
                  f"visitors keep a stale copy.")
            for v, pgs in sorted(integers.items()):
                print(f"    ?v={v}  {len(pgs)} page(s): {', '.join(pgs[:4])}"
                      + (f" ... +{len(pgs) - 4}" if len(pgs) > 4 else ""))
            print(f"    FIX: the postprocess chain must run build:critical-css "
                  f"(scripts/inline-critical-css.mjs) on the built _site before deploy.")
        if unknowns:
            rc = 1
            print(f"check_built_cache_busters: FAIL. {asset} ships {sum(len(p) for p in unknowns.values())} "
                  f"reference(s) whose ?v= this check cannot classify as a hash or an integer: "
                  f"{', '.join(sorted(unknowns))}. Not vouched for.")
        if len(hashes) > 1:
            rc = 1
            print(f"check_built_cache_busters: FAIL. {asset} ships {len(hashes)} DIFFERENT content "
                  f"hashes across built pages. One file has one hash, so this means pages were "
                  f"built against different copies of the asset:")
            for v, pgs in sorted(hashes.items(), key=lambda kv: -len(kv[1])):
                print(f"    ?v={v}  {len(pgs)} page(s)")
        if not integers and not unknowns and len(hashes) == 1:
            v = next(iter(hashes))
            print(f"check_built_cache_busters: OK. {asset} ships content hash ?v={v} on all "
                  f"{n} built reference(s).")
    if rc == 0:
        print(f"check_built_cache_busters: {pages} built page(s) scanned; the content-hash step "
              f"fired for every hashed asset.")
    return rc


def selftest() -> int:
    """Drive the shipped predicate against a known-good and a known-regressed built tree."""
    good = '<link href="/styles.css?v=a3f81c02"><script src="/script.js?v=9be14d70">'
    bad = '<link href="/styles.css?v=265"><script src="/script.js?v=9be14d70">'
    legs, ok = [], True
    with tempfile.TemporaryDirectory() as td:
        root = pathlib.Path(td)
        (root / "g").mkdir()
        (root / "g" / "index.html").write_text(good, encoding="utf-8")
        f, p = scan(root / "g")
        rc = report(f, p, root / "g")
        legs.append(("correct build passes", rc == 0, rc))
        ok &= rc == 0

        (root / "b").mkdir()
        (root / "b" / "index.html").write_text(bad, encoding="utf-8")
        f, p = scan(root / "b")
        rc = report(f, p, root / "b")
        legs.append(("regressed build (source integer shipped) FAILS", rc == 1, rc))
        ok &= rc == 1

        (root / "e").mkdir()
        f, p = scan(root / "e")
        rc = report(f, p, root / "e")
        legs.append(("empty scan fails as 2, never as clean", rc == 2, rc))
        ok &= rc == 2

    print("\n--- selftest ---")
    for name, passed, rc in legs:
        print(f"  {'PASS' if passed else 'FAIL'}  (rc={rc})  {name}")
    print("\nself-test PASSED: this check has been observed to pass AND to fail, so a green "
          "run means something." if ok else "\nSELF-TEST FAILED.")
    return 0 if ok else 1


def main() -> int:
    args = [a for a in sys.argv[1:]]
    if "--selftest" in args:
        return selftest()
    site_dir = pathlib.Path(args[0] if args else os.environ.get("CI_SITE_DIR", "_site"))
    if not site_dir.is_dir():
        print(f"check_built_cache_busters: FAIL(2). {site_dir} is not a directory. This check "
              f"runs on the BUILT output, after build:postprocess.")
        return 2
    found, pages = scan(site_dir)
    return report(found, pages, site_dir)


if __name__ == "__main__":
    sys.exit(main())
