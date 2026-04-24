#!/usr/bin/env python3
"""
Bump cache-buster version across all HTML files site-wide.

The tokenization.systems static site uses a query-string cache-buster
pattern (`styles.css?v=N`, `script.js?v=N`) to invalidate browser and
CDN caches when these assets change. Because there is no build-time
asset fingerprinting in place (GitHub Pages does not run post-build
hooks without a custom Actions workflow), the cache-buster value must
be bumped manually when `styles.css` or `script.js` change.

This script automates that bump. It scans all `.html` files at repo
root and under served-site subdirectories, finds the current
`<asset>?v=<N>` references, increments N, and writes back consistently.

Usage:
    python3 scripts/bump-cache-buster.py                 # bump by 1
    python3 scripts/bump-cache-buster.py --to 150        # set to 150
    python3 scripts/bump-cache-buster.py --asset styles  # styles only
    python3 scripts/bump-cache-buster.py --asset script  # script only
    python3 scripts/bump-cache-buster.py --dry-run       # preview only

Scope (served-site paths only):
    Repo root: *.html (index.html, 404.html, etc.)
    Subdirs: papers/, research/, overview/, resume/, frameworks/,
             contact/, speaker-and-advisory/, ...
    Excludes: research_content/, docs/, handoff/, tools/, tests/,
              node_modules/, .git/, _site/, playwright-report/

When to run:
    1. After any commit that changes styles.css or script.js.
    2. Before deploy cycles (if pre-commit hook is not installed).
    3. Ad-hoc when cache-buster drift is suspected.

Exit codes:
    0: success (changes applied OR dry-run preview)
    1: inconsistent state detected (mixed version values across HTML)
    2: no HTML files found or scan error
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Optional

# Asset patterns we manage. Keep tight: only site-served global assets.
ASSET_PATTERNS = {
    "styles": re.compile(r"styles\.css\?v=(\d+)"),
    "script": re.compile(r"script\.js\?v=(\d+)"),
}

# Subtrees to EXCLUDE from the scan. Everything else at repo root or in
# served-site subdirs is in scope. Mirrors the exclude list in _config.yml.
EXCLUDE_DIRS = {
    "research_content",
    "docs",
    "handoff",
    "tools",
    "tests",
    "scripts",
    "node_modules",
    ".git",
    "_site",
    "playwright-report",
    "test-results",
    "__pycache__",
    ".cursor",
    ".claude",
    "Resumes_v2",
    "Resumes_TokenizationSystems",
    "Cryptozach-site-files",
}


def find_html_files(repo_root: Path) -> list[Path]:
    """Return all .html files under repo_root excluding EXCLUDE_DIRS."""
    results: list[Path] = []
    for path in repo_root.rglob("*.html"):
        if any(part in EXCLUDE_DIRS for part in path.parts):
            continue
        results.append(path)
    return sorted(results)


def current_versions(
    files: list[Path], asset: str
) -> tuple[Optional[int], Counter[int], list[Path]]:
    """Return (canonical current version, all-versions-seen counter, files
    that contain at least one reference to the asset).

    Canonical version is the MODE (most common) of all values. If a single
    value dominates, that is canonical. If no file references the asset,
    returns (None, Counter(), []).
    """
    pattern = ASSET_PATTERNS[asset]
    versions: Counter[int] = Counter()
    files_with_ref: list[Path] = []
    for path in files:
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        matches = pattern.findall(content)
        if matches:
            files_with_ref.append(path)
            versions.update(int(m) for m in matches)
    if not versions:
        return None, versions, files_with_ref
    canonical, _count = versions.most_common(1)[0]
    return canonical, versions, files_with_ref


def bump_file(path: Path, asset: str, old_v: int, new_v: int) -> int:
    """Replace asset?v=<old_v> -> asset?v=<new_v> in `path`. Returns number
    of replacements."""
    pattern = ASSET_PATTERNS[asset]
    content = path.read_text(encoding="utf-8")
    # Only replace if current version matches old_v; leave other values
    # alone (so --to can target mixed-state cleanup explicitly).
    old_marker = f"{asset}.css?v={old_v}" if asset == "styles" else f"{asset}.js?v={old_v}"
    new_marker = f"{asset}.css?v={new_v}" if asset == "styles" else f"{asset}.js?v={new_v}"
    count = content.count(old_marker)
    if count == 0:
        return 0
    new_content = content.replace(old_marker, new_marker)
    path.write_text(new_content, encoding="utf-8")
    return count


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bump cache-buster version across site HTML files."
    )
    parser.add_argument(
        "--asset",
        choices=["styles", "script", "both"],
        default="both",
        help="which asset to bump (default: both)",
    )
    parser.add_argument(
        "--to",
        type=int,
        default=None,
        help="set to specific version (default: current + 1)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print what would change without writing",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="repo root path (default: parent of scripts/)",
    )
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    if not repo_root.exists():
        print(f"ERROR: repo root does not exist: {repo_root}", file=sys.stderr)
        return 2

    files = find_html_files(repo_root)
    if not files:
        print(f"ERROR: no HTML files found under {repo_root}", file=sys.stderr)
        return 2

    print(f"Scanned {len(files)} HTML files under {repo_root}")
    print()

    assets = ["styles", "script"] if args.asset == "both" else [args.asset]
    exit_code = 0

    for asset in assets:
        canonical, versions, files_with_ref = current_versions(files, asset)
        asset_filename = f"{asset}.css" if asset == "styles" else f"{asset}.js"

        print(f"=== {asset_filename} ===")
        if canonical is None:
            print(f"  no references to {asset_filename}?v=N found; skipping")
            print()
            continue

        print(f"  references found in {len(files_with_ref)} file(s)")
        print(f"  version distribution: {dict(versions)}")
        print(f"  canonical current version: v={canonical}")

        if len(versions) > 1:
            print(
                f"  WARNING: mixed-version state detected; "
                f"{len(versions)} distinct values"
            )
            exit_code = 1

        if args.to is not None:
            new_v = args.to
        else:
            new_v = canonical + 1
        print(f"  target version: v={new_v}")

        if new_v == canonical:
            print("  no bump needed (target == current)")
            print()
            continue

        # Apply bump. Only bump files at canonical version; mixed-state
        # files are flagged but not auto-fixed (user re-runs with --to
        # to force convergence).
        if args.dry_run:
            print(f"  [DRY-RUN] would bump {canonical} -> {new_v} across "
                  f"files containing {asset_filename}?v={canonical}")
        else:
            total_replacements = 0
            files_changed = 0
            for path in files_with_ref:
                replacements = bump_file(path, asset, canonical, new_v)
                if replacements > 0:
                    total_replacements += replacements
                    files_changed += 1
            print(f"  applied: {total_replacements} replacement(s) "
                  f"across {files_changed} file(s)")
        print()

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
