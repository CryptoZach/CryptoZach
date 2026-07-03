#!/usr/bin/env python3
"""render_letter_count.py: sync every federal-comment-letter-count mention to N.

Build-time injection for the letter count, the corpus-wide analog of
render_home_stats.py. The count is NOT a curated value: N is DERIVED from the
published federal letter pages (letters/<slug>/ minus the international FSB
series), exactly as scripts/check_letter_count.py derives it. This generator
rewrites every count mention across the served HTML to N, in the FORM it already
uses (word "fourteen" vs numeral "14", capitalization preserved), so the ~60
mentions (prose, meta, og/twitter, JSON-LD) never have to be hand-edited.

It reuses check_letter_count.py's pattern battery, decomposition-skip, and
allowlist, so the generator and the guard can never disagree about what counts
as a mention. The overview growth-narrative stays prose (allowlisted, not
tokenizable). Because the corpus is normally already consistent, --write is a
no-op until N changes (add a 15th letter page, run --write, every mention
updates).

Author workflow when a letter is filed and its page is published:
    python3 scripts/render_letter_count.py --write   (or: npm run build:letter-count)
    commit, deploy

Modes:
    --check  (default) list any mention != N; exit 1 on drift (same verdict as
             check_letter_count.py, from the writer's perspective).
    --write  rewrite every drifted mention to N in place.

Resolves the tree from cwd (falling back to the script's clone). Stdlib only.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_letter_count as clc  # noqa: E402  (pattern battery + derivation, shared)


def word_form(n, like_token):
    """Word form of n, matching the capitalization of like_token."""
    w = clc.INT_TO_WORD.get(n, str(n))
    if like_token[:1].isupper():
        return w[:1].upper() + w[1:]
    return w


def plan_line(line, n, rel):
    """Return (new_line, [changes]) applying count->n rewrites on one line."""
    spans = []  # (start, end, replacement, old)
    for pat in clc.COUNT_PATTERNS:
        for m in pat.finditer(line):
            span_text = m.group(0).lower()
            if any(mark in span_text for mark in clc.DECOMP_MARKERS):
                continue
            tok = m.group("n")
            val = clc.token_to_int(tok)
            if val is None or val == n:
                continue
            if (rel.replace(os.sep, "/"), tok.strip().lower()) in clc.ALLOWLIST:
                continue
            if "count-guard-ignore" in line:
                continue
            repl = str(n) if tok.isdigit() else word_form(n, tok)
            spans.append((m.start("n"), m.end("n"), repl, tok))
    if not spans:
        return line, []
    # De-dupe identical spans (two patterns matching the same number token) and
    # apply right-to-left so earlier offsets stay valid.
    uniq = {}
    for s in spans:
        uniq[(s[0], s[1])] = s
    changes = []
    new = line
    for start, end, repl, old in sorted(uniq.values(), key=lambda s: s[0], reverse=True):
        new = new[:start] + repl + new[end:]
        changes.append((old, repl))
    return new, changes


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--write", action="store_true", help="rewrite drifted mentions in place")
    mode.add_argument("--check", action="store_true",
                      help="list drifted mentions (default); exit 1 on drift")
    args = ap.parse_args()

    root = clc.repo_root()
    n, slugs = clc.derive_n(root)
    if n == 0:
        print("render_letter_count: ERROR could not derive N (no letters/ pages).",
              file=sys.stderr)
        return 2

    total_changes, files_changed = 0, 0
    report = []
    for path in clc.html_files(root):
        rel = os.path.relpath(path, root)
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                lines = fh.read().split("\n")
        except OSError:
            continue
        changed = False
        for i, line in enumerate(lines):
            new_line, changes = plan_line(line, n, rel)
            if changes:
                lines[i] = new_line
                changed = True
                total_changes += len(changes)
                for old, repl in changes:
                    report.append(f"  {rel}:{i + 1}  {old!r} -> {repl!r}")
        if changed:
            files_changed += 1
            if args.write:
                with open(path, "w", encoding="utf-8") as fh:
                    fh.write("\n".join(lines))

    word = clc.INT_TO_WORD.get(n, str(n))
    if args.write:
        if total_changes:
            print(f"render_letter_count: wrote {total_changes} change(s) across "
                  f"{files_changed} file(s); N = {n} ('{word}', from {len(slugs)} pages).")
            for r in report:
                print(r)
        else:
            print(f"render_letter_count: no change. All mentions already N = {n} "
                  f"('{word}', from {len(slugs)} pages).")
        return 0

    # default: --check
    if not total_changes:
        print(f"render_letter_count: OK. All count mentions == N = {n} "
              f"('{word}', from {len(slugs)} pages).")
        return 0
    print(f"render_letter_count: FAIL. {total_changes} mention(s) drift from N = {n}. "
          f"Run: python3 scripts/render_letter_count.py --write")
    for r in report:
        print(r)
    return 1


if __name__ == "__main__":
    sys.exit(main())
