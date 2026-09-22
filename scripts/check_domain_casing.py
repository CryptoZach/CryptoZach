#!/usr/bin/env python3
"""check_domain_casing.py: the brand writes its domain and address in title case.

Author rule 2026-09-22: "Always capitalize Tokenization.Systems and
Zach@Tokenization.Systems instead of lowercase tokenization.systems; enforce
this everywhere." URLs are exempt (https://tokenization.systems/... stays
lowercase; the host is case-insensitive and canonical URLs are lowercase by
convention). What must be title case:

  1. The domain as DISPLAY TEXT (a text node, not inside an href/src/content
     attribute or a URL): "Tokenization.Systems", never "tokenization.systems".
  2. The address anywhere, including mailto: hrefs and JSON-LD "email":
     "Zach@Tokenization.Systems".
  3. JSON-LD alternateName entries naming the domain: "Tokenization.Systems".

Scope: tracked *.html files (git ls-files), so stray worktrees and build
output are not scanned. Exit 0 OK, 1 violations, 2 could not run. --quiet
prints only failures. Wired into scripts/hooks/pre-push next to the count
checks.
"""
import argparse, os, re, subprocess, sys

DOMAIN_TEXT = re.compile(r'(?<![\w@/.\-])tokenization\.systems(?![\w/\-])')
EMAIL_ANY = re.compile(r'(?i)zach@tokenization\.systems')
EMAIL_OK = 'Zach@Tokenization.Systems'
ALT_BAD = re.compile(r'"alternateName"\s*:\s*\[[^\]]*"tokenization\.systems"')


def repo_root():
    try:
        return subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def tracked_html(root):
    out = subprocess.run(['git', '-C', root, 'ls-files', '-z'], capture_output=True, text=True)
    if out.returncode != 0:
        return None
    return [p for p in out.stdout.split('\0') if p.endswith('.html')]


def text_nodes(html):
    body = re.sub(r'<script\b[^>]*>.*?</script>', ' ', html, flags=re.S | re.I)
    body = re.sub(r'<style\b[^>]*>.*?</style>', ' ', body, flags=re.S | re.I)
    body = re.sub(r'<!--.*?-->', ' ', body, flags=re.S)
    return re.sub(r'<[^>]+>', '\n', body)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quiet', action='store_true')
    args = ap.parse_args()
    root = repo_root()
    files = tracked_html(root)
    if files is None:
        print('check_domain_casing: WARN git ls-files failed; guard did not run.')
        return 2
    problems = []
    for rel in files:
        path = os.path.join(root, rel)
        try:
            with open(path, encoding='utf-8', errors='replace') as fh:
                html = fh.read()
        except OSError:
            continue
        for m in DOMAIN_TEXT.finditer(text_nodes(html)):
            problems.append((rel, 'display text', 'tokenization.systems'))
            break
        bad_emails = sorted({m.group(0) for m in EMAIL_ANY.finditer(html) if m.group(0) != EMAIL_OK})
        for e in bad_emails:
            problems.append((rel, 'address', e))
        if ALT_BAD.search(html):
            problems.append((rel, 'JSON-LD alternateName', 'tokenization.systems'))
    if problems:
        print('check_domain_casing: FAIL. Title case is required for the domain as display text, the address, and the JSON-LD alias '
              '(Tokenization.Systems, Zach@Tokenization.Systems). URLs stay lowercase.')
        for rel, kind, val in problems:
            print(f'  - {rel}: {kind} reads {val!r}')
        return 1
    if not args.quiet:
        print(f'check_domain_casing: OK. {len(files)} tracked HTML file(s); domain display text, address, and JSON-LD alias are title case.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
