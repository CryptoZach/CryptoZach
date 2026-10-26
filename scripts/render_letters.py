#!/usr/bin/env python3
"""render_letters.py: render the Federal Comment Letter Program surfaces from one registry.

tokenization.systems commits fully-rendered static HTML and uses NO Liquid templating
(see _config.yml), so the letters index, the outcome ledger and the recommendation index
cannot be templates. This generator is the letters analog of render_home_stats.py: the
facts live in ONE file, scripts/letters_registry.json (one record per letter, one record
per proceeding, the watch list), and this script stamps them into marker-delimited
regions of the served pages. Author workflow when a letter is filed, a comment period
closes, a final rule issues or a recommendation is adopted:

    1. edit scripts/letters_registry.json
    2. python3 scripts/render_letters.py --write   (or: npm run build:letters)
    3. commit the registry + the regenerated pages, deploy

Generated surfaces (each bounded by
    <!-- letters:<name> START (...) -->  ...  <!-- letters:<name> END -->
except the feed, which is generated whole):

    letters/index.html
        summary            the meta strip under the H1 (dates, recommendation count)
        toolbar            filter chips (agency, cycle, framework, status), order and
                           view toggles; chip counts come from the registry
        index              the cards grid AND the list table, newest first
        outcomes           "Outcomes so far": one row per proceeding, plus next dates
        collection-jsonld  the CollectionPage ItemList
    letters/<slug>/index.html (every letter page)
        status-badge       the status chip inside the bottom "Docket and status" block
        outcome            condensed status under that heading: as-of date, recommendation
                           disposition, cross-references; a long note folds
        related            the Related cards (supplements, same proceeding, same cycle,
                           every paper the registry lists)

    Hand-authored letter-page order (the markers above are stamped into it; --check
    refuses a page that drifts): docket summary, macro context, thesis, then the
    recommendations and the rest of the analysis, then a condensed docket-and-status
    block (metadata strip, filing note, status badge, outcome). The hub reads the
    same way: docket summary and macro context, the letter cards, what the program
    established, then docket details and status folded at the bottom.
        (in place)         a status chip on each recommendation <li id="rec-N"> whose
                           status is not "pending"; removed again when it is
    letters/recommendations/index.html
        recommendations    every recommendation in one filterable table
        recs-jsonld        the page's ItemList
    letters/feed.xml       Atom feed of the series (whole file)
    letters/letters.json   machine-readable export of the registry: letters, proceedings,
                           watch list (whole file; linked from /data/)
    letters/recommendations.csv
                           every recommendation as one CSV row (whole file; linked from /data/)
    trackers/genius-act/index.html
        tracker            the GENIUS Act rulemaking tracker: one row per implementing
                           rulemaking, from the genius-cycle proceedings plus the
                           registry's trackers.genius-act.actions (rulemakings the program
                           did not comment on)
        tracker-jsonld     the page's ItemList
    trackers/genius-act/genius-act.json
                           the same rows as JSON (whole file)

Modes:
    --check   (default) verify every generated surface matches what the registry would
              generate, and that the registry agrees with the pages it describes (filed
              date, recommendation ids). It also refuses a framework key missing from the
              frameworks map (a topic such as "measurement" is not a framework), a letter
              that applies a framework without listing its defining paper (framework_papers:
              CLII is defined in Routing the Dollar, MVEP in the MVEP paper), an internal
              paper id such as "(A2)" in a paper label or a letter page's framework and paper
              tags, and tags that do not link every paper the registry lists. Exit 1 on
              drift; exit 2 if the guard itself cannot run. Wired into CI (build-deploy.yml).
    --write   regenerate every surface in place.
    --selftest
              prove each frameworks-and-papers check fires on a synthetic bad case (and
              stays quiet on a good one and on a section reference such as "3(a)").

Resolves the tree from cwd (falling back to the script's clone), so it runs from
either clone. Depends only on the stdlib.
"""
import argparse
import csv
import difflib
import io
import html
import json
import os
import re
import subprocess
import sys

REGISTRY_REL = os.path.join("scripts", "letters_registry.json")
HUB_REL = os.path.join("letters", "index.html")
RECS_REL = os.path.join("letters", "recommendations", "index.html")
FEED_REL = os.path.join("letters", "feed.xml")
LETTERS_JSON_REL = os.path.join("letters", "letters.json")
RECS_CSV_REL = os.path.join("letters", "recommendations.csv")
TRACKER_REL = os.path.join("trackers", "genius-act", "index.html")
TRACKER_JSON_REL = os.path.join("trackers", "genius-act", "genius-act.json")
SITE = "https://tokenization.systems"
START_TMPL = ("<!-- letters:{name} START (generated from scripts/letters_registry.json;"
              " edit the registry, then: python3 scripts/render_letters.py --write) -->")
END_TMPL = "<!-- letters:{name} END -->"

AGENCY_ORDER = ["OCC", "FDIC", "FinCEN", "Treasury", "NCUA", "Federal Reserve", "SEC", "CFTC", "Joint", "FSB"]
STATE_LABEL = {"open": "Comment period open", "closed-pending": "Final action pending",
               "final": "Final action issued", "withdrawn": "Withdrawn"}
STATE_CLASS = {"open": "open", "closed-pending": "pending", "final": "final", "withdrawn": "withdrawn"}
REC_STATUS_LABEL = {"pending": "Pending", "adopted": "Adopted", "partly-adopted": "Partly adopted",
                    "not-adopted": "Not adopted", "noted": "Noted"}
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]
WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight",
         9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
         15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen",
         20: "twenty", 21: "twenty-one", 22: "twenty-two", 23: "twenty-three", 24: "twenty-four",
         25: "twenty-five", 26: "twenty-six", 27: "twenty-seven", 28: "twenty-eight",
         29: "twenty-nine", 30: "thirty"}


# ----------------------------------------------------------------------------- helpers
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


def esc(s):
    return html.escape("" if s is None else str(s), quote=False)


def attr(s):
    return html.escape("" if s is None else str(s), quote=True)


def word(n):
    return WORDS.get(n, str(n))


def fmt_date(iso):
    if not iso:
        return ""
    parts = iso.split("-")
    if len(parts) == 2:
        return f"{MONTHS[int(parts[1]) - 1]} {int(parts[0])}"
    y, m, d = (int(p) for p in parts)
    return f"{MONTHS[m - 1]} {d}, {y}"


def fmt_range(a, b):
    if a and b and a[:4] == b[:4]:
        ya, ma, da = (int(p) for p in a.split("-"))
        return f"{MONTHS[ma - 1]} {da} to {fmt_date(b)}"
    if a and b:
        return f"{fmt_date(a)} to {fmt_date(b)}"
    if b:
        return f"closed {fmt_date(b)}"
    return ""


def plural(n, one, many=None):
    many = many or one + "s"
    return f"{n} {one if n == 1 else many}"


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def region_bounds(lines, name):
    """Return (start_idx, end_idx, indent) for the marker pair of `name`, or None."""
    start_re = re.compile(r"^(?P<indent>\s*)<!--\s*letters:" + re.escape(name) + r" START\b")
    end_re = re.compile(r"^\s*<!--\s*letters:" + re.escape(name) + r" END\b")
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
    """Replace the inner lines of region `name` with `body` (list of unindented lines)."""
    lines = text.split("\n")
    bounds = region_bounds(lines, name)
    if bounds is None:
        problems.append(f"{rel}: missing region letters:{name} (paste the marker pair, then --write)")
        return text
    start, end, indent = bounds
    new = [indent + START_TMPL.format(name=name)]
    new += [(indent + ln) if ln else "" for ln in body]
    new.append(indent + END_TMPL.format(name=name))
    return "\n".join(lines[:start] + new + lines[end + 1:])


def strip_regions(text):
    return re.sub(r"<!--\s*letters:\w[\w-]* START\b.*?<!--\s*letters:\w[\w-]* END\s*-->", "", text, flags=re.S)


# ----------------------------------------------------------------------------- model
class Model:
    def __init__(self, root):
        self.root = root
        with open(os.path.join(root, REGISTRY_REL), encoding="utf-8") as fh:
            self.reg = json.load(fh)
        self.letters = self.reg["letters"]
        self.by_slug = {l["slug"]: l for l in self.letters}
        self.procs = self.reg["proceedings"]
        self.cycles = self.reg["cycles"]
        self.frameworks = self.reg["frameworks"]
        self.framework_papers = self.reg.get("framework_papers") or {}
        self.verified_on = self.reg["_meta"]["verified_on"]
        self.tracker = (self.reg.get("trackers") or {}).get("genius-act")
        self.federal = [l for l in self.letters if l["series"] == "federal"]
        self.n_federal = len(self.federal)
        self.n_recs = sum(l["rec_count"] for l in self.federal)
        for l in self.letters:
            l["_proc"] = self.procs[l["proceeding"]]
            l["_outcome"] = l["_proc"]["outcome"]
            l["_children"] = [c for c in self.letters if (c.get("supplements") or {}).get("slug") == l["slug"]]
        self.pages = {}
        for l in self.letters:
            path = os.path.join(root, "letters", l["slug"], "index.html")
            self.pages[l["slug"]] = read(path) if os.path.isfile(path) else None

    # ordering
    def newest_first(self):
        return sorted(self.letters, key=lambda l: (l["filed"], l["number"] or 0), reverse=True)

    def filing_order(self):
        return sorted(self.letters, key=lambda l: (l["filed"], l["number"] or 0))

    # labels
    def status_label(self, l):
        return l["_outcome"].get("status_label") or STATE_LABEL[l["_outcome"]["state"]]

    def status_class(self, l):
        return STATE_CLASS.get(l["_outcome"]["state"], "pending")

    def number_label(self, l):
        return f"No. {l['number']}" if l.get("number") else "International response"

    def rec_phrase(self, l):
        if l["series"] == "international":
            return "international response"
        if l.get("supplements") and l["rec_count"] == 0:
            parent = self.by_slug[l["supplements"]["slug"]]
            return f"supplements No. {parent['number']}"
        return plural(l["rec_count"], "recommendation")

    def rec_disposition(self, l):
        """Short text for how a letter's recommendations stand."""
        if l["rec_count"] == 0:
            return None
        counts = {}
        for r in l["recommendations"]:
            counts[r["status"]] = counts.get(r["status"], 0) + 1
        if list(counts) == ["pending"]:
            return f"{plural(l['rec_count'], 'recommendation')} filed; no final action yet"
        parts = [f"{n} {REC_STATUS_LABEL[s].lower()}" for s, n in counts.items() if s != "pending"]
        if counts.get("pending"):
            parts.append(f"{counts['pending']} pending")
        return f"{plural(l['rec_count'], 'recommendation')} filed: " + ", ".join(parts)

    def referenced_by(self, l):
        """Later letters whose own text (outside generated regions) links or cites this one."""
        needles = [f"/letters/{l['slug']}/"]
        if l["docket"].get("comment_id"):
            needles.append(l["docket"]["comment_id"])
        out = []
        for other in self.filing_order():
            if other["slug"] == l["slug"] or other["filed"] < l["filed"]:
                continue
            page = self.pages.get(other["slug"])
            if not page:
                continue
            body = strip_regions(page)
            body = re.sub(r"<header>.*?</nav>\s*", "", body, flags=re.S)
            body = re.sub(r"<footer.*?</footer>", "", body, flags=re.S)
            body = re.sub(r"<section class=\"companions\".*?</section>", "", body, flags=re.S)
            if any(n in body for n in needles):
                out.append(other)
        return out


# ----------------------------------------------------------------------------- hub
def gen_summary(m):
    first = min(l["filed"] for l in m.federal)
    last = max(l["filed"] for l in m.federal)
    intl = [l for l in m.letters if l["series"] == "international"]
    bits = [fmt_range(first, last), f"{m.n_recs} recommendations", f"{word(len(m.frameworks))} frameworks"]
    if intl:
        bits.append(f"plus {word(len(intl))} international {'response' if len(intl) == 1 else 'responses'}")
    return [f'<p class="letters-meta-strip">{" &middot; ".join(esc(b) for b in bits)}</p>']


def chip(axis, value, label, n=None, active=False):
    count = f' <span class="filter-n">{n}</span>' if n is not None else ""
    return (f'<button type="button" class="filter-btn{" active" if active else ""}" data-axis="{attr(axis)}" '
            f'data-value="{attr(value)}" aria-pressed="{"true" if active else "false"}">{esc(label)}{count}</button>')


def gen_toolbar(m):
    out = ['<div class="letters-toolbar" hidden>',
           '  <div class="letters-filters" role="group" aria-label="Filter letters">']
    # agency
    counts = {}
    for l in m.letters:
        counts[l["agency"]] = counts.get(l["agency"], 0) + 1
    out.append('    <div class="filter-group" data-axis="agency"><span class="filter-label">Agency:</span>')
    out.append("      " + chip("agency", "all", "All", active=True))
    for a in AGENCY_ORDER:
        if a in counts:
            out.append("      " + chip("agency", a, a, counts[a]))
    out.append("    </div>")
    # cycle
    counts = {}
    for l in m.letters:
        counts[l["cycle"]] = counts.get(l["cycle"], 0) + 1
    out.append('    <div class="filter-group" data-axis="cycle"><span class="filter-label">Cycle:</span>')
    out.append("      " + chip("cycle", "all", "All", active=True))
    for key, c in sorted(m.cycles.items(), key=lambda kv: kv[1]["order"]):
        if key in counts:
            out.append("      " + chip("cycle", key, c["label"], counts[key]))
    out.append("    </div>")
    # framework
    counts = {}
    for l in m.letters:
        for f in l["frameworks"]:
            counts[f] = counts.get(f, 0) + 1
    out.append('    <div class="filter-group" data-axis="framework"><span class="filter-label">Framework:</span>')
    out.append("      " + chip("framework", "all", "All", active=True))
    for key, label in m.frameworks.items():
        if key in counts:
            out.append("      " + chip("framework", key, label, counts[key]))
    out.append("    </div>")
    # status (only when the series is not all in one state)
    counts = {}
    for l in m.letters:
        counts[m.status_class(l)] = counts.get(m.status_class(l), 0) + 1
    if len(counts) > 1:
        out.append('    <div class="filter-group" data-axis="status"><span class="filter-label">Status:</span>')
        out.append("      " + chip("status", "all", "All", active=True))
        for key in ["open", "pending", "final", "withdrawn"]:
            if key in counts:
                label = {"open": "Comment period open", "pending": "Final action pending",
                         "final": "Final action issued", "withdrawn": "Withdrawn"}[key]
                out.append("      " + chip("status", key, label, counts[key]))
        out.append("    </div>")
    out.append("  </div>")
    out += ['  <div class="letters-controls">',
            '    <div class="filter-group" role="group" aria-label="Order"><span class="filter-label">Order:</span>',
            '      <button type="button" class="filter-btn active" data-sort="newest" aria-pressed="true">Newest first</button>',
            '      <button type="button" class="filter-btn" data-sort="filing" aria-pressed="false">Filing order</button>',
            "    </div>",
            '    <div class="filter-group" role="group" aria-label="View"><span class="filter-label">View:</span>',
            '      <button type="button" class="filter-btn active" data-view="cards" aria-pressed="true">Cards</button>',
            '      <button type="button" class="filter-btn" data-view="list" aria-pressed="false">List</button>',
            "    </div>",
            "  </div>",
            '  <p class="filter-count-wrap" hidden><span class="filter-count" aria-live="polite"></span>'
            ' <button type="button" class="filter-reset">Clear filters</button></p>',
            "</div>"]
    return out


def card_attrs(m, l):
    return (f'data-slug="{attr(l["slug"])}" data-agency="{attr(l["agency"])}" data-cycle="{attr(l["cycle"])}" '
            f'data-frameworks="{attr(" ".join(l["frameworks"]))}" data-status="{attr(m.status_class(l))}" '
            f'data-filed="{attr(l["filed"])}" data-number="{l["number"] or 0}" data-series="{attr(l["series"])}"')


def gen_card(m, l):
    gaps = l["gaps"]
    if l.get("gaps_label") and gaps.startswith(l["gaps_label"]):
        gaps = gaps[len(l["gaps_label"]):].strip()
    # Status lives in the outcomes ledger, not on every card.
    meta = [b for b in (l["filed"], l["agency_display"], l["frameworks_display"], m.rec_phrase(l)) if b]
    lines = [f'<a href="/letters/{attr(l["slug"])}/" class="companion-card letter-card" {card_attrs(m, l)}>',
             f'  <span class="card-number">{esc(m.number_label(l))}</span>',
             f'  <strong>{esc(l["title"])}</strong>',
             f'  <span class="card-thesis">{esc(l["thesis"])}</span>']
    if gaps:
        label = f'<em>{esc(l["gaps_label"])}</em> ' if l.get("gaps_label") else ""
        lines.append(f'  <span class="card-gaps">{label}{esc(gaps)}</span>')
    lines.append(f'  <span class="card-meta">{" &middot; ".join(esc(b) for b in meta)}</span>')
    lines.append("</a>")
    return lines


def gen_row(m, l):
    docket = l["docket"]
    dock = (f'<a href="{attr(docket["url"])}" target="_blank" rel="noopener noreferrer">{esc(docket["label"])}</a>'
            if docket.get("url") else esc(docket["label"]))
    recs = str(l["rec_count"]) if l["rec_count"] else ("supp." if l.get("supplements") else "")
    return [f"<tr {card_attrs(m, l)}>",
            f'  <td data-label="Filed"><time datetime="{attr(l["filed"])}">{esc(l["filed"])}</time></td>',
            f'  <td data-label="Letter"><span class="list-number">{esc(m.number_label(l))}</span> '
            f'<a href="/letters/{attr(l["slug"])}/">{esc(l["short_title"])}</a></td>',
            f'  <td data-label="Agency">{esc(l["agency_display"])}</td>',
            f'  <td data-label="Proceeding">{dock}</td>',
            f'  <td data-label="Recs">{esc(recs)}</td>',
            f'  <td data-label="Status"><span class="status-chip status-chip--{attr(m.status_class(l))}">{esc(m.status_label(l))}</span></td>',
            (f'  <td data-label="PDF"><a href="{attr(l["pdf"])}" target="_blank" rel="noopener noreferrer">PDF</a></td>'
             if l.get("pdf") else  # filed as comment-box text with no attachment: its text is on its page
             f'  <td data-label="PDF"><a href="/letters/{attr(l["slug"])}/">Text</a></td>'),
            "</tr>"]


def gen_index(m):
    out = ['<div class="letters-index view-cards" id="letters-index">',
           '  <div class="companion-cards letters-cards">']
    for l in m.newest_first():
        out += ["    " + ln for ln in gen_card(m, l)]
    out += ["  </div>",
            '  <div class="letters-list-wrap letters-timeline-table" role="region" aria-label="Letters as a list">',
            '    <table class="letters-timeline letters-list letters-stackable">',
            "      <thead>",
            "        <tr><th>Filed</th><th>Letter</th><th>Agency</th><th>Proceeding</th><th>Recs</th><th>Status</th><th>PDF</th></tr>",
            "      </thead>",
            "      <tbody>"]
    for l in m.newest_first():
        out += ["        " + ln for ln in gen_row(m, l)]
    out += ["      </tbody>", "    </table>", "  </div>", "</div>"]
    combined = os.path.join(m.root, "letters", "all-letters.pdf")
    pdf_note = ""
    if os.path.isfile(combined):
        mb = os.path.getsize(combined) / 1e6
        pdf_note = (f' All {word(m.n_federal)} are also compiled, with a contents page and bookmarks, in '
                    f'<a href="/letters/all-letters.pdf">one PDF for reviewers</a> ({mb:.1f} MB).')
    note = ('Every recommendation is listed in the <a href="/letters/recommendations/">recommendation index</a>.'
            + pdf_note)
    out.append(f'<p class="letters-note">{note}</p>')
    return out


_STATUS_BOILER = (
    "No final rule located as of the verification date.",
    "No final strategic plan located as of the verification date.",
    "No final report located as of the verification date.",
)


def visible_note(note):
    """Drop a note that only restates the status chip. Keep any fact it adds."""
    text = note or ""
    for sentence in _STATUS_BOILER:
        text = text.replace(sentence, " ")
    return " ".join(text.split())


def gen_outcomes(m):
    tracker_link = (' The GENIUS Act rulemakings, including those the program did not comment on, are followed on the '
                    '<a href="/trackers/genius-act/">GENIUS Act rulemaking tracker</a>.' if m.tracker else '')
    seen = []
    for l in m.filing_order():
        if l["proceeding"] not in seen:
            seen.append(l["proceeding"])
    counts = {}
    for key in seen:
        o = m.procs[key]["outcome"]
        label = o.get("status_label") or STATE_LABEL[o["state"]]
        counts[label] = counts.get(label, 0) + 1
    def soften(label):
        first = label.split(" ", 1)[0]
        if first.isupper() and len(first) > 1:
            return label
        return label[:1].lower() + label[1:]
    bits = [f"{n} {soften(label)}" for label, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]
    rollup = "Status: " + " &middot; ".join(bits) + "."
    out = [f'<p class="letters-outcomes-lede">{rollup}</p>',
           '<details class="letters-fold">',
           '  <summary>Proceedings, sources, and next dates</summary>',
           f'<p class="letters-outcomes-lede">One row per rulemaking or consultation, in filing order. A joint rulemaking filed at several agency dockets is one row.{tracker_link}</p>',
           '<div class="letters-timeline-table" role="region" aria-label="Outcomes by proceeding">',
           '  <table class="letters-timeline letters-outcomes letters-stackable">',
           "    <thead>",
           "      <tr><th>Proceeding</th><th>Letters</th><th>Comments closed</th><th>Status</th><th>Recommen&shy;dations</th></tr>",
           "    </thead>",
           "    <tbody>"]
    for key in seen:
        p = m.procs[key]
        ls = [l for l in m.filing_order() if l["proceeding"] == key]
        o = p["outcome"]
        letters = ", ".join(f'<a href="/letters/{attr(l["slug"])}/">{esc(m.number_label(l) if l.get("number") else l["agency"])}</a>' for l in ls)
        closes = sorted({l["comment_period"].get("close") for l in ls if l["comment_period"].get("close")})
        closed = ", ".join(fmt_date(c) for c in closes) or "n/a"
        n_recs = sum(l["rec_count"] for l in ls)
        counts = {}
        for l in ls:
            for r in l["recommendations"]:
                counts[r["status"]] = counts.get(r["status"], 0) + 1
        if n_recs == 0:
            recs = "n/a"
        elif list(counts) == ["pending"]:
            recs = f"{n_recs} filed; none decided yet"
        else:
            recs = f"{n_recs} filed: " + ", ".join(f"{n} {REC_STATUS_LABEL[s].lower()}" for s, n in counts.items())
        name = (f'<a href="{attr(p["url"])}" target="_blank" rel="noopener noreferrer">{esc(p["name"])}</a>' if p.get("url") else esc(p["name"]))
        ident = esc(p["identifier"]) + (f"; {esc(p['fr'])}" if p.get("fr") else "")
        status = f'<span class="status-chip status-chip--{attr(STATE_CLASS.get(o["state"], "pending"))}">{esc(o.get("status_label") or STATE_LABEL[o["state"]])}</span>'
        if o.get("final_action"):
            fa = o["final_action"]
            status += f'<br><span class="letters-outcome-id">{esc(fa.get("citation", ""))}{" (" + esc(fmt_date(fa["date"])) + ")" if fa.get("date") else ""}</span>'
        out += ["      <tr>",
                f'        <td data-label="Proceeding">{name}<br><span class="letters-outcome-id">{ident}</span></td>',
                f'        <td data-label="Letters">{letters}</td>',
                f'        <td data-label="Comments closed">{esc(closed)}</td>',
                f'        <td data-label="Status">{status}</td>',
                f'        <td data-label="Recommendations">{esc(recs)}</td>',
                "      </tr>"]
        note = visible_note(o.get("note"))
        if note:
            srcs = " ".join(f'<a href="{attr(s["url"])}" target="_blank" rel="noopener noreferrer">{esc(s["title"])}</a>' for s in o.get("sources", []))
            out.append(f'      <tr class="letters-outcome-note"><td colspan="5">{esc(note)}{(" " + srcs) if srcs else ""}</td></tr>')
    out += ["    </tbody>", "  </table>", "</div>"]
    watch = sorted(m.reg.get("watch", []), key=lambda w: w["date"])
    if watch:
        out.append('<h3 id="next-dates">Next dates</h3>')
        out.append('<ul class="letters-watch">')
        for w in watch:
            srcs = " ".join(f'<a href="{attr(s["url"])}" target="_blank" rel="noopener noreferrer">source</a>' for s in w.get("sources", []))
            out.append(f'  <li><time datetime="{attr(w["date"])}">{esc(fmt_date(w["date"]))}</time>: {esc(w["text"])}{(" (" + srcs + ")") if srcs else ""}</li>')
        out.append("</ul>")
    out.append("</details>")
    out.append(f'<p class="letters-asof">Last checked {esc(fmt_date(m.verified_on))}. A final rule, an adopted recommendation or a citation by another filer is recorded here and on the letter page when it is verified.</p>')
    return out


def gen_collection_jsonld(m):
    first = min(l["filed"] for l in m.federal)
    last = max(l["filed"] for l in m.federal)
    agencies = sorted({a for l in m.federal for a in l["agencies"]})
    items = []
    for i, l in enumerate([x for x in m.filing_order() if x["series"] == "federal"], 1):
        items.append('      { "@type": "ListItem", "position": %d, "name": %s, "item": "%s/letters/%s/" }'
                     % (i, json.dumps(l["headline"]), SITE, l["slug"]))
    desc = (f"The Tokenization Systems Federal Comment Letter Program: {word(m.n_federal)} letters across "
            f"{word(len(agencies))} agencies, filed {fmt_range(first, last)}. "
            f"{m.n_recs} recommendations applying CLII, MVEP, and the control-layer framework, with the "
            f"outcome of each proceeding tracked as it issues.")
    return ['<script type="application/ld+json">',
            "{",
            '  "@context": "https://schema.org",',
            '  "@type": "CollectionPage",',
            '  "name": "Federal Comment Letters",',
            f'  "description": {json.dumps(desc)},',
            '  "accessibilityFeature": ["alternativeText", "readingOrder", "structuralNavigation", "highContrastDisplay"],',
            f'  "url": "{SITE}/letters/",',
            f'  "mainEntityOfPage": {{ "@type": "WebPage", "@id": "{SITE}/letters/" }},',
            f'  "publisher": {{ "@type": "Organization", "name": "Tokenization Systems", "url": "{SITE}" }},',
            '  "mainEntity": {',
            '    "@type": "ItemList",',
            f'    "name": {json.dumps("Federal Comment Letter Program (" + word(m.n_federal) + " letters, " + fmt_range(first, last) + ")")},',
            f'    "numberOfItems": {m.n_federal},',
            '    "itemListElement": [',
            ",\n".join(items),
            "    ]",
            "  }",
            "}",
            "</script>"]


# ----------------------------------------------------------------------------- letter pages
def gen_status_badge(m, l):
    return [f'<span class="badge badge-status-{attr(m.status_class(l))}">{esc(m.status_label(l))}</span>']


def gen_outcome(m, l):
    """Condensed status for the hand-authored "Docket and status" block.

    The comment period stays in the page's metadata strip, and the status chip is
    the status-badge region. A note longer than a short update folds.
    """
    o = l["_outcome"]
    bits = [f"as of {esc(fmt_date(m.verified_on))}"]
    disp = m.rec_disposition(l)
    if disp:
        bits.append(esc(disp))
    if o.get("final_action"):
        fa = o["final_action"]
        link = (f'<a href="{attr(fa["url"])}" target="_blank" rel="noopener noreferrer">{esc(fa.get("citation", "final text"))}</a>'
                if fa.get("url") else esc(fa.get("citation", "")))
        if fa.get("date"):
            link += ", " + esc(fmt_date(fa["date"]))
        if link:
            bits.append(link)
    out = [f'<p class="letter-status-line">{" &middot; ".join(bits)}</p>']
    links = []
    if l.get("supplements"):
        parent = m.by_slug[l["supplements"]["slug"]]
        recs = l["supplements"].get("recommendations")
        tail = f", Recommendation {', '.join(str(r) for r in recs)}" if recs else ""
        links.append(f'Supplements <a href="/letters/{attr(parent["slug"])}/">No. {parent["number"]}: {esc(parent["short_title"])}</a>{esc(tail)}')
    if l["_children"]:
        kids = ", ".join(f'<a href="/letters/{attr(c["slug"])}/">No. {c["number"]}: {esc(c["short_title"])}</a>' for c in l["_children"])
        links.append(f"Supplemented by {kids}")
    refs = [r for r in m.referenced_by(l) if r["slug"] not in {c["slug"] for c in l["_children"]}]
    if refs:
        ref_links = ", ".join(f'<a href="/letters/{attr(r["slug"])}/">{esc(m.number_label(r))}</a>' for r in refs)
        links.append(f"Referenced by later letters: {ref_links}")
    if l.get("cited_by"):
        cites = "; ".join((f'<a href="{attr(c["url"])}" target="_blank" rel="noopener noreferrer">{esc(c["who"])}</a>' if c.get("url") else esc(c["who"])) + (f", {esc(c['what'])}" if c.get("what") else "") for c in l["cited_by"])
        links.append(f"Cited by {cites}")
    if links:
        out.append(f'<p class="letter-status-links">{". ".join(links)}.</p>')
    decided = [r for r in l["recommendations"] if r["status"] != "pending"]
    if decided:
        out.append('<ul class="letter-outcome-recs">')
        for r in decided:
            note = f": {esc(r['status_note'])}" if r.get("status_note") else ""
            out.append(f'  <li><a href="#rec-{r["n"]}">Recommendation {r["n"]}</a> <span class="rec-status rec-status--{attr(r["status"])}">{esc(REC_STATUS_LABEL[r["status"]])}</span>{note}</li>')
        out.append("</ul>")
    note = visible_note(o.get("note"))
    if note:
        srcs = "; ".join(f'<a href="{attr(s["url"])}" target="_blank" rel="noopener noreferrer">{esc(s["title"])}</a>' for s in o.get("sources", []))
        body = f'{esc(note)}{(" Source: " + srcs + ".") if srcs else ""}'
        if len(note) > 400:
            out += ['<details class="letter-status-more">',
                    "  <summary>Status note</summary>",
                    f'  <p class="letter-outcome-note">{body}</p>',
                    "</details>"]
        else:
            out.append(f'<p class="letter-outcome-note">{body}</p>')
    return out


def related_card(href, kicker, title, sub):
    return [f'<a href="{attr(href)}" class="companion-card">',
            f'  <strong>{esc(kicker)}: {esc(title)} &rarr;</strong>',
            f"  <span>{esc(sub)}</span>",
            "</a>"]


def gen_related(m, l):
    cards, used = [], {l["slug"]}

    def add(other, kicker):
        if other["slug"] in used:
            return
        used.add(other["slug"])
        sub = f"{fmt_date(other['filed'])} · {other['agency_display']} · {m.status_label(other)}".replace("·", "&middot;")
        cards.extend([f'<a href="/letters/{attr(other["slug"])}/" class="companion-card">',
                      f'  <strong>{esc(kicker)}: {esc(other["short_title"])} &rarr;</strong>',
                      f'  <span>{esc(fmt_date(other["filed"]))} &middot; {esc(other["agency_display"])} &middot; {esc(m.status_label(other))}</span>',
                      "</a>"])

    if l.get("supplements"):
        add(m.by_slug[l["supplements"]["slug"]], "Supplements")
    for c in l["_children"]:
        add(c, "Supplemented by")
    for other in m.filing_order():
        if other["proceeding"] == l["proceeding"]:
            add(other, "Same proceeding")
    same_cycle = [o for o in m.letters if o["cycle"] == l["cycle"] and o["slug"] not in used]
    same_cycle.sort(key=lambda o: abs((int(o["filed"].replace("-", "")) - int(l["filed"].replace("-", "")))))
    for other in same_cycle[:2]:
        add(other, "Same cycle")
    # every paper the registry lists, not only the first: a letter that applies CLII and MVEP
    # links both defining papers, and says which framework each one defines
    for p in l.get("papers") or []:
        defines = [f for f in l["frameworks"] if m.framework_papers.get(f) == p["url"]]
        sub = (f"Defines the {m.frameworks[defines[0]]} framework this letter applies." if defines
               else "The research behind this letter.")
        cards += related_card(p["url"], p["kind"].capitalize(), p["label"], sub)
    if not cards:
        return []
    out = ['<section class="companions" aria-labelledby="companions-heading">',
           '  <h3 id="companions-heading">Related</h3>',
           '  <div class="companion-cards">']
    out += ["    " + ln for ln in cards]
    out += ["  </div>", "</section>"]
    return out


CHIP_RE = re.compile(r'\s*<span class="rec-status rec-status--[\w-]+">[^<]*</span>')


def sync_rec_chips(page, l):
    """Ensure each <li id="rec-N"> carries a status chip exactly when its status is not pending."""
    for r in l["recommendations"]:
        pat = re.compile(r'(<li id="' + re.escape(r["id"]) + r'">)(.*?)(</li>)', re.S)
        mm = pat.search(page)
        if not mm:
            continue
        inner = CHIP_RE.sub("", mm.group(2), count=1)
        if r["status"] != "pending":
            inner = inner + f' <span class="rec-status rec-status--{attr(r["status"])}">{esc(REC_STATUS_LABEL[r["status"]])}</span>'
        page = page[:mm.start()] + mm.group(1) + inner + mm.group(3) + page[mm.end():]
    return page


# ----------------------------------------------------------------------------- recommendation index
def gen_recommendations(m):
    letters = [l for l in m.filing_order() if l["rec_count"]]
    topics, agencies, statuses = {}, {}, {}
    for l in letters:
        agencies[l["agency"]] = agencies.get(l["agency"], 0) + l["rec_count"]
        for r in l["recommendations"]:
            statuses[r["status"]] = statuses.get(r["status"], 0) + 1
            for t in r["topics"]:
                topics[t] = topics.get(t, 0) + 1
    out = ['<div class="letters-toolbar" hidden>',
           '  <div class="letters-filters" role="group" aria-label="Filter recommendations">',
           '    <div class="filter-group" data-axis="agency"><span class="filter-label">Agency:</span>',
           "      " + chip("agency", "all", "All", active=True)]
    for a in AGENCY_ORDER:
        if a in agencies:
            out.append("      " + chip("agency", a, a, agencies[a]))
    out += ["    </div>",
            '    <div class="filter-group" data-axis="topic"><span class="filter-label">Topic:</span>',
            "      " + chip("topic", "all", "All", active=True)]
    for t, n in sorted(topics.items(), key=lambda kv: (-kv[1], kv[0])):
        out.append("      " + chip("topic", t, t, n))
    out.append("    </div>")
    if len(statuses) > 1:
        out.append('    <div class="filter-group" data-axis="status"><span class="filter-label">Status:</span>')
        out.append("      " + chip("status", "all", "All", active=True))
        for s in ["adopted", "partly-adopted", "noted", "not-adopted", "pending"]:
            if s in statuses:
                out.append("      " + chip("status", s, REC_STATUS_LABEL[s], statuses[s]))
        out.append("    </div>")
    out += ["  </div>",
            '  <div class="letters-controls">',
            '    <div class="filter-group" role="group" aria-label="Order"><span class="filter-label">Order:</span>',
            '      <button type="button" class="filter-btn active" data-sort="filing" aria-pressed="true">Filing order</button>',
            '      <button type="button" class="filter-btn" data-sort="newest" aria-pressed="false">Newest first</button>',
            "    </div>",
            "  </div>",
            '  <p class="filter-count-wrap" hidden><span class="filter-count" aria-live="polite"></span>'
            ' <button type="button" class="filter-reset">Clear filters</button></p>',
            "</div>",
            '<div class="letters-timeline-table" role="region" aria-label="All recommendations">',
            '  <table class="letters-timeline rec-index letters-stackable" id="rec-index">',
            "    <thead>",
            "      <tr><th>No.</th><th>Letter</th><th>Recommen&shy;dation</th><th>Topics</th><th>Status</th></tr>",
            "    </thead>",
            "    <tbody>"]
    for l in letters:
        for r in l["recommendations"]:
            rid = f"r-{l['number']}-{r['n']}"
            topics_attr = " ".join(t.replace(" ", "-").replace("/", "-").lower() for t in r["topics"])
            out += [f'      <tr id="{rid}" data-agency="{attr(l["agency"])}" data-cycle="{attr(l["cycle"])}" data-topic="{attr(topics_attr)}" '
                    f'data-status="{attr(r["status"])}" data-filed="{attr(l["filed"])}" data-number="{l["number"]}" data-n="{r["n"]}">',
                    f'        <td data-label="No."><a href="#{rid}" class="rec-anchor">{l["number"]}.{r["n"]}</a></td>',
                    f'        <td data-label="Letter"><a href="/letters/{attr(l["slug"])}/">No. {l["number"]} {esc(l["short_title"])}</a><br>'
                    f'<span class="letters-outcome-id">{esc(l["agency_display"])} &middot; {esc(fmt_date(l["filed"]))}</span></td>',
                    f'        <td data-label="Recommendation"><a href="/letters/{attr(l["slug"])}/#{attr(r["id"])}">{esc(r["ask"])}</a></td>',
                    f'        <td data-label="Topics">{esc(", ".join(r["topics"]))}</td>',
                    f'        <td data-label="Status"><span class="rec-status rec-status--{attr(r["status"])}">{esc(REC_STATUS_LABEL[r["status"]])}</span>'
                    + (f'<br><span class="letters-outcome-id">{esc(r["status_note"])}</span>' if r.get("status_note") else "") + "</td>",
                    "      </tr>"]
    out += ["    </tbody>", "  </table>", "</div>",
            f'<p class="letters-asof">{m.n_recs} recommendations across {len(letters)} letters. Status as of {esc(fmt_date(m.verified_on))}; topics are editorial tags for filtering, not the letters\' own headings.</p>']
    return out


def gen_recs_jsonld(m):
    letters = [l for l in m.filing_order() if l["rec_count"]]
    items = []
    for i, l in enumerate(letters, 1):
        items.append('      { "@type": "ListItem", "position": %d, "name": %s, "item": "%s/letters/%s/#rec-1" }'
                     % (i, json.dumps(f"No. {l['number']} {l['short_title']}: {plural(l['rec_count'], 'recommendation')}"), SITE, l["slug"]))
    return ['<script type="application/ld+json">',
            "{",
            '  "@context": "https://schema.org",',
            '  "@type": "CollectionPage",',
            '  "name": "Recommendation index",',
            f'  "description": {json.dumps(f"All {m.n_recs} recommendations from the Tokenization Systems Federal Comment Letter Program in one table, by letter, agency, topic and status.")},',
            f'  "url": "{SITE}/letters/recommendations/",',
            f'  "mainEntityOfPage": {{ "@type": "WebPage", "@id": "{SITE}/letters/recommendations/" }},',
            f'  "publisher": {{ "@type": "Organization", "name": "Tokenization Systems", "url": "{SITE}" }},',
            f'  "isPartOf": {{ "@type": "WebPage", "@id": "{SITE}/letters/" }},',
            '  "mainEntity": {',
            '    "@type": "ItemList",',
            f'    "name": {json.dumps(f"Recommendations by letter ({m.n_recs} in {len(letters)} letters)")},',
            f'    "numberOfItems": {len(letters)},',
            '    "itemListElement": [',
            ",\n".join(items),
            "    ]",
            "  }",
            "}",
            "</script>"]


# ----------------------------------------------------------------------------- feed
def xml(s):
    return html.escape("" if s is None else str(s), quote=True)


def gen_feed(m):
    letters = m.newest_first()
    updated = max(l["filed"] for l in letters) + "T00:00:00Z"
    out = ['<?xml version="1.0" encoding="utf-8"?>',
           '<feed xmlns="http://www.w3.org/2005/Atom">',
           "  <title>Tokenization Systems: comment letters</title>",
           f"  <subtitle>Federal comment letters and international standard-setter responses, newest first. {m.n_recs} recommendations across {word(m.n_federal)} federal letters.</subtitle>",
           f'  <link href="{SITE}/letters/feed.xml" rel="self" type="application/atom+xml"/>',
           f'  <link href="{SITE}/letters/" rel="alternate" type="text/html"/>',
           f"  <id>{SITE}/letters/</id>",
           f"  <updated>{updated}</updated>",
           "  <author><name>Zach Zukowski</name><uri>" + SITE + "/</uri></author>",
           "  <rights>CC BY 4.0</rights>"]
    for l in letters:
        out += ["  <entry>",
                f"    <title>{xml(l['headline'])}</title>",
                f'    <link href="{SITE}/letters/{l["slug"]}/" rel="alternate" type="text/html"/>',
                *([f'    <link href="{SITE}{l["pdf"]}" rel="enclosure" type="application/pdf" title="Filed PDF"/>']
                  if l.get("pdf") else []),  # no enclosure for a letter filed as comment-box text
                f"    <id>{SITE}/letters/{l['slug']}/</id>",
                f"    <published>{l['filed']}T00:00:00Z</published>",
                f"    <updated>{l['filed']}T00:00:00Z</updated>",
                f'    <category term="{xml(l["agency"])}" label="{xml(l["agency_display"])}"/>',
                f'    <category term="{xml(l["cycle"])}" label="{xml(m.cycles[l["cycle"]]["label"])}"/>',
                f"    <summary type=\"text\">{xml(l['thesis'])} Filed {xml(fmt_date(l['filed']))} on {xml(l['docket']['label'])}; {xml(m.rec_phrase(l))}; {xml(m.status_label(l).lower())}.</summary>",
                "  </entry>"]
    out.append("</feed>")
    return "\n".join(out) + "\n"


# ----------------------------------------------------------------------------- driver

# ----------------------------------------------------------------------------- exports
def public_letter(l):
    """A letter record without the renderer's private fields, plus its site URL."""
    out = {k: v for k, v in l.items() if not k.startswith("_")}
    out["url"] = f"{SITE}/letters/{l['slug']}/"
    out["pdf_url"] = SITE + l["pdf"] if l.get("pdf") else None   # null: filed as comment-box text, no attachment
    return out


def gen_letters_json(m):
    data = {
        "_generated": "render_letters.py from scripts/letters_registry.json; do not edit",
        "site": SITE,
        "verified_on": m.verified_on,
        "outcome_states": m.reg["_meta"]["outcome_states"],
        "recommendation_statuses": m.reg["_meta"]["recommendation_statuses"],
        "letters": [public_letter(l) for l in m.filing_order()],
        "proceedings": m.procs,
        "watch": m.reg.get("watch", []),
    }
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def gen_recs_csv(m):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["letter_number", "letter_slug", "letter_title", "agency", "filed", "proceeding",
                "docket", "rec_n", "rec_id", "ask", "text", "topics", "status", "status_note", "url"])
    for l in m.filing_order():
        for r in l["recommendations"]:
            w.writerow([l["number"] or "", l["slug"], l["title"], l["agency"], l["filed"], l["proceeding"],
                        l["docket"]["label"], r["n"], r["id"], r.get("ask", ""), r["text"],
                        " ".join(r.get("topics", [])), r["status"], r.get("status_note", "") or "",
                        f"{SITE}/letters/{l['slug']}/#{r['id']}"])
    return buf.getvalue()


# ----------------------------------------------------------------------------- tracker
def tracker_rows(m):
    """One row per GENIUS Act rulemaking: commented proceedings plus uncommented actions."""
    rows = []
    for key, p in m.procs.items():
        ls = [l for l in m.filing_order() if l["proceeding"] == key]
        if not ls or not any(l["cycle"] == "genius" for l in ls):
            continue
        opens = sorted(l["comment_period"].get("open") for l in ls if l["comment_period"].get("open"))
        closes = sorted(l["comment_period"].get("close") for l in ls if l["comment_period"].get("close"))
        o = p["outcome"]
        rows.append({"key": key, "agency": ls[0]["agency"], "agency_long": p["agency"], "name": p["name"],
                     "identifier": p["identifier"], "fr": p.get("fr"), "kind": p["kind"], "url": p.get("url"),
                     "published": opens[0] if opens else None, "comment_close": closes[-1] if closes else None,
                     "comment_close_note": None, "state": o["state"],
                     "status_label": o.get("status_label") or STATE_LABEL[o["state"]],
                     "note": o.get("note"), "sources": o.get("sources", []), "final_action": o.get("final_action"),
                     "letters": ls, "commented": True})
    for a in (m.tracker or {}).get("actions", []):
        o = a["outcome"]
        rows.append({"key": a["key"], "agency": a["agency"], "agency_long": a["agency_long"], "name": a["name"],
                     "identifier": a["identifier"], "fr": a.get("fr"), "kind": a["kind"], "url": a.get("url"),
                     "published": a.get("published"), "comment_close": a.get("comment_close"),
                     "comment_close_note": a.get("comment_close_note"), "state": o["state"],
                     "status_label": o.get("status_label") or STATE_LABEL[o["state"]],
                     "note": o.get("note"), "sources": o.get("sources", []), "final_action": o.get("final_action"),
                     "letters": [], "commented": False})
    rows.sort(key=lambda r: (r["published"] or "9999", r["name"]))
    return rows


def split_name(name):
    """'OCC: GENIUS Act implementation ...' -> ('OCC', 'GENIUS Act implementation ...')."""
    if ": " in name:
        head, tail = name.split(": ", 1)
        return head, tail
    return None, name


def gen_tracker(m):
    t = m.tracker
    rows = tracker_rows(m)
    n = len(rows)
    n_comm = sum(1 for r in rows if r["commented"])
    n_open = sum(1 for r in rows if r["state"] == "open")
    n_final = sum(1 for r in rows if r["state"] == "final")
    n_pending = sum(1 for r in rows if r["state"] == "closed-pending")
    bits = [f"{n} rulemakings", f"{n_comm} with a program letter", f"{n_open} open for comment",
            f"{n_pending} awaiting final action", f"{n_final} in effect"]
    out = [f'<p class="letters-meta-strip">{" &middot; ".join(esc(b) for b in bits)}</p>',
           f'<p class="letters-outcomes-lede">One row per rulemaking, in order of Federal Register publication. Rows with a letter link to the program\'s comment; the others are listed so the implementation picture is complete. Status as of {esc(fmt_date(m.verified_on))}.</p>',
           '<div class="letters-timeline-table" role="region" aria-label="GENIUS Act rulemakings">',
           '  <table class="letters-timeline letters-outcomes letters-stackable tracker-table">',
           "    <thead>",
           "      <tr><th>Rulemaking</th><th>Published</th><th>Comments</th><th>Status</th><th>Program letter</th></tr>",
           "    </thead>",
           "    <tbody>"]
    for r in rows:
        head, tail = split_name(r["name"])
        agency = esc(head or r["agency"])
        title = (f'<a href="{attr(r["url"])}" target="_blank" rel="noopener noreferrer">{esc(tail)}</a>' if r.get("url") else esc(tail))
        ident = esc(r["identifier"]) + (f"; {esc(r['fr'])}" if r.get("fr") else "")
        if r["comment_close"]:
            comments = ("open until " if r["state"] == "open" else "closed ") + fmt_date(r["comment_close"])
            if r.get("comment_close_note"):
                comments += f' <span class="letters-outcome-id">({esc(r["comment_close_note"])})</span>'
        else:
            comments = "n/a"
        status = f'<span class="status-chip status-chip--{attr(STATE_CLASS.get(r["state"], "pending"))}">{esc(r["status_label"])}</span>'
        if r.get("final_action"):
            fa = r["final_action"]
            status += f'<br><span class="letters-outcome-id">{esc(fa.get("citation", ""))}{" (" + esc(fmt_date(fa["date"])) + ")" if fa.get("date") else ""}</span>'
        if r["letters"]:
            letters = ", ".join(f'<a href="/letters/{attr(l["slug"])}/">{esc(m.number_label(l))}</a>' for l in r["letters"])
        else:
            letters = '<span class="tracker-none">none filed</span>'
        out += ["      <tr" + (' class="tracker-row--commented"' if r["commented"] else "") + ">",
                f'        <td data-label="Rulemaking"><span class="tracker-agency">{agency}</span> {title}<br><span class="letters-outcome-id">{esc(r["kind"])}; {ident}</span></td>',
                f'        <td data-label="Published">{esc(fmt_date(r["published"])) if r["published"] else "n/a"}</td>',
                f'        <td data-label="Comments">{comments}</td>',
                f'        <td data-label="Status">{status}</td>',
                f'        <td data-label="Program letter">{letters}</td>',
                "      </tr>"]
        note = visible_note(r.get("note"))
        if note:
            srcs = " ".join(f'<a href="{attr(s_["url"])}" target="_blank" rel="noopener noreferrer">{esc(s_["title"])}</a>' for s_ in r.get("sources", []))
            out.append(f'      <tr class="letters-outcome-note"><td colspan="5">{esc(note)}{(" " + srcs) if srcs else ""}</td></tr>')
    out += ["    </tbody>", "  </table>", "</div>"]
    st = (t or {}).get("statute")
    if st:
        out.append('<h2 id="statutory-frame">Statutory frame</h2>')
        out.append('<ul class="letters-watch tracker-statute">')
        out.append(f'  <li><time datetime="{attr(st["enacted"])}">{esc(fmt_date(st["enacted"]))}</time>: {esc(st["name"])} signed into law.</li>')
        out.append(f'  <li><time datetime="{attr(st["rulemaking_deadline"])}">{esc(fmt_date(st["rulemaking_deadline"]))}</time>: statutory rulemaking deadline. {esc(st.get("rulemaking_deadline_note", ""))}</li>')
        out.append(f'  <li>Effective date: {esc(st["effective_note"])}</li>')
        out.append(f'  <li><time datetime="{attr(st["dasp_restriction"])}">{esc(fmt_date(st["dasp_restriction"]))}</time>: {esc(st["dasp_restriction_note"])}</li>')
        srcs = " ".join(f'<a href="{attr(s_["url"])}" target="_blank" rel="noopener noreferrer">{esc(s_["title"])}</a>' for s_ in st.get("sources", []))
        if srcs:
            out.append(f'  <li class="tracker-statute__source">Text: {srcs}</li>')
        out.append("</ul>")
    watch = sorted(m.reg.get("watch", []), key=lambda w: w["date"])
    if watch:
        out.append('<h2 id="next-dates">Next dates</h2>')
        out.append('<ul class="letters-watch">')
        for w in watch:
            srcs = " ".join(f'<a href="{attr(s_["url"])}" target="_blank" rel="noopener noreferrer">source</a>' for s_ in w.get("sources", []))
            out.append(f'  <li><time datetime="{attr(w["date"])}">{esc(fmt_date(w["date"]))}</time>: {esc(w["text"])}{(" (" + srcs + ")") if srcs else ""}</li>')
        out.append("</ul>")
    out.append(f'<p class="letters-asof">Last checked {esc(fmt_date(m.verified_on))}. The same rows are published as <a href="/trackers/genius-act/genius-act.json">JSON</a>; the program\'s own letters and their outcomes are on the <a href="/letters/#program-outcomes">letters page</a>.</p>')
    return out


def gen_tracker_jsonld(m):
    rows = tracker_rows(m)
    items = []
    for i, r in enumerate(rows, 1):
        item = {"@type": "Legislation", "name": r["name"], "legislationIdentifier": r["identifier"],
                "legislationType": r["kind"],
                "publisher": {"@type": "GovernmentOrganization", "name": r["agency_long"]}}
        if r.get("url"):
            item["url"] = r["url"]
        if r.get("published"):
            item["datePublished"] = r["published"]
        items.append({"@type": "ListItem", "position": i, "item": item})
    data = {"@context": "https://schema.org", "@type": "ItemList",
            "name": "GENIUS Act implementing rulemakings",
            "description": f"Implementing rulemakings under the GENIUS Act with publication date, comment close and status, as of {m.verified_on}.",
            "url": f"{SITE}/trackers/genius-act/", "numberOfItems": len(items), "itemListElement": items}
    text = json.dumps(data, indent=2, ensure_ascii=False)
    return ['<script type="application/ld+json">'] + text.split("\n") + ["</script>"]


def gen_tracker_json(m):
    rows = []
    for r in tracker_rows(m):
        rows.append({"key": r["key"], "agency": r["agency"], "agency_long": r["agency_long"], "name": r["name"],
                     "identifier": r["identifier"], "federal_register": r.get("fr"), "kind": r["kind"], "url": r.get("url"),
                     "published": r["published"], "comment_close": r["comment_close"],
                     "comment_close_note": r.get("comment_close_note"), "status_state": r["state"],
                     "status_label": r["status_label"], "note": r.get("note"), "sources": r.get("sources", []),
                     "final_action": r.get("final_action"),
                     "program_letters": [{"number": l["number"], "slug": l["slug"], "filed": l["filed"],
                                          "url": f"{SITE}/letters/{l['slug']}/"} for l in r["letters"]]})
    data = {"_generated": "render_letters.py from scripts/letters_registry.json; do not edit",
            "title": (m.tracker or {}).get("title"), "url": f"{SITE}/trackers/genius-act/",
            "verified_on": m.verified_on, "statute": (m.tracker or {}).get("statute"),
            "status_states": m.reg["_meta"]["outcome_states"], "rulemakings": rows,
            "watch": m.reg.get("watch", [])}
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


# An internal paper id (A1, A2, B2, C4, ...) is how the research workflow names a paper; a reader
# of the public site cannot resolve one, so it never belongs in a paper label or in a letter
# page's framework and paper tags. Measured 2026-10-15 before this check existed: 46 leaks on 18
# of the 22 letter pages ("MVEP (A2)" alone 27 times), copied from the registry labels into the
# Related cards and from the letter-page skill's example into the hand-written tags.
PAPER_ID_RE = re.compile(r"\(\s*[A-D][1-9]\d?\b[^)]*\)")
TAGS_RE = re.compile(r'<div class="paper-audience-tags"[^>]*>(.*?)</div>', re.S)


def check_frameworks_and_papers(letters, frameworks, framework_papers, pages):
    """Problems with each letter's frameworks and paper links. Pure, so --selftest can drive it.

    1. every framework a letter lists is in the frameworks map (a topic or a method, such as
       "measurement", is not a framework, and would otherwise surface as a hub filter chip);
    2. a letter that applies a framework links the paper that defines it (framework_papers),
       so a page reading "Framework: CLII" also links Routing the Dollar;
    3. no paper label carries an internal paper id;
    4. the page's hand-written tags carry no internal paper id and link every paper the
       registry lists, so the tags and the generated Related cards cannot disagree.
    """
    problems = []
    for l in letters:
        rel = f"letters/{l['slug']}/index.html"
        papers = l.get("papers") or []
        urls = [p["url"] for p in papers]
        for f in l["frameworks"]:
            if f not in frameworks:
                problems.append(f"registry: {l['slug']} lists framework {f!r}, which is not in the frameworks "
                                f"map ({', '.join(frameworks)}); a topic or method is not a framework")
            home = framework_papers.get(f)
            if home and home not in urls:
                problems.append(f"registry: {l['slug']} applies {frameworks.get(f, f)} but does not list "
                                f"its defining paper {home}")
        for p in papers:
            if PAPER_ID_RE.search(p["label"]):
                problems.append(f"registry: {l['slug']} paper label {p['label']!r} carries an internal paper id")
        page = pages.get(l["slug"])
        if not page:
            continue
        mt = TAGS_RE.search(page)
        if not mt:
            if papers:
                problems.append(f"{rel}: no paper-audience-tags block, so the registry's paper links have no tags")
            continue
        tags = mt.group(1)
        for hit in PAPER_ID_RE.findall(re.sub(r"<[^>]+>", "", tags)):
            problems.append(f"{rel}: the framework and paper tags carry an internal paper id {hit!r}")
        for u in urls:
            if f'href="{u}"' not in tags:
                problems.append(f"{rel}: the framework and paper tags do not link {u}, which the registry lists")
    return problems


def selftest():
    """Prove each frameworks-and-papers check can FAIL on a synthetic bad case, and passes a good one."""
    fw = {"mvep": "MVEP", "clii": "CLII"}
    fp = {"mvep": "/papers/mvep/", "clii": "/papers/routing-the-dollar/"}
    good_papers = [{"kind": "paper", "label": "MVEP", "url": "/papers/mvep/"},
                   {"kind": "paper", "label": "Routing the Dollar", "url": "/papers/routing-the-dollar/"}]
    good_page = ('<div class="paper-audience-tags"><span>Framework: CLII</span>'
                 '<span>Paper: <a href="/papers/mvep/">MVEP</a></span>'
                 '<span>Paper: <a href="/papers/routing-the-dollar/">Routing the Dollar</a></span></div>')

    def run(frameworks=("mvep", "clii"), papers=None, page=good_page):
        l = {"slug": "x", "frameworks": list(frameworks), "papers": good_papers if papers is None else papers}
        return check_frameworks_and_papers([l], fw, fp, {"x": page})

    cases = [
        ("good letter passes", run(), 0),
        ("a non-framework key fires", run(frameworks=("mvep", "clii", "measurement")), 1),
        ("CLII without its paper fires", run(papers=good_papers[:1],
                                             page=good_page.replace("routing-the-dollar", "elsewhere")), 1),
        ("an id in a label fires", run(papers=[dict(good_papers[0], label="MVEP (A2)"), good_papers[1]]), 1),
        ("an id with a qualifier fires", run(page=good_page.replace(">MVEP<", ">MVEP (A7, forthcoming)<")), 1),
        ("an id in the tags fires", run(page=good_page.replace(">MVEP<", ">MVEP (A2)<")), 1),
        ("an id in the tags fires on a letter with no registry papers",
         run(frameworks=(), papers=[], page=good_page.replace(">MVEP<", ">MVEP (B2)<")), 1),
        ("a registry paper missing from the tags fires",
         run(page=good_page.replace('href="/papers/routing-the-dollar/"', 'href="/papers/other/"')), 1),
        ("a section reference is not an id", run(page=good_page.replace(">MVEP<", ">MVEP, Section 3(a)<")), 0),
    ]
    bad = [(name, len(got), want) for name, got, want in cases if len(got) != want]
    for name, got, want in bad:
        print(f"render_letters selftest: FAIL {name}: {got} problem(s), wanted {want}", file=sys.stderr)
    if not bad:
        print(f"render_letters selftest: OK ({len(cases)} cases)")
    return 1 if bad else 0


def check_letter_reading_order(page, rel, problems):
    """Docket summary and macro context, then thesis and recommendations, then docket details."""
    if 'id="letter-title"' not in page:
        return

    def at(token):
        return page.find(token)

    thesis = at('class="paper-thesis"')
    abstract = at('class="paper-abstract"')
    record = at('class="letter-record"')
    meta = at('class="paper-metadata-strip"')
    badge = at("letters:status-badge START")
    outcome = at("letters:outcome START")
    related = at("letters:related START")
    title = at('id="letter-title"')
    missing = [name for name, pos in (
        ("thesis", thesis), ("abstract", abstract), ("docket record", record),
        ("metadata strip", meta), ("status badge", badge), ("outcome", outcome),
        ("related", related)) if pos < 0]
    if missing:
        problems.append(f"{rel}: missing {', '.join(missing)}")
        return
    if badge < title:
        problems.append(f"{rel}: status badge is above the title; it belongs in the docket record")
    if meta < thesis:
        problems.append(f"{rel}: docket details should follow the thesis, inside the docket record")
    if not (thesis < abstract < record <= meta and record < badge < outcome < related):
        problems.append(f"{rel}: reading order should be summary and context, thesis, recommendations, then docket details and status")
    lead = at('class="letter-lead"')
    if lead >= 0 and lead > thesis:
        problems.append(f"{rel}: docket summary and macro context should precede the thesis")
    if "letter-background" in page:
        problems.append(f"{rel}: docket summary is still collapsed under letter-background")
    if ">Program role<" in page:
        problems.append(f"{rel}: Program role should be the macro context section above the thesis")


def check_hub_reading_order(text, problems):
    summary = text.find('id="program-summary"')
    context = text.find('id="program-context"')
    letters = text.find('id="the-letters"')
    outcomes = text.find('id="program-outcomes"')
    if not (0 <= summary < context < letters < outcomes):
        problems.append("letters/index.html: docket summary and macro context should precede the letters; docket details and status should follow")
    if summary != text.rfind('id="program-summary"'):
        problems.append("letters/index.html: duplicate program-summary")


def verify_registry_against_pages(m, problems):
    problems.extend(check_frameworks_and_papers(m.letters, m.frameworks, m.framework_papers, m.pages))
    for l in m.letters:
        rel = f"letters/{l['slug']}/index.html"
        page = m.pages.get(l["slug"])
        if page is None:
            problems.append(f"{rel}: page missing for registry entry")
            continue
        mm = re.search(r'"datePublished": "([^"]+)"', page)
        if mm and mm.group(1) != l["filed"]:
            problems.append(f"{rel}: datePublished {mm.group(1)} differs from registry filed {l['filed']}")
        for r in l["recommendations"]:
            if f'<li id="{r["id"]}">' not in page:
                problems.append(f"{rel}: recommendation anchor id=\"{r['id']}\" not found (registry lists {l['rec_count']})")
        for name in ("status-badge", "outcome", "related"):
            if region_bounds(page.split("\n"), name) is None:
                problems.append(f"{rel}: missing region letters:{name}")
        check_letter_reading_order(page, rel, problems)
    hub_path = os.path.join(m.root, HUB_REL)
    if os.path.isfile(hub_path):
        check_hub_reading_order(read(hub_path), problems)
    counted = sum(l["rec_count"] for l in m.federal)
    listed = sum(len(l["recommendations"]) for l in m.federal)
    if counted != listed:
        problems.append(f"registry: rec_count total {counted} differs from listed recommendations {listed}")


def build(m):
    """Return {rel_path: new_text} for every generated surface, collecting problems."""
    problems = []
    outputs = {}
    verify_registry_against_pages(m, problems)
    # hub
    hub_path = os.path.join(m.root, HUB_REL)
    if os.path.isfile(hub_path):
        text = read(hub_path)
        for name, body in (("summary", gen_summary(m)), ("toolbar", gen_toolbar(m)), ("index", gen_index(m)),
                           ("outcomes", gen_outcomes(m)), ("collection-jsonld", gen_collection_jsonld(m))):
            text = stamp(text, name, body, problems, HUB_REL)
        outputs[HUB_REL] = text
    else:
        problems.append(f"{HUB_REL}: missing")
    # letter pages
    for l in m.letters:
        page = m.pages.get(l["slug"])
        if page is None:
            continue
        rel = f"letters/{l['slug']}/index.html"
        text = stamp(page, "status-badge", gen_status_badge(m, l), problems, rel)
        text = stamp(text, "outcome", gen_outcome(m, l), problems, rel)
        text = stamp(text, "related", gen_related(m, l), problems, rel)
        text = sync_rec_chips(text, l)
        outputs[rel] = text
    # recommendation index
    recs_path = os.path.join(m.root, RECS_REL)
    if os.path.isfile(recs_path):
        text = read(recs_path)
        text = stamp(text, "recommendations", gen_recommendations(m), problems, RECS_REL)
        text = stamp(text, "recs-jsonld", gen_recs_jsonld(m), problems, RECS_REL)
        outputs[RECS_REL] = text
    else:
        problems.append(f"{RECS_REL}: missing (create the page skeleton with the two marker pairs)")
    outputs[FEED_REL] = gen_feed(m)
    outputs[LETTERS_JSON_REL] = gen_letters_json(m)
    outputs[RECS_CSV_REL] = gen_recs_csv(m)
    # GENIUS Act tracker
    if m.tracker:
        tracker_path = os.path.join(m.root, TRACKER_REL)
        if os.path.isfile(tracker_path):
            text = read(tracker_path)
            text = stamp(text, "tracker", gen_tracker(m), problems, TRACKER_REL)
            text = stamp(text, "tracker-jsonld", gen_tracker_jsonld(m), problems, TRACKER_REL)
            outputs[TRACKER_REL] = text
        else:
            problems.append(f"{TRACKER_REL}: missing (create the page skeleton with the two marker pairs)")
        outputs[TRACKER_JSON_REL] = gen_tracker_json(m)
    # editorial discipline: no em or en dashes in generated text (hand-written page
    # text is out of scope here; the pre-commit hook covers it)
    for rel, text in outputs.items():
        gen = text if rel in (FEED_REL, LETTERS_JSON_REL, RECS_CSV_REL, TRACKER_JSON_REL) else "".join(re.findall(
            r"<!--\s*letters:[\w-]+ START\b.*?<!--\s*letters:[\w-]+ END\s*-->", text, flags=re.S))
        if re.search("[\\u2014\\u2013]", gen):
            problems.append(f"{rel}: generated text contains an em or en dash")
    return outputs, problems


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="verify (default)")
    mode.add_argument("--write", action="store_true", help="regenerate in place")
    mode.add_argument("--selftest", action="store_true",
                      help="prove the frameworks-and-papers checks can fail, then exit")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        return selftest()
    try:
        root = repo_root()
        m = Model(root)
        outputs, problems = build(m)
    except Exception as exc:  # the guard could not run: fail open, exit 2
        print(f"render_letters: could not run: {exc}", file=sys.stderr)
        return 2
    if problems:
        for p in problems:
            print(f"render_letters: {p}", file=sys.stderr)
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
            print(f"render_letters: wrote {rel}")
        if not drift and not args.quiet:
            print("render_letters: everything already up to date")
        return 0
    if drift:
        for rel, old, new in drift:
            print(f"render_letters: DRIFT in {rel}", file=sys.stderr)
            if not args.quiet:
                diff = difflib.unified_diff(old.splitlines(), new.splitlines(), f"a/{rel}", f"b/{rel}", lineterm="", n=1)
                for i, line in enumerate(diff):
                    if i > 40:
                        print("   ...", file=sys.stderr)
                        break
                    print("   " + line, file=sys.stderr)
        print("render_letters: run `python3 scripts/render_letters.py --write`", file=sys.stderr)
        return 1
    if not args.quiet:
        print(f"render_letters: OK ({len(outputs)} surfaces match the registry)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
