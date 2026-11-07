#!/usr/bin/env python3
"""render_page_dates.py: keep each page's JSON-LD dateModified at the date its content last changed.

Why this exists. Ten pages carry a schema.org dateModified, set by hand, and nothing said which edits move it. On
2026-11-07, 9 of the 10 stated a date older than their last content change: seven had been reworded on 2026-11-05
and still said July to October. Search and answer engines read dateModified for freshness, so a corrected page read
as untouched since the summer. This derives the date from git, as scripts/update_sitemap_lastmod.py does for the
sitemap, and the two batteries check it before every push and every deploy.

The rule. A page's dateModified is the date of the newest commit that changed the page's CONTENT: the text a reader
sees (tags, scripts, styles and comments removed) once the generated site chrome is removed too (the header, footer
and brandmark regions that scripts/render_chrome.py and scripts/render_brand.py stamp onto every page). Neither a
markup-only commit (a cache buster, a class, the JSON-LD itself) nor a chrome-only commit (a nav or footer edit,
which changes every page at once and none of their articles) moves it. Measured over this repository's history to
2026-11-05: of 10,588 page changes, 7,029 were markup-only and 349 chrome-only, those from 8 commits, one of them
touching 53 pages. An uncommitted content change in the working tree counts as today. Dates only move forward.

Which pages. Every tracked HTML page whose JSON-LD has a page-level dateModified, meaning one outside an
itemListElement: a list item's dates belong to the page it lists. The notes index is such a list; its dates come
from scripts/notes_registry.json, which --write keeps in step with each note page (scripts/render_notes.py --check
refuses a note page whose dateModified differs from its record).

Modes:
  --check (default)  exit 1 when a page's dateModified is older than its newest content change, 0 when none is,
                     2 when this cannot run (no git, or a shallow clone, where every page would read as new).
  --write            move each stale date to its newest content change, set the note's "updated" in
                     scripts/notes_registry.json, then re-render the notes index and feed.
  --ref <rev>        read the pages and their history at <rev>, ignoring the working tree (for audits).
  --root <dir>       the site checkout to read (default: the repository holding this script).
  --quiet            print problems only.
  --selftest         run the fixture test in a temporary repository.
Stdlib only. Called from scripts/hooks/pre-push and the deploy workflow's consistency gate.
"""
import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date

REGISTRY_REL = "scripts/notes_registry.json"
TAG = re.compile(r"<[^>]+>")
SCRIPT = re.compile(r"<(script|style)\b.*?</\1>", re.S | re.I)
COMMENT = re.compile(r"<!--.*?-->", re.S)
# The regions stamped identically onto every page; a change inside them is no page's content.
CHROME = re.compile(r"<!--\s*(site-chrome|site-brand):([\w-]+) START\b.*?<!--\s*\1:\2 END\s*-->", re.S)
LD = re.compile(r'(<script[^>]*type="application/ld\+json"[^>]*>)(.*?)(</script>)', re.S | re.I)
DM = re.compile(r'("dateModified"\s*:\s*")([^"]*)(")')
NOTE_PAGE = re.compile(r"^notes/([^/]+)/index\.html$")
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}")


class CannotRun(Exception):
    pass


def git(root, *args, binary=False):
    try:
        r = subprocess.run(["git", "-C", root, *args], capture_output=True)
    except OSError as e:
        raise CannotRun("git did not run: %s" % e)
    return r.returncode, (r.stdout if binary else r.stdout.decode("utf-8", "replace")), r.stderr.decode("utf-8", "replace")


def content(page):
    """The text a reader sees, without the shared chrome, whitespace and entities normalized."""
    t = CHROME.sub(" ", page)
    t = COMMENT.sub(" ", SCRIPT.sub(" ", t))
    return re.sub(r"\s+", " ", html.unescape(TAG.sub(" ", t))).strip()


def page_dates(page):
    """Page-level dateModified values as [(block_number, value)], skipping anything under an itemListElement."""
    out = []
    for n, m in enumerate(LD.finditer(page)):
        try:
            data = json.loads(m.group(2))
        except ValueError:
            continue
        stack = [(data, False)]
        while stack:
            cur, listed = stack.pop()
            if isinstance(cur, dict):
                v = cur.get("dateModified")
                if isinstance(v, str) and not listed and ISO.match(v):
                    out.append((n, v))
                for k, val in cur.items():
                    stack.append((val, listed or k == "itemListElement"))
            elif isinstance(cur, list):
                stack.extend((val, listed) for val in cur)
    return out


class Blobs:
    """One `git cat-file --batch` for every blob read."""

    def __init__(self, root):
        self.p = subprocess.Popen(["git", "-C", root, "cat-file", "--batch"], stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE)

    def text(self, oid):
        self.p.stdin.write((oid + "\n").encode())
        self.p.stdin.flush()
        head = self.p.stdout.readline().decode().split()
        if len(head) < 3 or head[1] == "missing":
            return None
        data = self.p.stdout.read(int(head[2]))
        self.p.stdout.read(1)
        return data.decode("utf-8", "replace")

    def close(self):
        try:
            self.p.stdin.close()
            self.p.wait(timeout=10)
        except Exception:
            self.p.kill()


def newest_change(root, rev, path, blobs):
    """(date, sha) of the newest commit at or before rev that changed the page's content; renames followed."""
    rc, out, err = git(root, "log", "--first-parent", "-m", "--follow", "-M", "--raw", "--no-abbrev",
                       "--format=C %H %ad", "--date=short", rev, "--", path)
    if rc != 0:
        raise CannotRun("git log for %s: %s" % (path, err.strip()[:200]))
    cur = None
    for line in out.split("\n"):
        if line.startswith("C "):
            _, sha, day = line.split(" ", 2)
            cur = (day.strip(), sha)
        elif line.startswith(":") and cur:
            meta = line.split("\t", 1)[0].split()
            old, new, status = meta[2], meta[3], meta[4]
            if status.startswith("D"):
                continue
            if status.startswith("A") or set(old) == {"0"}:
                return cur
            now, before = blobs.text(new), blobs.text(old)
            if now is None or before is None or content(now) != content(before):
                return cur
    return None, None


def read_pages(root, rev, worktree):
    """{path: text} of the tracked HTML pages, from the working tree or from rev."""
    rc, out, err = git(root, "ls-tree", "-r", "--name-only", rev)
    if rc != 0:
        raise CannotRun("cannot list %s: %s" % (rev, err.strip()[:200]))
    pages = {}
    for path in out.split("\n"):
        if not path.endswith(".html"):
            continue
        if worktree:
            full = os.path.join(root, path)
            if not os.path.isfile(full):
                continue
            with open(full, encoding="utf-8", errors="replace") as fh:
                pages[path] = fh.read()
        else:
            rc, text, _ = git(root, "show", "%s:%s" % (rev, path))
            if rc == 0:
                pages[path] = text
    return pages


def measure(root, rev="HEAD", worktree=True, today=None):
    """[(path, stamp, derived_date, where)] for every page with a page-level dateModified; where is a short sha or
    'working tree'. stamp is the oldest page-level value on the page."""
    rc, shallow, _ = git(root, "rev-parse", "--is-shallow-repository")
    if rc != 0:
        raise CannotRun("%s is not a git checkout" % root)
    if shallow.strip() == "true":
        raise CannotRun("shallow clone: every page would read as changed by the clone's one commit")
    today = today or date.today().isoformat()
    pages = read_pages(root, rev, worktree)
    blobs = Blobs(root)
    rows = []
    try:
        for path in sorted(pages):
            stamps = page_dates(pages[path])
            if not stamps:
                continue
            day, where = None, None
            if worktree:
                rc, committed, _ = git(root, "show", "%s:%s" % (rev, path))
                if rc != 0 or content(committed) != content(pages[path]):
                    day, where = today, "working tree"
            if day is None:
                day, sha = newest_change(root, rev, path, blobs)
                where = sha[:10] if sha else None
            rows.append((path, min(v[:10] for _, v in stamps), day, where))
    finally:
        blobs.close()
    return rows


def set_registry_updated(root, slug, new):
    """Set the note's "updated" in the registry in place, keeping the file's hand formatting."""
    path = os.path.join(root, REGISTRY_REL)
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    m = re.search(r'"slug"\s*:\s*"%s"' % re.escape(slug), text)
    if not m:
        return "no registry record for note %s" % slug
    nxt = re.search(r'"slug"\s*:', text[m.end():])
    end = m.end() + (nxt.start() if nxt else len(text) - m.end())
    record = text[m.start():end]
    upd = re.search(r'("updated"\s*:\s*")([^"]*)(")', record)
    if upd:
        record = record[:upd.start(2)] + new + record[upd.end(2):]
    else:
        dt = re.search(r'(\n(\s*)"date"\s*:\s*"[^"]*",)', record)
        if not dt:
            return "the registry record for %s has no date line to place updated after" % slug
        record = record[:dt.end()] + '\n%s"updated": "%s",' % (dt.group(2), new) + record[dt.end():]
    text = text[:m.start()] + record + text[end:]
    data = json.loads(text)
    got = [n.get("updated") for n in data.get("notes", []) if n.get("slug") == slug]
    if got != [new]:
        return "the registry edit for %s did not read back as %s" % (slug, new)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    return None


def write(root, stale, quiet=False):
    """Move each stale page's page-level dates forward. Returns a list of problems."""
    problems, notes = [], False
    for path, stamp, day, _where in stale:
        full = os.path.join(root, path)
        with open(full, encoding="utf-8") as fh:
            page = fh.read()
        blocks = list(LD.finditer(page))
        targets = {}
        for n, v in page_dates(page):
            if v[:10] < day:
                targets.setdefault(n, set()).add(v)
        for n in sorted(targets, reverse=True):
            m = blocks[n]
            body = m.group(2)
            for old in targets[n]:
                listed = sum(1 for x in DM.finditer(body) if x.group(2) == old)
                page_level = sum(1 for k, v in page_dates(m.group(1) + body + m.group(3)) if v == old)
                if listed != page_level:
                    problems.append("%s: dateModified %s also appears on a listed item; set it by hand" % (path, old))
                    continue
                body = DM.sub(lambda x: x.group(1) + (day if x.group(2) == old else x.group(2)) + x.group(3), body)
            page = page[:m.start(2)] + body + page[m.end(2):]
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(page)
        if not quiet:
            print("render_page_dates: %s dateModified %s -> %s" % (path, stamp, day))
        note = NOTE_PAGE.match(path)
        if note and os.path.isfile(os.path.join(root, REGISTRY_REL)):
            err = set_registry_updated(root, note.group(1), day)
            if err:
                problems.append(err)
            else:
                notes = True
    if notes and os.path.isfile(os.path.join(root, "scripts", "render_notes.py")):
        r = subprocess.run([sys.executable, os.path.join(root, "scripts", "render_notes.py"), "--write", "--quiet"],
                           cwd=root, capture_output=True, text=True)
        if r.returncode != 0:
            problems.append("render_notes.py --write: %s" % (r.stderr or r.stdout).strip()[-300:])
    return problems


def repo_root():
    here = os.path.dirname(os.path.abspath(__file__))
    rc, out, _ = git(here, "rev-parse", "--show-toplevel")
    return out.strip() if rc == 0 and out.strip() else os.path.dirname(here)


def run(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="verify (default)")
    mode.add_argument("--write", action="store_true", help="move stale dates forward")
    mode.add_argument("--selftest", action="store_true", help="run the fixture test")
    ap.add_argument("--ref", help="read pages and history at this revision, not the working tree")
    ap.add_argument("--root", help="the site checkout (default: this script's repository)")
    ap.add_argument("--today", help=argparse.SUPPRESS)
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args(argv)
    if a.selftest:
        return selftest()
    if a.write and a.ref:
        print("render_page_dates: --write edits the working tree, so it does not take --ref", file=sys.stderr)
        return 2
    root = os.path.abspath(a.root) if a.root else repo_root()
    try:
        rows = measure(root, rev=a.ref or "HEAD", worktree=not a.ref, today=a.today)
    except CannotRun as e:
        print("render_page_dates: could not run: %s" % e, file=sys.stderr)
        return 2
    stale = [r for r in rows if r[2] and r[1] < r[2]]
    if a.write:
        problems = write(root, stale, quiet=a.quiet)
        for p in problems:
            print("render_page_dates: %s" % p, file=sys.stderr)
        if not stale and not a.quiet:
            print("render_page_dates: every dateModified already matches its page's last content change")
        return 1 if problems else 0
    for path, stamp, day, where in stale:
        print("render_page_dates: %s says dateModified %s; its content last changed %s (%s)"
              % (path, stamp, day, where), file=sys.stderr)
    if stale:
        print("render_page_dates: run `python3 scripts/render_page_dates.py --write`, then commit the pages "
              "(and %s, notes/index.html and notes/feed.xml when a note moved)" % REGISTRY_REL, file=sys.stderr)
        return 1
    if not a.quiet:
        print("render_page_dates: OK (%d pages carry a dateModified; none is older than its content)" % len(rows))
    return 0


# --------------------------------------------------------------------------- self-test

CHROME_PAGE = """<!doctype html><html><head><title>{title}</title>
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{title}",
  "datePublished": "2026-01-01",
  "dateModified": "{stamp}"
}}
</script></head><body>
  <!-- site-chrome:header START (generated) -->
  <nav>{nav}</nav>
  <!-- site-chrome:header END -->
  <main class="{cls}"><p>{body}</p></main>
  <!-- site-chrome:footer START (generated) -->
  <footer>footer</footer>
  <!-- site-chrome:footer END -->
</body></html>
"""

LIST_PAGE = """<!doctype html><html><head><script type="application/ld+json">
{"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "item": {"@type": "BlogPosting",
 "dateModified": "2026-01-01"}}]}
</script></head><body><p>{body}</p></body></html>
"""

REGISTRY = """{
  "_meta": {"kinds": {"status": "Status note"}, "feed_title": "t"},
  "notes": [
    {
      "slug": "n1",
      "title": "Note one",
      "date": "2026-01-01",
      "updated": "2026-01-01",
      "kind": "status",
      "tags": ["a", "b"]
    },
    {
      "slug": "n2",
      "title": "Note two",
      "date": "2026-01-01",
      "kind": "status"
    }
  ]
}
"""


def selftest():
    failures = []

    def expect(name, got, want):
        if got != want:
            failures.append("%s: got %r, want %r" % (name, got, want))

    d = tempfile.mkdtemp(prefix="render_page_dates_selftest_")
    try:
        env = dict(os.environ, GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_SYSTEM=os.devnull)

        def sh(*args, when=None):
            e = dict(env)
            if when:
                e.update(GIT_AUTHOR_DATE=when + "T12:00:00", GIT_COMMITTER_DATE=when + "T12:00:00")
            return subprocess.run(["git", "-C", d, "-c", "user.name=t", "-c", "user.email=t@t", "-c",
                                   "commit.gpgsign=false", *args], capture_output=True, text=True, env=e)

        def put(rel, text):
            os.makedirs(os.path.dirname(os.path.join(d, rel)) or d, exist_ok=True)
            with open(os.path.join(d, rel), "w", encoding="utf-8") as fh:
                fh.write(text)

        def commit(when, msg):
            sh("add", "-A")
            r = sh("commit", "-q", "-m", msg, when=when)
            if r.returncode != 0:
                raise RuntimeError("fixture commit failed: %s" % r.stderr)

        def stamp_of(rel):
            with open(os.path.join(d, rel), encoding="utf-8") as fh:
                return min(v for _, v in page_dates(fh.read()))

        sh("init", "-q")
        page = dict(title="A", stamp="2026-01-01", nav="home", cls="x", body="first words")
        put("a/index.html", CHROME_PAGE.format(**page))
        put("list/index.html", LIST_PAGE.replace("{body}", "a list"))
        put("notes/n1/index.html", CHROME_PAGE.format(**dict(page, title="N1")))
        put("notes/n2/index.html", CHROME_PAGE.format(**dict(page, title="N2")))
        put(REGISTRY_REL, REGISTRY)
        commit("2026-01-01", "add")

        put("a/index.html", CHROME_PAGE.format(**dict(page, cls="y")))
        commit("2026-02-01", "markup only")
        put("a/index.html", CHROME_PAGE.format(**dict(page, cls="y", nav="home, about")))
        commit("2026-03-01", "chrome only")
        rows = {r[0]: r for r in measure(d)}
        expect("markup and chrome edits do not move the date", rows["a/index.html"][2], "2026-01-01")
        expect("a page whose only dates are listed items is not a stamped page", "list/index.html" in rows, False)
        expect("check passes before any content change", run(["--root", d, "--quiet"]), 0)

        put("a/index.html", CHROME_PAGE.format(**dict(page, cls="y", nav="home, about", body="new words")))
        put("notes/n1/index.html", CHROME_PAGE.format(**dict(page, title="N1", body="revised")))
        put("notes/n2/index.html", CHROME_PAGE.format(**dict(page, title="N2", body="revised")))
        commit("2026-04-01", "content")
        rows = {r[0]: r for r in measure(d)}
        expect("a content edit moves the derived date", rows["a/index.html"][2], "2026-04-01")
        expect("check refuses a stale stamp", run(["--root", d, "--quiet"]), 1)
        expect("--ref reads committed state", run(["--root", d, "--ref", "HEAD", "--quiet"]), 1)
        expect("--write succeeds", run(["--root", d, "--write", "--quiet"]), 0)
        expect("--write moved the page", stamp_of("a/index.html"), "2026-04-01")
        with open(os.path.join(d, REGISTRY_REL), encoding="utf-8") as fh:
            reg_text = fh.read()
        reg = {n["slug"]: n for n in json.loads(reg_text)["notes"]}
        expect("--write moved an existing note record", reg["n1"].get("updated"), "2026-04-01")
        expect("--write added updated to a record that lacked it", reg["n2"].get("updated"), "2026-04-01")
        expect("--write kept the registry's inline formatting", '"tags": ["a", "b"]' in reg_text, True)
        expect("check passes after --write", run(["--root", d, "--quiet"]), 0)
        commit("2026-04-02", "stamps")
        rows = {r[0]: r for r in measure(d)}
        expect("the stamp commit is markup only, so the date holds", rows["a/index.html"][2], "2026-04-01")
        expect("--ref passes after the stamp commit", run(["--root", d, "--ref", "HEAD", "--quiet"]), 0)

        put("a/index.html", CHROME_PAGE.format(**dict(page, stamp="2026-09-09", cls="y", nav="home, about",
                                                      body="new words")))
        expect("a stamp newer than the content is never moved back", run(["--root", d, "--write", "--quiet"]), 0)
        expect("the newer stamp stayed", stamp_of("a/index.html"), "2026-09-09")
        sh("checkout", "-q", "--", "a/index.html")

        put("a/index.html", CHROME_PAGE.format(**dict(page, stamp="2026-04-01", cls="y", nav="home, about",
                                                      body="edited, not committed")))
        rows = {r[0]: r for r in measure(d, today="2026-05-05")}
        expect("an uncommitted content edit counts as today", rows["a/index.html"][2:], ("2026-05-05", "working tree"))
        sh("checkout", "-q", "--", "a/index.html")

        sh("mv", "a/index.html", "b.html")
        commit("2026-06-01", "rename")
        rows = {r[0]: r for r in measure(d)}
        expect("a rename keeps the content date", rows["b.html"][2], "2026-04-01")

        shallow = tempfile.mkdtemp(prefix="render_page_dates_shallow_")
        try:
            subprocess.run(["git", "clone", "-q", "--depth", "1", "file://" + d, shallow], capture_output=True,
                           env=env)
            expect("a shallow clone cannot run", run(["--root", shallow, "--quiet"]), 2)
        finally:
            shutil.rmtree(shallow, ignore_errors=True)
    except Exception as e:  # noqa: BLE001
        failures.append("fixture error: %s: %s" % (type(e).__name__, e))
    finally:
        shutil.rmtree(d, ignore_errors=True)
    for f in failures:
        print("render_page_dates selftest FAIL: %s" % f, file=sys.stderr)
    if not failures:
        print("render_page_dates selftest: OK")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(run())
