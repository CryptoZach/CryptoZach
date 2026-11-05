#!/usr/bin/env python3
"""check_plain_language.py: reader-visible text says what a docket or section IS, not its number.

Why this exists. On 2026-11-05 the site owner asked to "replace proxies like docket numbers and section numbers with human
readable info about what those proxys say and mean". The site then carried 1,131 such identifiers in visible text. Nothing
would have stopped them coming back with the next page, so this check refuses them.

What it reads: every served index.html (title, meta description, og and twitter text, and the body of <main>), llms.txt, and
script.js, whose strings render in the explorers and the search palette.

Where a number may stay, because a person or machine needs it to find the record: a link's href or title; JSON-LD identifier
fields and every other script block; data- attributes; the one generated "Official references" block on a letter page; the
machine-readable files (letters.json, recommendations.csv, genius-act.json); and script.js's palette `kw:` search strings,
code comments, and the term tables between plain-language-ignore-start and plain-language-ignore-end.

Precision, measured when this was written: the 1,131 hits on the tree before the rewrite were each read and rewritten by an
editor, none reported as a non-proxy. Recall is narrower: a question number, a footnote number or "H.R. 3633" is a proxy this
pattern list does not name, so a clean run does not mean no such pointer exists.

The glossary behind the rewrite is scripts/plain_language_glossary.json. Use it when a new page needs one of these.

Exit: 0 clean, 1 a proxy in visible text, 2 could not run. --quiet prints only failures. --root reads another tree.
"""
import argparse
import html
import os
import re
import sys

PATTERNS = [
    ('RIN', r'\bRIN\s*\d{4}-[A-Z]{2}\d{2}\b'),
    ('docket', r'\bDocket(?:\s+No\.?)?\s+[A-Z0-9][\w.-]*\d[\w-]*'),
    ('file number', r'\bFile\s+(?:No\.?|Number)\s+[\w.-]+'),
    ('docket id', r'\b(?:OCC|FINCEN|TREAS-DO|NCUA|CFTC|FDIC)-20\d\d-\d{3,4}(?:-\d{4})?\b|\bS7-20\d\d-\d+\b|\bR-1[89]\d\d\b|\b4-927\b|\bDSP-3\b'),
    ('agency code', r'\b(?:AG\d{2}|AF\d{2}|AB\d{2}|AC\d{2}|AH\d{2})\b'),
    ('Federal Register', r'\b\d{2,3}\s+(?:Fed\.\s*Reg\.|FR)\s+\d{3,6}\b'),
    ('CFR or U.S.C.', r'\b\d{1,2}\s+(?:CFR|C\.F\.R\.|U\.S\.C\.|USC)\b'),
    ('section', r'(?i:\bsections?\s+\d[\w.()-]*|\bsec\.\s+\d[\w.()-]*)|§+\s*\d[\w.()-]*'),
    ('rule', r'\bRules?\s+\d{2,4}[\w()-]*'),
    ('release or OMB number', r'\bRelease\s+Nos?\.?\s*[\w-]+|\bOMB\s+(?:control\s+)?(?:No\.?\s*|number\s*)?\d{4}-\d{4}|\b3038-0076\b|\b34-\d{6}\b'),
]
RX = [(name, re.compile(rx)) for name, rx in PATTERNS]
PRUNE = {'.git', '.github', '.claude', '.codex', '_build', '_site', 'node_modules', 'handoff', 'scripts', 'data', 'assets', 'icons', 'ink-brand-kit',
         'tools', 'Publication-Images', 'resumes', '_partials', '_includes', '_layouts', 'research_content', 'docs', 'submissions'}
META = re.compile(r'<meta[^>]+(?:name="description"|property="og:(?:title|description)"|name="twitter:(?:title|description)")[^>]*content="([^"]*)"')


def page_text(raw):
    """The words a reader sees, with the places a number may stay removed."""
    head = ' '.join(re.findall(r'<title>(.*?)</title>', raw, re.S)) + ' ' + ' '.join(META.findall(raw))
    main = re.search(r'<main\b.*?</main>', raw, re.S)
    body = main.group(0) if main else raw
    body = re.sub(r'<details[^>]*>\s*<summary[^>]*>\s*Official references.*?</details>', ' ', body, flags=re.S)
    body = re.sub(r'<script.*?</script>|<style.*?</style>|<!--.*?-->', ' ', body, flags=re.S)
    body = re.sub(r'<[^>]+>', ' ', body)
    return re.sub(r'\s+', ' ', html.unescape(head + ' ' + body))


def script_lines(raw):
    """script.js line by line, without comments, palette search strings or the marked term tables."""
    skipping = False
    for number, line in enumerate(raw.split('\n'), 1):
        if 'plain-language-ignore-start' in line:
            skipping = True
            continue
        if 'plain-language-ignore-end' in line:
            skipping = False
            continue
        if skipping or 'count-guard-ignore' in line:
            continue
        line = re.sub(r"\bkw:\s*'(?:[^'\\]|\\.)*'", '', line)
        line = re.sub(r'/\*.*?\*/', '', line)
        stripped = line.strip()
        if stripped.startswith(('//', '/*', '*')):
            continue
        yield number, re.sub(r'\s//\s.*$', '', line)


def hits_in(text):
    for name, rx in RX:
        for match in rx.finditer(text):
            yield name, match.group(0), text[max(0, match.start() - 50):match.end() + 40]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--quiet', action='store_true')
    parser.add_argument('--root', default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    args = parser.parse_args()
    root = args.root
    if not os.path.isfile(os.path.join(root, 'index.html')):
        print('check_plain_language: no site at %s' % root, file=sys.stderr)
        return 2
    found, pages = [], 0
    for folder, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in PRUNE]
        if 'index.html' in files:
            pages += 1
            path = os.path.join(folder, 'index.html')
            with open(path, encoding='utf-8', errors='replace') as stream:
                text = page_text(stream.read())
            found += [(os.path.relpath(path, root), name, value, context) for name, value, context in hits_in(text)]
    llms = os.path.join(root, 'llms.txt')
    if os.path.isfile(llms):
        with open(llms, encoding='utf-8', errors='replace') as stream:
            found += [('llms.txt', name, value, context) for name, value, context in hits_in(stream.read())]
    with open(os.path.join(root, 'script.js'), encoding='utf-8', errors='replace') as stream:
        for number, line in script_lines(stream.read()):
            found += [('script.js:%d' % number, name, value, context) for name, value, context in hits_in(line)]
    if found:
        print('check_plain_language: FAIL. %d identifier(s) in visible text. Say what it is or says instead; scripts/plain_language_glossary.json has the meanings, and a number can stay in a link title.' % len(found))
        for where, name, value, context in found[:60]:
            print('  %s [%s] %s   ...%s...' % (where, name, value, context))
        return 1
    if not args.quiet:
        print('check_plain_language: OK. %d pages, llms.txt and script.js read; no identifier in visible text.' % pages)
    return 0


if __name__ == '__main__':
    sys.exit(main())
