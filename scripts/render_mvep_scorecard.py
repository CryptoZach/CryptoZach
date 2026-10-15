#!/usr/bin/env python3
"""render_mvep_scorecard.py: stamp the MVEP paper's Exhibit 1 and Exhibit 3 data into /frameworks/.

The interactive MVEP scorecard on the frameworks page carries the paper's own data: the
fourteen-product verdict matrix (Exhibit 1) and the per-product composite rating
(Exhibit 3), mirrored byte for byte from the replication repository into data/mvep/.
This script reads those two CSVs and stamps two marker-delimited regions into
frameworks/index.html:

    mvep:data    a <script type="application/json"> block the page script reads: the
                 products, their verdicts with source tags, their Exhibit 3 rating
                 record, the category list, the verdict and tier vocabularies, the
                 source-tag legend and the rating rule's constants
    mvep:table   the same matrix and ratings as plain tables, for readers without
                 script and for crawlers

It also re-derives every Exhibit 3 record from the Exhibit 1 verdicts with a port of the
upstream rule (floor per dimension, mean rung as strength, weakest-link headline) and
fails if the two CSVs disagree, so a partial upstream refresh cannot ship.

Modes: --check (default) verifies the regions match the CSVs; exit 1 on drift or on a
CSV inconsistency, 2 if the guard cannot run. --write regenerates. Stdlib only.

Refresh workflow: copy the two CSVs from the upstream exhibits into data/mvep/, update
the date in data/mvep/SOURCE.txt, run --write, commit the CSVs and the page.
"""
import argparse
import csv
import difflib
import html
import json
import os
import re
import subprocess
import sys

DATA_DIR = os.path.join("data", "mvep")
SCORECARD_CSV = os.path.join(DATA_DIR, "mvep_scorecard_data.csv")
RATING_CSV = os.path.join(DATA_DIR, "mvep_composite_rating_data.csv")
PAGE_REL = os.path.join("frameworks", "index.html")
START_TMPL = ("<!-- mvep:{name} START (generated from data/mvep/*.csv; refresh the CSVs, then:"
              " python3 scripts/render_mvep_scorecard.py --write) -->")
END_TMPL = "<!-- mvep:{name} END -->"

# The upstream rule (exhibit_03_mvep_composite_rating.py), ported unchanged.
LADDER = {"PASS": 5, "PARTIAL": 4, "AMBIGUOUS": 3, "NOT_DISCLOSED": 2, "FAIL": 1}
TIER_FROM_LEVEL = {5: "EQUIVALENT", 4: "SUBSTANTIALLY_EQUIVALENT", 3: "INDETERMINATE",
                   2: "OPAQUE", 1: "NON_EQUIVALENT", 0: "UNRATED"}
TIER_LABEL = {"EQUIVALENT": "Equivalent", "SUBSTANTIALLY_EQUIVALENT": "Substantially Eq.",
              "INDETERMINATE": "Indeterminate", "OPAQUE": "Opaque", "NON_EQUIVALENT": "Non-Equivalent",
              "UNRATED": "Unrated"}
DIMENSIONS = {"Legal": [1, 5, 4], "Operational": [2, 3, 7, 8, 4, 10], "Economic": [6, 10, "CSA"]}
DISCLOSURE_CATEGORY = 9
DISCLOSURE_LABEL = {"PASS": "Adequate", "PARTIAL": "Partial", "AMBIGUOUS": "Indeterminate",
                    "NOT_DISCLOSED": "None published", "FAIL": "Inadequate", "UNASSESSED": "Unassessed", "NA": "N/A"}
COMPARATORS = ("USDY", "USYC", "USD1", "SoFiUSD", "RLUSD")
ISSUER = {"USDC": "Circle", "USDT": "Tether", "USDG": "Paxos", "PYUSD": "PayPal", "DAI": "MakerDAO",
          "BUIDL": "BlackRock", "OUSG": "Ondo", "BENJI": "Franklin Templeton", "JPMD": "JPMorgan",
          "USDY": "Ondo", "USYC": "Circle/Hashnote", "USD1": "WLF/BitGo", "SoFiUSD": "SoFi Bank", "RLUSD": "Ripple"}
VERDICT_LABEL = {"PASS": "Pass", "PARTIAL": "Partial", "AMBIGUOUS": "Ambiguous", "FAIL": "Fail",
                 "NOT_DISCLOSED": "Not disclosed", "UNASSESSED": "Unassessed", "NA": "N/A"}
VERDICT_MEANING = {
    "PASS": "The required artifact exists and the category's test is met.",
    "PARTIAL": "The artifact or the test is met in part; the gap is documented.",
    "AMBIGUOUS": "The evidence does not settle the test either way.",
    "FAIL": "The test is failed, or the fail trigger is present.",
    "NOT_DISCLOSED": "An assessed verdict: a documented search found no published issuer artifact for the category.",
    "UNASSESSED": "No verdict of record: no assessment was performed.",
}
TAGS = {
    "T2": "Section 5.4, Table 4 (the full ten-category assessment of BUIDL, BENJI, OUSG and USDY)",
    "SUM": "the summary table (Category 1, Category 6 and the Cash Settlement Asset test for the nine-product sample)",
    "F5": "Finding 5 (Tier 2 custody, reconciliation and insolvency cells)",
    "F6": "Finding 6 (DAI's operational cells)",
    "WE": "the per-product worked examples in the Supplementary Materials",
    "NEW": "the USYC offshore-comparator scoring (see the paper's caveat)",
    "NEW2": "the USD1 GENIUS-era comparator scoring (see the paper's caveat)",
    "NEW3": "the fourteen partial-evidence cells across USDC, USDT, USDG, PYUSD, DAI and JPMD, scored against primary documents and on-chain state",
    "NEW4": "the SoFiUSD insured-national-bank comparator scoring (2026-06-12)",
    "NEW5": "the RLUSD NYDFS-trust-charter comparator scoring",
    "JX": "derived from the Exhibit 2 Category 5 jurisdiction matrix under its scoring rules",
    "CP": "the coverage-completion scoring of previously unassessed operational, disclosure, collateral and recursive-settlement cells",
    "RWA": "grounded in the rwa.xyz platform snapshot of 2026-06-14",
}
# What a reader sees for each tag. The tags themselves are the replication data's keys and stay in the
# mirrored CSVs; on the page they were bare codes ("Source: NEW3, CP"), which read as noise (author,
# 2026-10-15). build() refuses a tag that has no label here, so a new tag cannot surface as a code.
TAG_LABELS = {
    "T2": "Table 4",
    "SUM": "Summary table",
    "F5": "Finding 5",
    "F6": "Finding 6",
    "WE": "Worked examples",
    "NEW": "USYC comparator",
    "NEW2": "USD1 comparator",
    "NEW3": "Partial-evidence cells",
    "NEW4": "SoFiUSD comparator",
    "NEW5": "RLUSD comparator",
    "JX": "Exhibit 2 jurisdictions",
    "CP": "Coverage completion",
    "RWA": "rwa.xyz snapshot",
}
CATEGORIES = [
    (1, "Rights Parity", True), (2, "System of Record", False), (3, "Records and Reconciliation", False),
    (4, "Custody and Customer Property", True), (5, "Insolvency Posture", True), (6, "Settlement Finality", True),
    (7, "Reorganization and Exception Handling", False), (8, "Governance and Change Control", True),
    (9, "Disclosures", True), (10, "Collateral Operability", False), ("CSA", "Cash Settlement Asset (companion test)", False),
]


def repo_root():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for cwd in (os.getcwd(), script_dir):
        try:
            out = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, cwd=cwd)
            if out.returncode == 0 and out.stdout.strip() and os.path.isfile(os.path.join(out.stdout.strip(), SCORECARD_CSV)):
                return out.stdout.strip()
        except Exception:
            pass
    return os.path.dirname(script_dir)


def esc(s):
    return html.escape("" if s is None else str(s), quote=False)


def attr(s):
    return html.escape("" if s is None else str(s), quote=True)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def region_bounds(lines, name):
    start_re = re.compile(r"^(?P<indent>\s*)<!--\s*mvep:" + re.escape(name) + r" START\b")
    end_re = re.compile(r"^\s*<!--\s*mvep:" + re.escape(name) + r" END\b")
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
        problems.append(f"{rel}: missing region mvep:{name}")
        return text
    start, end, indent = bounds
    new = [indent + START_TMPL.format(name=name)]
    new += [(indent + ln) if ln else "" for ln in body]
    new.append(indent + END_TMPL.format(name=name))
    return "\n".join(lines[:start] + new + lines[end + 1:])


# ----------------------------------------------------------------------------- data
def parse_scorecard(path):
    with open(path, encoding="utf-8", newline="") as fh:
        rows = list(csv.reader(fh))
    products = rows[0][1:]
    verdicts = {p: {} for p in products}
    for r in rows[1:]:
        label = r[0]
        if label == "__source__":
            continue
        m = re.match(r"\s*(\d+)\.", label)
        key = int(m.group(1)) if m else ("CSA" if "Cash Settlement" in label else label)
        for p, cell in zip(products, r[1:]):
            mm = re.match(r"\s*([A-Z_/]+)\s*(?:\[(.*?)\])?\s*$", cell)
            if not mm:
                raise ValueError(f"unreadable cell {cell!r} for {p} row {label}")
            verdict = mm.group(1)
            if verdict not in LADDER and verdict not in ("NA", "UNASSESSED"):
                raise ValueError(f"unknown verdict {verdict!r} for {p} row {label}")
            tags = [t.strip() for t in (mm.group(2) or "").split("/") if t.strip()]
            verdicts[p][key] = {"v": verdict, "tags": tags}
    return products, verdicts


def parse_rating(path):
    with open(path, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    return {r["product"]: r for r in rows}


def grade(verdicts, cats):
    floor_level, binding, levels = None, (None, None), []
    for c in cats:
        v = verdicts.get(c, {"v": "UNASSESSED"})["v"]
        if v not in LADDER:
            continue
        lvl = LADDER[v]
        levels.append(lvl)
        if floor_level is None or lvl < floor_level:
            floor_level, binding = lvl, (c, v)
    if floor_level is None:
        return "UNRATED", 0.0, None, None
    return TIER_FROM_LEVEL[floor_level], round(sum(levels) / len(levels), 1), binding[0], binding[1]


def cat_short(key):
    return {1: "Rights Parity", 2: "System of Record", 3: "Records & Reconciliation", 4: "Custody",
            5: "Insolvency Posture", 6: "Settlement Finality", 7: "Reorg & Exception Handling",
            8: "Governance & Change Control", 9: "Disclosures", 10: "Collateral Operability",
            "CSA": "Cash Settlement Asset"}.get(key, str(key))


def rate(verdicts):
    """The upstream rate(): tiers by floor, strength by mean rung, headline by weakest link."""
    dims, strengths, binds = {}, {}, {}
    for dname, cats in DIMENSIONS.items():
        tier, strength, bkey, bverdict = grade(verdicts, cats)
        dims[dname], strengths[dname], binds[dname] = tier, strength, (bkey, bverdict)
    inv = {v: k for k, v in TIER_FROM_LEVEL.items()}
    rated = {d: (inv[t], strengths[d]) for d, t in dims.items() if t != "UNRATED"}
    if rated:
        worst = min(rated, key=lambda d: rated[d])
        headline = dims[worst]
        bkey, bverdict = binds[worst]
        binding = f"{worst} / {cat_short(bkey)} {bverdict}"
    else:
        headline, binding = "UNRATED", "no coverage"
    keys = list(range(1, 11)) + ["CSA"]
    all_levels = [LADDER[verdicts[k]["v"]] for k in keys if k in verdicts and verdicts[k]["v"] in LADDER]
    overall = round(sum(all_levels) / len(all_levels), 1) if all_levels else 0.0
    disc = verdicts.get(DISCLOSURE_CATEGORY, {"v": "UNASSESSED"})["v"]
    applicable = sum(1 for k in keys if verdicts.get(k, {"v": "UNASSESSED"})["v"] != "NA")
    assessed = sum(1 for k in keys if verdicts.get(k, {"v": "UNASSESSED"})["v"] in LADDER)
    frac = assessed / applicable if applicable else 0.0
    band = "HIGH" if frac >= 0.8 else ("MEDIUM" if frac >= 0.5 else "LOW")
    return {"Legal": TIER_LABEL[dims["Legal"]], "Legal strength": strengths["Legal"],
            "Operational": TIER_LABEL[dims["Operational"]], "Operational strength": strengths["Operational"],
            "Economic": TIER_LABEL[dims["Economic"]], "Economic strength": strengths["Economic"],
            "Disclosure": DISCLOSURE_LABEL.get(disc, disc), "Headline": TIER_LABEL[headline],
            "Overall strength": overall, "Binding constraint": binding,
            "Coverage": f"{assessed}/{applicable}", "Confidence": band}


def check_consistency(products, verdicts, ratings, problems):
    cols = {"Legal": "Legal (gate)", "Legal strength": "Legal strength", "Operational": "Operational (gate)",
            "Operational strength": "Operational strength", "Economic": "Economic (gate)",
            "Economic strength": "Economic strength", "Disclosure": "Disclosure", "Headline": "Headline (gate)",
            "Overall strength": "Overall strength", "Binding constraint": "Binding constraint",
            "Coverage": "Coverage", "Confidence": "Confidence"}
    for p in products:
        if p not in ratings:
            problems.append(f"{RATING_CSV}: no rating record for {p}")
            continue
        got = rate(verdicts[p])
        for k, col in cols.items():
            want = ratings[p][col]
            have = got[k]
            if isinstance(have, float):
                same = abs(float(want) - have) < 0.051
            else:
                same = str(want).strip() == str(have).strip()
            if not same:
                problems.append(f"{RATING_CSV}: {p} {col} is {want!r} but Exhibit 1 re-derives {have!r}")


# ----------------------------------------------------------------------------- outputs
def build_json(products, verdicts, ratings):
    prods = []
    for p in products:
        r = ratings[p]
        prods.append({"key": p, "issuer": ISSUER.get(p, ""), "group": "comparator" if p in COMPARATORS else "sample",
                      "verdicts": {str(k): v for k, v in verdicts[p].items()},
                      "rating": {"legal": r["Legal (gate)"], "legal_strength": float(r["Legal strength"]),
                                 "operational": r["Operational (gate)"], "operational_strength": float(r["Operational strength"]),
                                 "economic": r["Economic (gate)"], "economic_strength": float(r["Economic strength"]),
                                 "disclosure": r["Disclosure"], "headline": r["Headline (gate)"],
                                 "overall_strength": float(r["Overall strength"]), "binding": r["Binding constraint"],
                                 "coverage": r["Coverage"], "confidence": r["Confidence"]}})
    data = {
        "source": {"paper": "Minimum Viable Equivalence Pack (MVEP), SSRN 6363138", "paper_url": "https://tokenization.systems/papers/mvep/",
                   "exhibits": "Exhibit 1 (scorecard) and Exhibit 3 (composite rating)",
                   "repository": "https://github.com/CryptoZach/mvep-replication", "mirror": "https://tokenization.systems/data/mvep/",
                   "mirrored_on": "2026-10-12"},
        "categories": [{"key": str(k), "name": n, "critical": c} for k, n, c in CATEGORIES],
        "verdicts": {k: {"label": VERDICT_LABEL[k], "meaning": VERDICT_MEANING[k]} for k in ["PASS", "PARTIAL", "AMBIGUOUS", "FAIL", "NOT_DISCLOSED", "UNASSESSED"]},
        "ladder": LADDER,
        "tiers": {str(k): TIER_LABEL[v] for k, v in TIER_FROM_LEVEL.items()},
        "dimensions": {k: [str(c) for c in v] for k, v in DIMENSIONS.items()},
        "disclosure_category": str(DISCLOSURE_CATEGORY),
        "disclosure_labels": DISCLOSURE_LABEL,
        "tags": TAGS,
        "tag_labels": TAG_LABELS,
        "products": prods,
    }
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return ['<script type="application/json" id="mvep-sc-data">' + text.replace("</", "<\\/") + "</script>"]


def build_table(products, verdicts, ratings):
    cls = {"PASS": "pass", "PARTIAL": "partial", "AMBIGUOUS": "ambiguous", "FAIL": "fail", "NOT_DISCLOSED": "nd", "UNASSESSED": "unassessed", "NA": "na"}
    out = ['<div class="mvep-sc__tablewrap" role="region" aria-label="Exhibit 1: verdicts by product" tabindex="0">',
           '  <table class="mvep-sc__table">',
           '    <caption>Exhibit 1: the paper\'s verdict for each product and category, with the source that locates it in the paper</caption>',
           "    <thead><tr><th scope=\"col\">Category</th>" + "".join(f'<th scope="col">{esc(p)}<br><small>{esc(ISSUER.get(p, ""))}</small></th>' for p in products) + "</tr></thead>",
           "    <tbody>"]
    for key, name, _crit in CATEGORIES:
        cells = []
        for p in products:
            cell = verdicts[p].get(key, {"v": "UNASSESSED", "tags": []})
            cells.append(f'<td><span class="mvep-v mvep-v--{cls[cell["v"]]}">{esc(VERDICT_LABEL[cell["v"]])}</span>'
                         + (f'<br><small>{esc(", ".join(TAG_LABELS.get(t, t) for t in cell["tags"]))}</small>' if cell["tags"] else "") + "</td>")
        label = f"{key}. {name}" if key != "CSA" else name
        out.append(f'      <tr><th scope="row">{esc(label)}</th>' + "".join(cells) + "</tr>")
    out += ["    </tbody>", "  </table>", "</div>",
            '<div class="mvep-sc__tablewrap" role="region" aria-label="Exhibit 3: composite rating by product" tabindex="0">',
            '  <table class="mvep-sc__table mvep-sc__table--rating">',
            "    <caption>Exhibit 3: the composite rating. Each dimension's tier is its weakest cell; the number is the mean rung (1.0 to 5.0) and orders products within a tier</caption>",
            '    <thead><tr><th scope="col">Product</th><th scope="col">Legal</th><th scope="col">Operational</th><th scope="col">Economic</th><th scope="col">Headline</th><th scope="col">Overall strength</th><th scope="col">Binds on</th><th scope="col">Disclosure</th></tr></thead>',
            "    <tbody>"]
    for p in sorted(products, key=lambda x: -float(ratings[x]["Overall strength"])):
        r = ratings[p]
        out.append(f'      <tr><th scope="row">{esc(p)}</th><td>{esc(r["Legal (gate)"])} ({esc(r["Legal strength"])})</td>'
                   f'<td>{esc(r["Operational (gate)"])} ({esc(r["Operational strength"])})</td>'
                   f'<td>{esc(r["Economic (gate)"])} ({esc(r["Economic strength"])})</td><td>{esc(r["Headline (gate)"])}</td>'
                   f'<td>{esc(r["Overall strength"])}</td><td>{esc(r["Binding constraint"])}</td><td>{esc(r["Disclosure"])}</td></tr>')
    out += ["    </tbody>", "  </table>", "</div>"]
    return out


def build(root):
    problems = []
    products, verdicts = parse_scorecard(os.path.join(root, SCORECARD_CSV))
    ratings = parse_rating(os.path.join(root, RATING_CSV))
    check_consistency(products, verdicts, ratings, problems)
    unlabeled = sorted({t for p in products for c in verdicts[p].values() for t in c["tags"]} - set(TAG_LABELS))
    if unlabeled:
        problems.append(f"{SCORECARD_CSV}: source tag(s) {', '.join(unlabeled)} have no reader label in TAG_LABELS")
    page_path = os.path.join(root, PAGE_REL)
    outputs = {}
    if os.path.isfile(page_path):
        text = read(page_path)
        text = stamp(text, "data", build_json(products, verdicts, ratings), problems, PAGE_REL)
        text = stamp(text, "table", build_table(products, verdicts, ratings), problems, PAGE_REL)
        outputs[PAGE_REL] = text
    else:
        problems.append(f"{PAGE_REL}: missing")
    for rel, text in outputs.items():
        gen = "".join(re.findall(r"<!--\s*mvep:[\w-]+ START\b.*?<!--\s*mvep:[\w-]+ END\s*-->", text, flags=re.S))
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
        outputs, problems = build(root)
    except Exception as exc:
        print(f"render_mvep_scorecard: could not run: {exc}", file=sys.stderr)
        return 2
    if problems:
        for p in problems:
            print(f"render_mvep_scorecard: {p}", file=sys.stderr)
        return 1
    drift = [(rel, read(os.path.join(root, rel)), new) for rel, new in outputs.items() if read(os.path.join(root, rel)) != new]
    if args.write:
        for rel, _old, new in drift:
            with open(os.path.join(root, rel), "w", encoding="utf-8") as fh:
                fh.write(new)
            print(f"render_mvep_scorecard: wrote {rel}")
        if not drift and not args.quiet:
            print("render_mvep_scorecard: everything already up to date")
        return 0
    if drift:
        for rel, old, new in drift:
            print(f"render_mvep_scorecard: DRIFT in {rel}", file=sys.stderr)
            if not args.quiet:
                for i, line in enumerate(difflib.unified_diff(old.splitlines(), new.splitlines(), f"a/{rel}", f"b/{rel}", lineterm="", n=1)):
                    if i > 30:
                        print("   ...", file=sys.stderr)
                        break
                    print("   " + line, file=sys.stderr)
        print("render_mvep_scorecard: run `python3 scripts/render_mvep_scorecard.py --write`", file=sys.stderr)
        return 1
    if not args.quiet:
        print("render_mvep_scorecard: OK (frameworks page matches data/mvep/)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
