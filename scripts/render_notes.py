#!/usr/bin/env python3
"""render_notes.py: render the notes index and feed from scripts/notes_registry.json.

The notes series (/notes/) is short, dated posts: status notes on rulemakings, event
responses, routing notes and equivalence checks. Each note is a hand-written page at
notes/<slug>/index.html; the registry holds one record per note, and this script stamps
the index list into notes/index.html and writes notes/feed.xml whole. Author workflow:

    1. write notes/<slug>/index.html (copy the newest note; keep its JSON-LD datePublished)
    2. add the record to scripts/notes_registry.json
    3. python3 scripts/render_notes.py --write   (or: npm run build:notes)
    4. commit the registry, the note page, the index and the feed

Generated surfaces:
    notes/index.html   region notes:index (the list, newest first) and notes:index-jsonld
    notes/feed.xml     Atom feed (whole file)

Modes: --check (default) verifies the surfaces match the registry and that every
registry record has a page whose datePublished agrees; exit 1 on drift, 2 if the guard
cannot run. --write regenerates. Stdlib only; runs from either clone.
"""
import argparse
import difflib
import html
import json
import os
import re
import subprocess
import sys

REGISTRY_REL = os.path.join("scripts", "notes_registry.json")
INDEX_REL = os.path.join("notes", "index.html")
FEED_REL = os.path.join("notes", "feed.xml")
SITE = "https://tokenization.systems"
START_TMPL = ("<!-- notes:{name} START (generated from scripts/notes_registry.json;"
              " edit the registry, then: python3 scripts/render_notes.py --write) -->")
END_TMPL = "<!-- notes:{name} END -->"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]


def repo_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), script_dir):
        try:
            out = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, cwd=cwd)
            if out.returncode == 0 and out.stdout.strip() and os.path.isfile(os.path.join(out.stdout.strip(), REGISTRY_REL)):
                return out.stdout.strip()
        except Exception:
            pass
    return os.path.dirname(script_dir)


def esc(s):
    return html.escape("" if s is None else str(s), quote=False)


def attr(s):
    return html.escape("" if s is None else str(s), quote=True)


def fmt_date(iso):
    y, m, d = (int(p) for p in iso.split("-"))
    return f"{MONTHS[m - 1]} {d}, {y}"


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def region_bounds(lines, name):
    start_re = re.compile(r"^(?P<indent>\s*)<!--\s*notes:" + re.escape(name) + r" START\b")
    end_re = re.compile(r"^\s*<!--\s*notes:" + re.escape(name) + r" END\b")
    start = end = indent = None
    for i, line in enumerate(lines):
        if start is None:
            m = start_re.match(line)
            if m:
                start, indent = i, m.group("indent")
        elif end_re.match(line):
            end = i
            break
    if start is None or end is None:
        return None
    return start, end, indent


def stamp(text, name, body, problems, rel):
    lines = text.split("\n")
    bounds = region_bounds(lines, name)
    if bounds is None:
        problems.append(f"{rel}: missing region notes:{name}")
        return text
    start, end, indent = bounds
    new = [indent + START_TMPL.format(name=name)]
    new += [(indent + ln) if ln else "" for ln in body]
    new.append(indent + END_TMPL.format(name=name))
    return "\n".join(lines[:start] + new + lines[end + 1:])


class Model:
    def __init__(self, root):
        self.root = root
        with open(os.path.join(root, REGISTRY_REL), encoding="utf-8") as fh:
            self.reg = json.load(fh)
        self.kinds = self.reg["_meta"]["kinds"]
        self.notes = sorted(self.reg["notes"], key=lambda n: (n["date"], n["slug"]), reverse=True)

    def url(self, n):
        return f"{SITE}/notes/{n['slug']}/"


def gen_index(m):
    if not m.notes:
        return ['<p class="notes-empty">No notes yet.</p>']
    out = [f'<p class="letters-meta-strip">{len(m.notes)} {"note" if len(m.notes) == 1 else "notes"} &middot; newest first</p>',
           '<ol class="notes-list" reversed>']
    for n in m.notes:
        kind = m.kinds.get(n["kind"], n["kind"])
        out += [f'  <li class="note-item" data-kind="{attr(n["kind"])}">',
                f'    <p class="note-item__meta"><time datetime="{attr(n["date"])}">{esc(fmt_date(n["date"]))}</time> <span class="note-item__kind">{esc(kind)}</span></p>',
                f'    <h2 class="note-item__title"><a href="/notes/{attr(n["slug"])}/">{esc(n["title"])}</a></h2>',
                f'    <p class="note-item__summary">{esc(n["summary"])}</p>',
                "  </li>"]
    out.append("</ol>")
    return out


def gen_index_jsonld(m):
    items = []
    for i, n in enumerate(m.notes, 1):
        items.append({"@type": "ListItem", "position": i,
                      "item": {"@type": "BlogPosting", "headline": n["title"], "url": m.url(n),
                               "datePublished": n["date"], "dateModified": n.get("updated", n["date"]),
                               "author": {"@id": f"{SITE}/#person"}}})
    data = {"@context": "https://schema.org", "@type": "ItemList", "name": "Tokenization Systems notes",
            "url": f"{SITE}/notes/", "numberOfItems": len(items), "itemListElement": items}
    return ['<script type="application/ld+json">'] + json.dumps(data, indent=2, ensure_ascii=False).split("\n") + ["</script>"]


def xml(s):
    return html.escape("" if s is None else str(s), quote=True)


def gen_feed(m):
    updated = max([n.get("updated", n["date"]) for n in m.notes] + ["2026-01-01"])
    out = ['<?xml version="1.0" encoding="utf-8"?>',
           '<feed xmlns="http://www.w3.org/2005/Atom">',
           f"  <title>{xml(m.reg['_meta']['feed_title'])}</title>",
           "  <subtitle>Short, dated notes on rulemaking status, market events and equivalence checks from Tokenization Systems.</subtitle>",
           f'  <link href="{SITE}/notes/feed.xml" rel="self" type="application/atom+xml"/>',
           f'  <link href="{SITE}/notes/" rel="alternate" type="text/html"/>',
           f"  <id>{SITE}/notes/</id>",
           f"  <updated>{updated}T00:00:00Z</updated>",
           "  <author><name>Zach Zukowski</name><uri>https://tokenization.systems/</uri></author>",
           "  <rights>CC BY 4.0</rights>"]
    for n in m.notes:
        out += ["  <entry>",
                f"    <title>{xml(n['title'])}</title>",
                f'    <link href="{m.url(n)}" rel="alternate" type="text/html"/>',
                f"    <id>{m.url(n)}</id>",
                f"    <published>{n['date']}T00:00:00Z</published>",
                f"    <updated>{n.get('updated', n['date'])}T00:00:00Z</updated>",
                f'    <category term="{xml(n["kind"])}" label="{xml(m.kinds.get(n["kind"], n["kind"]))}"/>']
        for tag in n.get("tags", []):
            out.append(f'    <category term="{xml(tag)}"/>')
        out += [f"    <summary>{xml(n['summary'])}</summary>", "  </entry>"]
    out.append("</feed>")
    return "\n".join(out) + "\n"


def verify(m, problems):
    for n in m.notes:
        rel = f"notes/{n['slug']}/index.html"
        path = os.path.join(m.root, rel)
        if not os.path.isfile(path):
            problems.append(f"{rel}: page missing for registry entry")
            continue
        page = read(path)
        mm = re.search(r'"datePublished": "([^"]+)"', page)
        if not mm:
            problems.append(f"{rel}: no datePublished in the page's JSON-LD")
        elif mm.group(1) != n["date"]:
            problems.append(f"{rel}: datePublished {mm.group(1)} differs from registry date {n['date']}")
        if "<h1" not in page:
            problems.append(f"{rel}: no h1")
        if n["kind"] not in m.kinds:
            problems.append(f"registry: unknown kind {n['kind']} on {n['slug']}")


def build(m):
    problems, outputs = [], {}
    verify(m, problems)
    index_path = os.path.join(m.root, INDEX_REL)
    if os.path.isfile(index_path):
        text = read(index_path)
        text = stamp(text, "index", gen_index(m), problems, INDEX_REL)
        text = stamp(text, "index-jsonld", gen_index_jsonld(m), problems, INDEX_REL)
        outputs[INDEX_REL] = text
    else:
        problems.append(f"{INDEX_REL}: missing")
    outputs[FEED_REL] = gen_feed(m)
    for rel, text in outputs.items():
        gen = text if rel == FEED_REL else "".join(re.findall(r"<!--\s*notes:[\w-]+ START\b.*?<!--\s*notes:[\w-]+ END\s*-->", text, flags=re.S))
        if re.search("[\\u2014\\u2013]", gen):
            problems.append(f"{rel}: generated text contains an em or en dash")
    return outputs, problems


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="verify (default)")
    mode.add_argument("--write", action="store_true", help="regenerate in place")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    try:
        root = repo_root()
        m = Model(root)
        outputs, problems = build(m)
    except Exception as exc:
        print(f"render_notes: could not run: {exc}", file=sys.stderr)
        return 2
    if problems:
        for p in problems:
            print(f"render_notes: {p}", file=sys.stderr)
        return 1
    drift = []
    for rel, new in outputs.items():
        path = os.path.join(root, rel)
        old = read(path) if os.path.isfile(path) else ""
        if old != new:
            drift.append((rel, old, new))
    if args.write:
        for rel, _old, new in drift:
            path = os.path.join(root, rel)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(new)
            print(f"render_notes: wrote {rel}")
        if not drift and not args.quiet:
            print("render_notes: everything already up to date")
        return 0
    if drift:
        for rel, old, new in drift:
            print(f"render_notes: DRIFT in {rel}", file=sys.stderr)
            if not args.quiet:
                for i, line in enumerate(difflib.unified_diff(old.splitlines(), new.splitlines(), f"a/{rel}", f"b/{rel}", lineterm="", n=1)):
                    if i > 40:
                        print("   ...", file=sys.stderr)
                        break
                    print("   " + line, file=sys.stderr)
        print("render_notes: run `python3 scripts/render_notes.py --write`", file=sys.stderr)
        return 1
    if not args.quiet:
        print(f"render_notes: OK ({len(outputs)} surfaces match the registry)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
