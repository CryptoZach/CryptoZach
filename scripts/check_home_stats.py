#!/usr/bin/env python3
"""check_home_stats.py: ground the homepage hero stat tiles to a single source.

Why this exists
---------------
The homepage hero (index.html .home-stat block) shows six program-scale figures
(governance protocols audited, stablecoin gateways mapped, transfer volume
analyzed, tokenized dollar products mapped, DePIN networks studied, months of
on-chain data). Each is a hardcoded number sourced from a research dataset, so
each drifts as the research advances (e.g. on 2026-07-03 the hero showed "34
months of on-chain data" while Routing the Dollar reported 35). Unlike the
federal-letter count, these are not derivable from repo structure, so the source
of truth is a curated registry: scripts/program_stats.json. Bump a value THERE and
re-deploy; this checker fails if a hero tile drifts from the registry.

What it checks
--------------
- Every .home-stat tile's number matches the registry entry for its label.
- No tile is missing from the registry, and no registry entry is missing a tile.
- Registry entries carrying a "flag" print as ADVISORIES (non-fatal): these mark
  a value the author still needs to confirm (e.g. the 34-vs-35-month ambiguity).

Source of truth is a registry, not a derivation, so this checker guarantees the
hero cannot silently diverge from the one place the author maintains; it cannot
tell you the registry itself has gone stale. The registry's "source" notes say
where each figure comes from so it can be re-derived on update.

Usage
-----
    python3 scripts/check_home_stats.py           # report; exit 1 on any mismatch
    python3 scripts/check_home_stats.py --quiet    # only print on failure
    python3 scripts/check_home_stats.py --json      # machine-readable

Resolves the tree from the current working directory (falling back to the
script's own clone), so a deploy-gate in the site clone can invoke this script
living in the workflow clone against the site tree.
"""
import argparse
import json
import os
import re
import subprocess
import sys

REGISTRY_REL = os.path.join("scripts", "program_stats.json")
HERO_FILE_REL = "index.html"

# Two markup shapes, because the hero tiles were reshaped by the 2026-08 vault
# theme and this guard was still looking for the old one. It reported all six
# registry entries as "no matching hero tile" and BLOCKED the push, which was the
# correct behaviour for a guard that cannot see its subject: the tiles had not
# been removed, they had been renamed from
#   <span class="home-stat__num">52</span><span class="home-stat__label">...
# to
#   <div class="stat"><b>52</b><span>...
# with every VALUE unchanged (52, 19, $60.6T, 14, 13, 35). Both are matched so
# the guard keeps working against pages that still carry the older markup.
TILE_RE_LEGACY = re.compile(
    r'home-stat__num">(?P<num>[^<]+)</span>\s*'
    r'<span class="home-stat__label">(?P<label>[^<]+)</span>')
TILE_RE_VAULT = re.compile(
    r'class="stat"><b>(?P<num>[^<]+)</b>\s*<span>(?P<label>[^<]+)</span>')


def find_tiles(html):
    """Every hero tile in either markup shape, as (num, label) pairs."""
    seen, out = set(), []
    for rx in (TILE_RE_LEGACY, TILE_RE_VAULT):
        for m in rx.finditer(html):
            pair = (m.group("num").strip(), m.group("label").strip())
            if pair not in seen:
                seen.add(pair)
                out.append(m)
    return out


def repo_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), script_dir):
        try:
            out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                                 capture_output=True, text=True, cwd=cwd)
            if out.returncode == 0 and out.stdout.strip():
                root = out.stdout.strip()
                if os.path.isfile(os.path.join(root, REGISTRY_REL)):
                    return root
        except Exception:
            pass
    return os.path.dirname(script_dir)


def load_registry(root):
    with open(os.path.join(root, REGISTRY_REL), encoding="utf-8") as fh:
        data = json.load(fh)
    by_label = {}
    for entry in data.get("home_stats", []):
        by_label[entry["label"].strip()] = entry
    return by_label


def parse_tiles(root):
    path = os.path.join(root, HERO_FILE_REL)
    tiles = []
    with open(path, encoding="utf-8", errors="replace") as fh:
        for lineno, line in enumerate(fh, start=1):
            for m in find_tiles(line):
                tiles.append({
                    "num": m.group("num").strip(),
                    "label": m.group("label").strip(),
                    "line": lineno,
                })
    return tiles


def check(root):
    reg = load_registry(root)
    tiles = parse_tiles(root)
    mismatches, unregistered = [], []
    seen_labels = set()

    for t in tiles:
        seen_labels.add(t["label"])
        entry = reg.get(t["label"])
        if entry is None:
            unregistered.append(t)
            continue
        if t["num"] != str(entry["value"]).strip():
            mismatches.append({
                "label": t["label"], "line": t["line"],
                "found": t["num"], "expected": entry["value"],
            })

    missing_tiles = [lbl for lbl in reg if lbl not in seen_labels]
    flags = [{"label": lbl, "flag": e["flag"]}
             for lbl, e in reg.items() if e.get("flag")]
    return {
        "tiles_checked": len(tiles),
        "mismatches": mismatches,
        "unregistered_tiles": unregistered,
        "missing_tiles": missing_tiles,
        "flags": flags,
        "ok": not (mismatches or unregistered or missing_tiles),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--quiet", action="store_true", help="only print on failure")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    args = ap.parse_args()

    root = repo_root()
    if not os.path.isfile(os.path.join(root, REGISTRY_REL)):
        print(f"check_home_stats: ERROR registry not found at {REGISTRY_REL} under {root}.",
              file=sys.stderr)
        return 2

    res = check(root)

    if args.json:
        print(json.dumps(res, indent=2))
        return 0 if res["ok"] else 1

    # Advisories (non-fatal) always print, even on success, unless --quiet-and-ok.
    if res["flags"] and not (args.quiet and res["ok"]):
        for f in res["flags"]:
            print(f"check_home_stats: ADVISORY [{f['label']}]: {f['flag']}")

    if not res["ok"]:
        print("check_home_stats: FAIL. Hero stat tiles disagree with scripts/program_stats.json:")
        for mm in res["mismatches"]:
            print(f"  index.html:{mm['line']}  [{mm['label']}]  hero shows {mm['found']!r}, "
                  f"registry says {mm['expected']!r}")
        for t in res["unregistered_tiles"]:
            print(f"  index.html:{t['line']}  [{t['label']}] = {t['num']!r} has no registry entry "
                  f"(add it to scripts/program_stats.json)")
        for lbl in res["missing_tiles"]:
            print(f"  registry entry [{lbl}] has no matching hero tile "
                  f"(tile removed or label changed)")
        print("\nFix by bumping scripts/program_stats.json (the source of truth) and re-deploying, "
              "or correct the hero tile to match.")
        return 1

    if not args.quiet:
        print(f"check_home_stats: OK. All {res['tiles_checked']} hero stat tile(s) "
              f"agree with scripts/program_stats.json.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
