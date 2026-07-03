#!/usr/bin/env python3
"""render_home_stats.py: generate the index.html hero-stat block from the registry.

Build-time injection for a deliberately-static site. tokenization.systems commits
fully-rendered static HTML and uses NO Liquid templating (see _config.yml), so the
hero-stat numbers cannot be a Jekyll template. Instead this generator injects them
at author-edit time: it rewrites a marker-delimited region of index.html from the
single source of truth (scripts/program_stats.json). Author workflow:

    1. edit scripts/program_stats.json (bump a value)
    2. python3 scripts/render_home_stats.py --write   (or: npm run build:home-stats)
    3. commit index.html + the registry, deploy

The generated region is bounded by:
    <!-- program-stats:home-stats START (...) -->
    ...six generated .home-stat tiles...
    <!-- program-stats:home-stats END -->

Modes:
    --check   (default) verify the committed region matches what the registry would
              generate; exit 1 on drift. Wired into CI (build-deploy.yml) and usable
              as a local gate. Complements scripts/check_home_stats.py (which checks
              tile values independently of the markers).
    --write   regenerate the region in place.

Resolves the tree from cwd (falling back to the script's clone), so it runs from
either clone. Depends only on the stdlib.
"""
import argparse
import difflib
import json
import os
import re
import subprocess
import sys

REGISTRY_REL = os.path.join("scripts", "program_stats.json")
HERO_FILE_REL = "index.html"
START_RE = re.compile(r"^(?P<indent>\s*)<!--\s*program-stats:home-stats START\b")
END_RE = re.compile(r"^\s*<!--\s*program-stats:home-stats END\b")


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


def load_stats(root):
    with open(os.path.join(root, REGISTRY_REL), encoding="utf-8") as fh:
        return json.load(fh).get("home_stats", [])


def generate_tiles(stats, indent):
    lines = []
    for s in stats:
        lines.append(
            f'{indent}<div class="home-stat">'
            f'<span class="home-stat__num">{s["value"]}</span>'
            f'<span class="home-stat__label">{s["label"]}</span></div>')
    return lines


def locate_region(lines):
    """Return (start_idx, end_idx, indent) of the marker region, or raise."""
    start_idx = end_idx = indent = None
    for i, line in enumerate(lines):
        m = START_RE.match(line)
        if m:
            start_idx, indent = i, m.group("indent")
        elif END_RE.match(line):
            end_idx = i
            break
    if start_idx is None or end_idx is None or end_idx <= start_idx:
        raise ValueError(
            "hero-stats markers not found in index.html. Expected a region bounded by\n"
            "  <!-- program-stats:home-stats START (...) -->  ...  <!-- program-stats:home-stats END -->\n"
            "Add the markers around the .home-stat tiles once, then re-run.")
    return start_idx, end_idx, indent


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="regenerate the region in place")
    mode.add_argument("--check", action="store_true",
                      help="verify the region matches the registry (default); exit 1 on drift")
    args = ap.parse_args()
    do_write = args.write

    root = repo_root()
    hero_path = os.path.join(root, HERO_FILE_REL)
    try:
        stats = load_stats(root)
    except OSError as e:
        print(f"render_home_stats: ERROR reading registry: {e}", file=sys.stderr)
        return 2
    if not stats:
        print("render_home_stats: ERROR registry has no home_stats.", file=sys.stderr)
        return 2

    with open(hero_path, encoding="utf-8") as fh:
        lines = fh.read().split("\n")

    try:
        start_idx, end_idx, indent = locate_region(lines)
    except ValueError as e:
        print(f"render_home_stats: ERROR {e}", file=sys.stderr)
        return 2

    tile_indent = indent if indent else "          "
    current = lines[start_idx + 1:end_idx]
    generated = generate_tiles(stats, tile_indent)

    if do_write:
        lines[start_idx + 1:end_idx] = generated
        with open(hero_path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(lines))
        changed = current != generated
        print(f"render_home_stats: wrote {len(generated)} hero tile(s) from "
              f"{REGISTRY_REL}" + ("." if changed else " (no change)."))
        return 0

    # default: --check
    if current == generated:
        print(f"render_home_stats: OK. Hero block in sync with {REGISTRY_REL} "
              f"({len(generated)} tiles).")
        return 0
    print(f"render_home_stats: FAIL. index.html hero block is out of sync with {REGISTRY_REL}. "
          f"Run: python3 scripts/render_home_stats.py --write")
    diff = difflib.unified_diff(current, generated, "index.html (committed)",
                                "generated from registry", lineterm="")
    for d in diff:
        print("  " + d)
    return 1


if __name__ == "__main__":
    sys.exit(main())
