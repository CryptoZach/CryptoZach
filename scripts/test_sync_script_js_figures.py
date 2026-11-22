#!/usr/bin/env python3
"""test_sync_script_js_figures.py: script.js's fleet figures follow the agent page, and a stale one blocks the deploy.

WHY THIS EXISTS. script.js carried 68,000+ commits, 63,230 advisory firings, 14 typical and 61 peak concurrent
sessions and 79 commit-chart bins for weeks after the agent page had moved past them, because no tool read or wrote
them (found 2026-11-22). scripts/sync_script_js_figures.py now does both. These arms run it on copies of the served
files whose stamp and chart carry values no served page carries, so no arm can pass by reading today's figures back.
The wiring arms at the end read the deploy gate, the pre-push battery and the site tool, so removing the check from
any of them fails here.

Run: python3 scripts/test_sync_script_js_figures.py    (exit 0 when every arm passes)
Point it at another copy of the tool with SJF_UNDER_TEST=<path>.
"""
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TOOL = Path(os.environ.get("SJF_UNDER_TEST", str(HERE / "sync_script_js_figures.py")))
FILES = ("script.js", "agent-infrastructure/index.html", "agent-infrastructure/commits-per-3-days.json")

# Values no served page carries.
NEW_STAMP = {"commits-floored": "123000", "concurrency-p75": "21", "concurrency-peak": "64", "advisory-firings": "98765",
             "advisory-classes": "43", "hard-gate-deny": "31400", "hard-gate-bypass": "15"}
NEW_CHART = {"bins": 91, "series_1d": 271, "commits_in_series": 120321, "commits_on_ref": 123456,
             "start_date": "2026-03-02", "through": "27 November 2026"}


def load_tool():
    spec = importlib.util.spec_from_file_location("sjf_under_test", str(TOOL))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run(site: Path, *args: str):
    r = subprocess.run([sys.executable, str(TOOL), "--root", str(site), *args], capture_output=True, text=True,
                       timeout=120)
    return r.returncode, r.stdout + r.stderr


def make_site(tmp: Path, name: str) -> Path:
    site = tmp / name
    for rel in FILES:
        (site / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT / rel, site / rel)
    return site


def stamp_of(site: Path) -> dict:
    raw = (site / "agent-infrastructure" / "index.html").read_text(encoding="utf-8")
    return dict(re.findall(r'data-scale-([a-z0-9-]+)="([^"]*)"', raw))


def set_stamp(site: Path, values: dict, drop: str = "") -> None:
    p = site / "agent-infrastructure" / "index.html"
    t = p.read_text(encoding="utf-8")
    for k, v in values.items():
        t, n = re.subn(r'(data-scale-%s=")[^"]*(")' % re.escape(k), r"\g<1>%s\g<2>" % v, t)
        assert n == 1, k
    if drop:
        t, n = re.subn(r'\s+data-scale-%s="[^"]*"' % re.escape(drop), "", t)
        assert n == 1, drop
    p.write_text(t, encoding="utf-8")


def set_chart(site: Path, c: dict) -> None:
    p = site / "agent-infrastructure" / "commits-per-3-days.json"
    d = json.loads(p.read_text(encoding="utf-8"))
    d["bins"], d["series_1d"] = c["bins"], [0] * c["series_1d"]
    d["commits_in_series"], d["commits_on_ref"] = c["commits_in_series"], c["commits_on_ref"]
    d["start_date"], d["captions"]["through"] = c["start_date"], c["through"]
    p.write_text(json.dumps(d), encoding="utf-8")


def main() -> int:
    failures = []

    def check(name, ok, detail=""):
        print("%s  %s%s" % ("PASS" if ok else "FAIL", name, ("  (" + detail + ")") if detail and not ok else ""))
        if not ok:
            failures.append(name)

    mod = load_tool()
    tmp = Path(tempfile.mkdtemp(prefix="sjf_"))
    try:
        site = make_site(tmp, "site")
        js = site / "script.js"
        original = js.read_text(encoding="utf-8")
        old = mod.reference(site)

        rc, out = run(site, "--check")
        check("the served files agree today", rc == 0, out[-300:])

        set_stamp(site, NEW_STAMP)
        set_chart(site, NEW_CHART)
        rc, out = run(site, "--check")
        check("a moved stamp and chart are drift, and the check blocks", rc == 1, "rc=%d" % rc)
        missing = [what for what, _, _ in mod.FIGURES if what not in out]
        check("the drift names every figure shape", not missing, "; ".join(missing))
        check("the check wrote nothing", js.read_text(encoding="utf-8") == original)

        rc, out = run(site, "--quiet")
        check("with no mode flag it checks (the pre-push battery calls it with --quiet alone)", rc == 1, "rc=%d" % rc)

        rc, out = run(site, "--write")
        check("--write rewrites and then checks clean", rc == 0, out[-300:])
        rc, out = run(site, "--check")
        check("a check after the write passes", rc == 0, out[-300:])
        new = js.read_text(encoding="utf-8")

        def same_count(was: str, now: str):
            a, b = original.count(was), new.count(now)
            check("every %r became %r (%d of %d)" % (was, now, b, a), a > 0 and a == b and new.count(was) == 0)

        same_count(f"{old['commits']:,}+", "123,000+")
        same_count(f"{old['firings']:,} advisory firings", "98,765 advisory firings")
        same_count(f"{old['p75']} typical / {old['peak']} peak", "21 typical / 64 peak")
        same_count(f"{old['hold']}%", "99.95%")
        for want in ("fleet 123000 commits 31400 hard gates 98765 advisories",
                     "fleet-wide total now 98,765 across 43 classes",
                     "(91 3-Day Bins, 123,000+ Commits)",
                     "91 3d bins + 271 1d bins",
                     "120,321 commits in series (123,456 on ref) from March 2 through November 27, 2026",
                     "99.95%, 31,400 of 31,415 stopped",
                     "99.95% (31,400/31,415)",
                     "31,400 of 31,415 gate attempts refused",
                     "31,400 stopped of 31,415 attempts",
                     "31,400 hard-gate stops"):
            check("script.js carries %r" % want, want in new)

        rc, _ = run(site, "--write")
        check("a second write changes nothing", rc == 0 and js.read_text(encoding="utf-8") == new)

        set_stamp(site, {k: stamp_of(make_site(tmp, "orig"))[k] for k in NEW_STAMP})
        shutil.copy(ROOT / FILES[2], site / FILES[2])
        rc, _ = run(site, "--write")
        check("writing the original figures back restores script.js byte for byte (nothing else moved)",
              rc == 0 and js.read_text(encoding="utf-8") == original)

        check("the hold is floored, never rounded up", (mod.floor_pct(29999, 30000), mod.floor_pct(20729, 20776),
              mod.floor_pct(1, 3)) == ("99.99", "99.77", "33.33"))
        set_stamp(site, {"hard-gate-deny": "29999", "hard-gate-bypass": "1"})
        run(site, "--write")
        t = js.read_text(encoding="utf-8")
        check("29,999 stopped of 30,000 prints 99.99%, never 100.00%", "99.99%" in t and "100.00%" not in t)

        bent = make_site(tmp, "bent")
        (bent / "script.js").write_text(original.replace(" typical / ", " typical, "), encoding="utf-8")
        rc, out = run(bent, "--check")
        check("a reworded shape reads UNCHECKED and blocks, never a pass",
              rc == 1 and "UNCHECKED typical and peak concurrent sessions" in out, out[-300:])

        gone = make_site(tmp, "gone")
        set_stamp(gone, {}, drop="concurrency-peak")
        rc, out = run(gone, "--write")
        check("a stamp without a figure blocks and names it", rc == 1 and "data-scale-concurrency-peak" in out,
              out[-300:])
        check("and the write leaves script.js alone", (gone / "script.js").read_text(encoding="utf-8") == original)

        (gone / FILES[2]).unlink()
        rc, _ = run(gone, "--check")
        check("an unreadable input warns (exit 2) rather than pass", rc == 2, "rc=%d" % rc)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    deploy = (ROOT / ".github" / "workflows" / "build-deploy.yml").read_text(encoding="utf-8")
    check("the deploy gate runs the check", re.search(r"^\s*run_check scripts/sync_script_js_figures\.py\b", deploy, re.M)
          is not None)
    check("the deploy gate runs these arms", "run_check scripts/test_sync_script_js_figures.py" in deploy)
    prepush = (ROOT / "scripts" / "hooks" / "pre-push").read_text(encoding="utf-8")
    check("the pre-push battery runs the check",
          re.search(r"^\s*for g in [^\n]*\bsync_script_js_figures\.py\b", prepush, re.M) is not None)
    usm = (ROOT / "scripts" / "update_site_metrics.py").read_text(encoding="utf-8")
    check("the site tool's write pipeline rewrites script.js and checks it",
          'sjf.main(["--write"' in usm and '"scripts/sync_script_js_figures.py", "--check"' in usm)

    print("%d failed" % len(failures) if failures else "all arms passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
