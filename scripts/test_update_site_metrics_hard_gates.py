#!/usr/bin/env python3
"""test_update_site_metrics_hard_gates.py: the hard-gate figures come from the fleet producer or not at all.

WHY THIS EXISTS. scripts/update_site_metrics.py once counted the fleet's hard-gate log rows itself. That raw count
published 312 refusals and 16 overrides that a test harness wrote (the page carried 20,448 of 20,510 with 62 overrides
through 2026-11-19, where the figure net of harness rows is 20,136 of 20,182 with 46). With only one host's table it
fell back to reading the page's own figures, so --check compared the page with itself and reported no drift. It now
reads `advisory_effectiveness_fleet.py refusals --through <last closed UTC day> --json` from the workflow repo, and
when that producer refuses, the measurement is a refusal too.

These arms run the tool against a FAKE workflow repo whose producer prints what each arm needs, so they run in CI with
no fleet. The measurement arms fail on the pre-fix tool (there was no refusal source, the raw counter read the host's
own log, and a missing peer came back as site_fallback). The write-half arms test behaviour the old tool already had,
and pass on it by design. The fake producer's day is one no served page carries, so no arm can pass by reading the
page back.

Run: python3 scripts/test_update_site_metrics_hard_gates.py    (exit 0 when every arm passes)
Point it at another copy of the tool with USM_UNDER_TEST=<path>.
"""
import datetime as dt
import importlib.util
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TOOL = Path(os.environ.get("USM_UNDER_TEST", str(HERE / "update_site_metrics.py")))

GOOD = {
    "v": 1, "through": "2030-01-31", "refused": 90, "overridden": 10, "attempts": 100, "override_rate": 0.1,
    "raw": {"refused": 95, "overridden": 12}, "harness": {"refused": 5, "overridden": 2},
    "ambiguous": {"refused": 3, "overridden": 1},
    "classes": [{"class": "a", "refused": 60, "overridden": 5}, {"class": "b", "refused": 20, "overridden": 4},
                {"class": "c", "refused": 10, "overridden": 1}],
    "hosts": [{"host": "Zachs-MacBook-Pro"}, {"host": "pop-os"}],
}

PRODUCER = r'''#!/usr/bin/env python3
import json, os, sys
open(os.environ["FAKE_ARGV_LOG"], "a").write(json.dumps(sys.argv[1:]) + "\n")
mode = os.environ["FAKE_MODE"]
if mode == "refuse":
    sys.stderr.write("refusals: pop-os table is 61.2 h old (bound 48 h)\n"); sys.exit(3)
if mode == "garbage":
    print("not json"); sys.exit(0)
doc = json.loads(os.environ["FAKE_DOC"])
print(json.dumps(doc))
'''


def load_tool(wf_repo: Path):
    os.environ["CZ_WORKFLOW_REPO"] = str(wf_repo)
    spec = importlib.util.spec_from_file_location("usm_under_test_%d" % len(sys.modules), str(TOOL))
    mod = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(ROOT / "scripts"))
    spec.loader.exec_module(mod)
    return mod


def fake_repo(tmp: Path) -> Path:
    wf = tmp / "wf"
    (wf / "scripts").mkdir(parents=True)
    (wf / "scripts" / "advisory_effectiveness_fleet.py").write_text(PRODUCER, encoding="utf-8")
    return wf


def measure(mod, mode, doc=None, through="2030-01-31"):
    os.environ["FAKE_MODE"] = mode
    os.environ["FAKE_DOC"] = json.dumps(doc if doc is not None else GOOD)
    try:
        return mod.measure_hard_gates(through=through)
    except TypeError:
        # The pre-fix signature took cutoff_date positionally. Call it that way, so a control run grades what the old
        # measurement RETURNS (site_fallback, the page's own figures) rather than failing on the signature alone.
        return mod.measure_hard_gates(through)


def main() -> int:
    failures = []

    def check(name, ok, detail=""):
        print("%s  %s%s" % ("PASS" if ok else "FAIL", name, ("  (" + detail + ")") if detail and not ok else ""))
        if not ok:
            failures.append(name)

    tmp = Path(tempfile.mkdtemp(prefix="usm_hard_gates_"))
    try:
        wf = fake_repo(tmp)
        argv_log = tmp / "argv.jsonl"
        os.environ["FAKE_ARGV_LOG"] = str(argv_log)
        # An empty HOME, so a pre-fix tool's raw counter finds no host log of its own to count.
        os.environ["HOME"] = str(tmp / "home")
        (tmp / "home").mkdir()
        mod = load_tool(wf)

        g = measure(mod, "good")
        check("a producer figure is read as the measurement", g.get("source") == "fleet_producer", str(g.get("source")))
        check("refused, overridden and attempts map through",
              (g.get("stopped"), g.get("overridden"), g.get("attempts")) == (90, 10, 100), str(g)[:200])
        check("the class count is the producer's", g.get("armed_classes") == 3, str(g.get("armed_classes")))
        check("the cutoff is the producer's through day", g.get("cutoff_date") == "2030-01-31", str(g.get("cutoff_date")))
        check("the harness rows ride beside the figure", g.get("harness") == {"refused": 5, "overridden": 2})
        calls = [json.loads(x) for x in argv_log.read_text().splitlines()] if argv_log.exists() else []
        check("the producer is asked for refusals through the day, as JSON",
              bool(calls) and calls[-1] == ["refusals", "--through", "2030-01-31", "--json"], str(calls[-1:]))

        r = measure(mod, "refuse")
        check("a producer refusal is a refusal, not the page's figures", r.get("source") == "refused", str(r.get("source")))
        check("the refusal carries the producer's reason", "61.2 h old" in str(r.get("reason", "")), str(r.get("reason")))
        check("no refusal reads as site_fallback", r.get("source") != "site_fallback")
        live = getattr(mod, "hard_gate_live_text", lambda x: "")(r)
        check("the report shows a refusal as UNMEASURED", live.startswith("UNMEASURED"), live[:80])

        bad = dict(GOOD, attempts=101)
        check("attempts that are not refused plus overridden are refused",
              measure(mod, "good", doc=bad).get("source") == "refused")
        check("unreadable producer output is refused", measure(mod, "garbage").get("source") == "refused")

        if hasattr(mod, "last_closed_utc_day"):
            now = dt.datetime(2026, 11, 22, 0, 30, tzinfo=dt.timezone.utc)
            check("the last closed UTC day is yesterday", mod.last_closed_utc_day(now) == "2026-11-21")
        else:
            check("the last closed UTC day is yesterday", False, "no last_closed_utc_day")

        # The write half: on copies of the three served pages, every surface takes the same figure.
        site = tmp / "site"
        for rel in ("index.html", "agent-infrastructure/index.html", "frameworks/index.html"):
            (site / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(ROOT / rel, site / rel)
        mod.ROOT = site
        # Figures no served page carries, so the write must change every page whatever the pages hold today.
        gate = dict(g, attempts=31415, stopped=31400, overridden=15, armed_classes=17, bar_pct=99.95,
                    cutoff_date="2031-04-15")
        changed = mod.apply_hard_gate_updates(gate)
        back = mod.read_site_hard_gates()
        check("every hard-gate surface takes the figure",
              (back["attempts"], back["stopped"], back["overridden"]) == (31415, 31400, 15), str(back))
        check("the homepage and frameworks sentences agree with the page", back["home_agree"] and back["fw_agree"],
              str(back))
        ai = (site / "agent-infrastructure/index.html").read_text(encoding="utf-8")
        check("the attempts row names the producer's class count", "across the 17 classes that carry one" in ai)
        check("the three pages were written", sorted(changed) == sorted(
            ["index.html", "agent-infrastructure/index.html", "frameworks/index.html"]), str(changed))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("%d failed" % len(failures) if failures else "all arms passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
