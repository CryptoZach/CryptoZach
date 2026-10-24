#!/usr/bin/env python3
"""update_site_metrics.py: automated metrics reporting and site updating for tokenization.systems.

Collects live measurements across the fleet and research registries, compares them against
every served HTML page, JSON dataset, and shipped resume in the repository, prints a
structured status report (or JSON), and optionally updates all site surfaces in place.

Metrics tracked and synchronized:
  1. Fleet commits & 3-day/1-day interactive chart (`agent-infrastructure/commits-per-3-days.*`,
     `agent-infrastructure/index.html`, `resume/**/index.html`, `README.md`, `sitemap.xml`)
  2. Fleet advisory warnings (`advisory_firings`, `advisory_classes`, `advisory_span_days`
     summed across both fleet hosts on `agent-infrastructure/index.html` and `resume/**/index.html`)
  3. Fleet hard-gate refusals & overrides (`attempts`, `stopped`, `overridden`, `armed_classes`,
     progress-bar width, and measurement dates across `index.html`, `agent-infrastructure/index.html`,
     and `frameworks/index.html`)
  4. USPTO patent portfolio (`41` applications across `31` families and `6` problem areas on
     `patents/index.html`, `patents/patents.json`, `index.html`, `resume/**/index.html`)
  5. Federal comment letters, dockets, agencies & recommendations (`letters/**`,
     `trackers/genius-act/**`, `scripts/letters_registry.json`, and all site count mentions)
  6. Published SSRN papers (`9` papers across `papers/**/index.html`) & Notes (`notes/**`)
  7. Homepage hero stats (`scripts/program_stats.json` -> `index.html`)

Usage:
  python3 scripts/update_site_metrics.py                  # Print live metrics & drift report
  python3 scripts/update_site_metrics.py --json           # Emit machine-readable JSON report
  python3 scripts/update_site_metrics.py --check          # Exit 1 if any surface has drifted
  python3 scripts/update_site_metrics.py --write          # Update all site surfaces & verify
  python3 scripts/update_site_metrics.py --write --sync-fleet   # Sync peer host over SSH first
  python3 scripts/update_site_metrics.py --write --with-resumes # Also refresh shipped DOCX/PDFs
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import socket
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WF_REPO = Path(os.environ.get("CZ_WORKFLOW_REPO", "/Users/zach/Tokenization_Systems_Website"))
STATE_DIR = Path(os.path.expanduser(os.environ.get("CZ_STATE_DIR", "~/.local/state/cryptozach")))
ADV_STORE = STATE_DIR / "advisory_host_tables"
GATE_STORE = STATE_DIR / "hard_gate_host_tables"

MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

sys.path.insert(0, str(ROOT / "scripts"))
import check_letter_count as clc  # noqa: E402
import check_paper_count as cpc  # noqa: E402
import check_patent_count as cpat  # noqa: E402
import check_scale_figures as csf  # noqa: E402
import render_commit_chart as rcc  # noqa: E402


def fmt_human_date(iso_date: str) -> str:
    d = dt.date.fromisoformat(iso_date[:10])
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}"


def scan_jsonl_hard_gates(lines, cutoff_iso: str) -> dict:
    """Count raw deny and bypassed events in a hook fire log up to cutoff_iso."""
    cutoff_prefix = cutoff_iso[:10] + "T23:59:59Z"
    deny = bypassed = 0
    per_class = {}
    last_ts = ""
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        ts = str(r.get("ts") or "")
        if ts and ts > cutoff_prefix:
            continue
        if ts > last_ts:
            last_ts = ts
        mode = r.get("mode")
        cls = str(r.get("class") or "?")
        if mode == "deny":
            deny += 1
            row = per_class.setdefault(cls, {"deny": 0, "bypassed": 0})
            row["deny"] += 1
        elif mode == "bypassed":
            bypassed += 1
            row = per_class.setdefault(cls, {"deny": 0, "bypassed": 0})
            row["bypassed"] += 1
    return {
        "cutoff_date": cutoff_iso[:10],
        "last_ts": last_ts,
        "deny": deny,
        "bypassed": bypassed,
        "attempts": deny + bypassed,
        "classes": per_class,
    }


def measure_hard_gates(cutoff_date: str, sync_ssh: bool = False) -> dict:
    """Measure hard-gate attempts, refusals, and overrides across both fleet machines."""
    try:
        GATE_STORE.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass
    me = socket.gethostname().split(".")[0]
    local_log = Path(os.path.expanduser("~/.claude/cz_destructive_git_fires.jsonl"))

    hosts_data = {}
    if local_log.is_file():
        local_stats = scan_jsonl_hard_gates(
            local_log.read_text(encoding="utf-8", errors="replace").splitlines(),
            cutoff_date,
        )
        local_stats["host"] = me
        hosts_data[me] = local_stats
        try:
            (GATE_STORE / f"{me}.json").write_text(json.dumps(local_stats, indent=2) + "\n", encoding="utf-8")
        except OSError:
            pass

    peer = "pop-os" if me != "pop-os" else "Zachs-MacBook-Pro"
    peer_cache = GATE_STORE / f"{peer}.json"
    need_ssh = sync_ssh or not peer_cache.is_file()
    if peer_cache.is_file() and not sync_ssh:
        try:
            cached = json.loads(peer_cache.read_text(encoding="utf-8"))
            if cached.get("cutoff_date") == cutoff_date[:10]:
                hosts_data[peer] = cached
            else:
                need_ssh = True
        except Exception:
            need_ssh = True

    if need_ssh:
        try:
            remote_py = (
                "import json, os, sys; "
                f"cut = {json.dumps(cutoff_date[:10] + 'T23:59:59Z')}; "
                "d = b = 0; cls = {}; last = ''; "
                "f = open(os.path.expanduser('~/.claude/cz_destructive_git_fires.jsonl'), errors='replace'); "
                "[\n"
                "  None for l in f for r in ([json.loads(l)] if l.strip().startswith('{') else []) "
                "  if str(r.get('ts','')) <= cut and ("
                "    cls.setdefault(r.get('class','?'), {'deny':0,'bypassed':0}).__setitem__(r.get('mode'), "
                "    cls.get(r.get('class','?'), {'deny':0,'bypassed':0}).get(r.get('mode'),0)+1) "
                "    if r.get('mode') in ('deny','bypassed') else None"
                "  )\n"
                "]; "
                "d = sum(v['deny'] for v in cls.values()); "
                "b = sum(v['bypassed'] for v in cls.values()); "
                f"print(json.dumps({{'host':{json.dumps(peer)},'cutoff_date':{json.dumps(cutoff_date[:10])},'deny':d,'bypassed':b,'attempts':d+b,'classes':cls}}))"
            )
            p = subprocess.run(
                ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", peer, f"python3 -c {json.dumps(remote_py)}"],
                capture_output=True, text=True, timeout=25,
            )
            if p.returncode == 0 and p.stdout.strip():
                peer_stats = json.loads(p.stdout.strip().splitlines()[-1])
                hosts_data[peer] = peer_stats
                try:
                    peer_cache.write_text(json.dumps(peer_stats, indent=2) + "\n", encoding="utf-8")
                except OSError:
                    pass
        except Exception:
            if peer_cache.is_file():
                try:
                    hosts_data[peer] = json.loads(peer_cache.read_text(encoding="utf-8"))
                except Exception:
                    pass

    if len(hosts_data) == 2:
        combined_classes = {}
        for hdoc in hosts_data.values():
            for c, counts in (hdoc.get("classes") or {}).items():
                row = combined_classes.setdefault(c, {"deny": 0, "bypassed": 0})
                row["deny"] += counts.get("deny", 0)
                row["bypassed"] += counts.get("bypassed", 0)
        stopped = sum(v["deny"] for v in combined_classes.values())
        overridden = sum(v["bypassed"] for v in combined_classes.values())
        attempts = stopped + overridden
        return {
            "source": "fleet_logs",
            "cutoff_date": cutoff_date[:10],
            "attempts": attempts,
            "stopped": stopped,
            "overridden": overridden,
            "armed_classes": len(combined_classes),
            "bar_pct": round(stopped / attempts * 100.0, 1) if attempts else 0.0,
            "hosts": hosts_data,
        }

    # Fallback to current page values when offline / CI without fleet logs
    site_gate = read_site_hard_gates()
    return {
        "source": "site_fallback",
        "cutoff_date": site_gate["date_iso"],
        "attempts": site_gate["attempts"],
        "stopped": site_gate["stopped"],
        "overridden": site_gate["overridden"],
        "armed_classes": 12,
        "bar_pct": round(site_gate["stopped"] / site_gate["attempts"] * 100.0, 1) if site_gate["attempts"] else 99.6,
        "hosts": hosts_data,
    }


def read_site_hard_gates() -> dict:
    ai_raw = (ROOT / "agent-infrastructure" / "index.html").read_text(encoding="utf-8")
    home_raw = (ROOT / "index.html").read_text(encoding="utf-8")
    fw_raw = (ROOT / "frameworks" / "index.html").read_text(encoding="utf-8")

    m_ai = re.search(
        r'ai-metric-value">\s*(\d[\d,]*)\s*</p>\s*<p class="ai-metric-label">Actions reached a hard gate</p>\s*<p class="ai-metric-was">\s*(\d[\d,]*)\s+stopped;\s+(\d[\d,]*)\s+overridden',
        ai_raw, re.I,
    )
    m_date = re.search(
        r"Hard refusals</th><td class=\"ai-val\">\d[\d,]*</td><td class=\"ai-how\">[^<]*?through\s+(\d{4}-\d{2}-\d{2})",
        ai_raw, re.I,
    )
    m_home = re.search(
        r"Across\s+(\d[\d,]*)\s+measured\s+attempts[^.]*?through\s+(\d+\s+[A-Za-z]+\s+\d{4}),\s+the\s+system\s+(?:stopped|refused)\s+the\s+action\s+in\s+(\d[\d,]*)\s+cases\.\s*In\s+the\s+other\s+(\d[\d,]*)",
        home_raw, re.I | re.S,
    )
    m_fw = re.search(
        r"armed\s+hard\s+gates\s+refused\s+the\s+prohibited\s+action\s+\d+\s+times\s+in\s+\d+\s*\(\s*(\d[\d,]*)\s+of\s+(\d[\d,]*)\s+attempts",
        fw_raw, re.I,
    )
    attempts = int(m_ai.group(1).replace(",", "")) if m_ai else 0
    stopped = int(m_ai.group(2).replace(",", "")) if m_ai else 0
    overridden = int(m_ai.group(3).replace(",", "")) if m_ai else 0
    home_attempts = int(m_home.group(1).replace(",", "")) if m_home else 0
    home_stopped = int(m_home.group(3).replace(",", "")) if m_home else 0
    home_overridden = int(m_home.group(4).replace(",", "")) if m_home else 0
    fw_stopped = int(m_fw.group(1).replace(",", "")) if m_fw else 0
    fw_attempts = int(m_fw.group(2).replace(",", "")) if m_fw else 0

    return {
        "attempts": attempts,
        "stopped": stopped,
        "overridden": overridden,
        "date_iso": m_date.group(1) if m_date else "2026-10-23",
        "home_agree": (home_attempts, home_stopped, home_overridden) == (attempts, stopped, overridden),
        "fw_agree": (fw_attempts, fw_stopped) == (attempts, stopped),
    }


def measure_advisory_fleet(sync_ssh: bool = False) -> dict:
    """Read fleet advisory firings, classes, and span days from advisory_effectiveness_fleet.py."""
    fleet_script = WF_REPO / "scripts" / "advisory_effectiveness_fleet.py"
    if fleet_script.is_file():
        if sync_ssh:
            subprocess.run(
                [sys.executable, str(fleet_script), "sync"],
                cwd=str(WF_REPO), capture_output=True, text=True, timeout=180,
            )
        flag_order = (
            [["--json"], ["--stored-only", "--max-age-hours", "720", "--json"]]
            if sync_ssh
            else [["--stored-only", "--max-age-hours", "720", "--json"], ["--json"]]
        )
        for flags in flag_order:
            p = subprocess.run(
                [sys.executable, str(fleet_script)] + flags,
                cwd=str(WF_REPO), capture_output=True, text=True, timeout=120,
            )
            if p.returncode == 0 and p.stdout.strip():
                doc = json.loads(p.stdout)
                rows = int(doc["rows"])
                classes = len(doc["classes"])
                span_days = int(float(doc["span_days"]))
                last_ts = str(doc.get("last_ts") or "")[:10]
                return {
                    "source": "fleet_tables",
                    "firings": rows,
                    "firings_floor": (rows // 1000) * 1000,
                    "classes": classes,
                    "span_days": span_days,
                    "last_date": last_ts or dt.date.today().isoformat(),
                }
    ai_raw = (ROOT / "agent-infrastructure" / "index.html").read_text(encoding="utf-8")
    stamp = dict(re.findall(r'data-scale-([a-z0-9-]+)="([^"]*)"', ai_raw))
    firings = int(stamp.get("advisory-firings", "61805"))
    return {
        "source": "site_stamp",
        "firings": firings,
        "firings_floor": (firings // 1000) * 1000,
        "classes": int(stamp.get("advisory-classes", "37")),
        "span_days": int(stamp.get("advisory-span-days", "105")),
        "last_date": "2026-10-23",
    }


def apply_hard_gate_updates(gate: dict) -> list[str]:
    """Update hard-gate refusal numbers and dates across index.html, agent-infrastructure/index.html, and frameworks/index.html."""
    changed = []
    attempts_s = f"{gate['attempts']:,}"
    stopped_s = f"{gate['stopped']:,}"
    overridden_s = f"{gate['overridden']:,}"
    bar_s = f"{gate['bar_pct']:.1f}%"
    date_iso = gate["cutoff_date"]
    date_human = fmt_human_date(date_iso)

    # 1. index.html
    home_path = ROOT / "index.html"
    home_orig = home_path.read_text(encoding="utf-8")
    home_new = re.sub(
        r'(<div class="plate plate--bolted readout">\s*<div class="num">)\d[\d,]*<i>\s*/\s*\d[\d,]*</i>(</div>\s*<div class="meta">\s*<span class="label">[^<]+</span>\s*<div class="bar"><i style="width:)[0-9.]+%("></i></div>)',
        rf"\g<1>{stopped_s}<i> / {attempts_s}</i>\g<2>{bar_s}\g<3>",
        home_orig,
    )
    home_new = re.sub(
        r"(Across\s+)\d[\d,]*(\s+measured\s+attempts\s+that\s+reached\s+one\s+of\s+these\s+gates\s+on\s+both\s+of\s+the\s+fleet's\s+machines,\s+through\s+)\d+\s+[A-Za-z]+\s+\d{4}(,\s+the\s+system\s+(?:stopped|refused)\s+the\s+action\s+in\s+)\d[\d,]*(\s+cases\.\s*In\s+the\s+other\s+)\d[\d,]*(,\s+the\s+agent\s+used\s+the\s+documented\s+override)",
        rf"\g<1>{attempts_s}\g<2>{date_human}\g<3>{stopped_s}\g<4>{overridden_s}\g<5>",
        home_new,
    )
    if home_new != home_orig:
        home_path.write_text(home_new, encoding="utf-8")
        changed.append("index.html")

    # 2. agent-infrastructure/index.html
    ai_path = ROOT / "agent-infrastructure" / "index.html"
    ai_orig = ai_path.read_text(encoding="utf-8")
    ai_new = re.sub(
        r'(<p class="ai-metric-value">)\d[\d,]*(</p>\s*<p class="ai-metric-label">Actions reached a hard gate</p>\s*<p class="ai-metric-was">)\d[\d,]*(\s+stopped;\s+)\d[\d,]*(\s+overridden</p>)',
        rf"\g<1>{attempts_s}\g<2>{stopped_s}\g<3>{overridden_s}\g<4>",
        ai_orig,
    )
    ai_new = re.sub(
        r"(the hard-gate figures are from )\d{4}-\d{2}-\d{2}",
        rf"\g<1>{date_iso}",
        ai_new,
    )
    ai_new = re.sub(
        r"(the hard-refusal row was measured )\d{4}-\d{2}-\d{2}( over both machines)",
        rf"\g<1>{date_iso}\g<2>",
        ai_new,
    )
    ai_new = re.sub(
        r'(<tr><th scope="row">Hard refusals</th><td class="ai-val">)\d[\d,]*(</td><td class="ai-how">Calls that reached an armed gate across the \d+ classes that carry one, on both of the fleet\'s machines, through )\d{4}-\d{2}-\d{2}(\.\s*)\d[\d,]*(\s+refused,\s+)\d[\d,]*(\s+overridden with the documented escape)',
        rf"\g<1>{attempts_s}\g<2>{date_iso}\g<3>{stopped_s}\g<4>{overridden_s}\g<5>",
        ai_new,
    )
    ai_new = re.sub(
        r'(<p class="ai-callout-stat">)\d[\d,]*\s+of\s+\d[\d,]*(</p>\s*<p>actions stopped at a hard gate, on both of the fleet\'s machines through )\d+\s+[A-Za-z]+\s+\d{4}(\.\s*In the other )\d[\d,]*(\s+cases,\s+the agent used the documented override)',
        rf"\g<1>{stopped_s} of {attempts_s}\g<2>{date_human}\g<3>{overridden_s}\g<4>",
        ai_new,
    )
    ai_new = re.sub(
        r"(The figure above it was measured on )\d{4}-\d{2}-\d{2}( over both of the fleet's machines and twelve gate classes:\s*)\d[\d,]*(\s+blocked,\s+)\d[\d,]*(\s+overrides\.)",
        rf"\g<1>{date_iso}\g<2>{stopped_s}\g<3>{overridden_s}\g<4>",
        ai_new,
    )
    ai_new = re.sub(
        r'(armed hard gates that refused the prohibited action <a href="#armed">\d+ times in \d+</a> \()\d[\d,]*(\s+of\s+)\d[\d,]*(\s+attempts across both machines through )\d+\s+[A-Za-z]+\s+\d{4}(\))',
        rf"\g<1>{stopped_s}\g<2>{attempts_s}\g<3>{date_human}\g<4>",
        ai_new,
    )
    if ai_new != ai_orig:
        ai_path.write_text(ai_new, encoding="utf-8")
        changed.append("agent-infrastructure/index.html")

    # 3. frameworks/index.html
    fw_path = ROOT / "frameworks" / "index.html"
    fw_orig = fw_path.read_text(encoding="utf-8")
    fw_new = re.sub(
        r"(armed hard gates refused the prohibited action \d+ times in \d+ \()\d[\d,]*(\s+of\s+)\d[\d,]*(\s+attempts across both machines\))",
        rf"\g<1>{stopped_s}\g<2>{attempts_s}\g<3>",
        fw_orig,
    )
    if fw_new != fw_orig:
        fw_path.write_text(fw_new, encoding="utf-8")
        changed.append("frameworks/index.html")

    return changed


def collect_report(refresh_commits: bool = False, sync_ssh: bool = False) -> dict:
    """Gather all live and site metrics into a single dictionary."""
    # 1. Commit chart & commits
    chart_doc, _ = rcc.load_or_refresh_data(WF_REPO, "origin/main", refresh_commits)
    commits_on_ref = int(chart_doc["commits_on_ref"])
    commits_floored = (commits_on_ref // 1000) * 1000

    # 2. Advisory fleet metrics
    adv = measure_advisory_fleet(sync_ssh=sync_ssh)

    # 3. Hard-gate metrics (bounded through the advisory / commit chart date so dates stay coherent)
    cutoff_date = adv.get("last_date") or dt.date.today().isoformat()
    gate_live = measure_hard_gates(cutoff_date=cutoff_date, sync_ssh=sync_ssh)
    gate_site = read_site_hard_gates()

    # 4. Shipped resume reference figures & site scale comparison
    resume_ref, resume_problems = csf.resume_reference(ROOT / "resumes")
    scale_disagree, _ = csf.compare(ROOT, resume_ref)

    # 5. Patents, Letters, Papers, Hero stats
    pat_truth = cpat.derive_patent_truth((ROOT / "patents" / "index.html").read_text(encoding="utf-8"))
    pat_n = pat_truth["n_apps"] if pat_truth else 0
    pat_f = pat_truth["n_families"] if pat_truth else 0
    pat_areas = pat_truth["areas"] if pat_truth else []
    let_stats = clc.derive_program_stats(str(ROOT))
    paper_n, paper_map = cpc.derive_n(str(ROOT))
    home_stats = json.loads((ROOT / "scripts" / "program_stats.json").read_text(encoding="utf-8")).get("home_stats", [])
    notes_doc = json.loads((ROOT / "scripts" / "notes_registry.json").read_text(encoding="utf-8"))

    metrics = [
        {
            "key": "commits_floored",
            "label": "Commits on origin/main (floored)",
            "live": f"{commits_floored:,}+ ({commits_on_ref:,} exact)",
            "site": f"{resume_ref.get('commits', 0):,}+",
            "ok": commits_floored == resume_ref.get("commits") and not any("commits" in d for d in scale_disagree),
        },
        {
            "key": "commit_chart_bins",
            "label": "Commit chart 3-day bins",
            "live": f"{chart_doc['bins']} bins through {chart_doc['captions']['through']} ({chart_doc['commits_in_series']:,} in series, peak {chart_doc['captions']['peak_value']:,})",
            "site": f"{chart_doc['bins']} bins",
            "ok": rcc.main(["--check", "--quiet"]) == 0,
        },
        {
            "key": "advisory_firings",
            "label": "Advisory warnings (both machines)",
            "live": f"{adv['firings']:,} (floor {adv['firings_floor']:,}, {adv['classes']} classes, {adv['span_days']}d)",
            "site": f"floor {resume_ref.get('advisory', 0):,} ({resume_ref.get('advisory_classes', 0)} classes)",
            "ok": adv["firings_floor"] == resume_ref.get("advisory")
            and adv["classes"] == resume_ref.get("advisory_classes")
            and not any("advisory" in d or "warning" in d for d in scale_disagree),
        },
        {
            "key": "hard_gates",
            "label": "Hard-gate refusals (both machines)",
            "live": f"{gate_live['stopped']:,} / {gate_live['attempts']:,} ({gate_live['overridden']} overridden, {gate_live['bar_pct']:.1f}%, through {gate_live['cutoff_date']})",
            "site": f"{gate_site['stopped']:,} / {gate_site['attempts']:,} ({gate_site['overridden']} overridden, through {gate_site['date_iso']})",
            "ok": (
                gate_live["attempts"] == gate_site["attempts"]
                and gate_live["stopped"] == gate_site["stopped"]
                and gate_live["overridden"] == gate_site["overridden"]
                and gate_site["home_agree"]
                and gate_site["fw_agree"]
            ),
        },
        {
            "key": "patents",
            "label": "USPTO patent portfolio",
            "live": f"{pat_n} applications across {pat_f} families ({len(pat_areas)} areas)",
            "site": f"{resume_ref.get('applications', 0)} applications across {resume_ref.get('families', 0)} families",
            "ok": pat_n == resume_ref.get("applications") and pat_f == resume_ref.get("families"),
        },
        {
            "key": "letters",
            "label": "Federal comment letters & recs",
            "live": f"{let_stats['n']} letters, {let_stats['dockets']} dockets, {let_stats['agencies']} agencies, {let_stats['recommendations']} recs",
            "site": f"{resume_ref.get('letters', 0)} letters",
            "ok": let_stats["n"] == resume_ref.get("letters"),
        },
        {
            "key": "papers_and_notes",
            "label": "Published SSRN papers & notes",
            "live": f"{paper_n} SSRN papers, {len(notes_doc.get('notes', []))} notes",
            "site": f"{resume_ref.get('ssrn', 0)} SSRN papers",
            "ok": paper_n == resume_ref.get("ssrn"),
        },
        {
            "key": "skills_and_state",
            "label": "Program skills & canonical state",
            "live": f"{resume_ref.get('skills', 0)} skills, {resume_ref.get('canonical_files', 0)} state files, overlap {resume_ref.get('overlap', 0)} (peak {resume_ref.get('peak', 0)})",
            "site": f"{resume_ref.get('skills', 0)} skills, {resume_ref.get('canonical_files', 0)} state files",
            "ok": not scale_disagree and not resume_problems,
        },
    ]

    return {
        "generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "all_ok": all(m["ok"] for m in metrics) and not scale_disagree and not resume_problems,
        "metrics": metrics,
        "raw": {
            "commits_on_ref": commits_on_ref,
            "commits_floored": commits_floored,
            "advisory": adv,
            "hard_gates_live": gate_live,
            "hard_gates_site": gate_site,
            "patents": {"applications": pat_n, "families": pat_f, "areas": len(pat_areas)},
            "letters": {
                "federal_letters": let_stats["n"],
                "dockets": let_stats["dockets"],
                "agencies": let_stats["agencies"],
                "recommendations": let_stats["recommendations"],
            },
            "papers": {"count": paper_n, "slugs": sorted(paper_map) if isinstance(paper_map, list) else sorted(paper_map.keys())},
            "notes": {"count": len(notes_doc.get("notes", []))},
            "home_stats": {s["key"]: s["value"] for s in home_stats},
            "scale_disagreements": scale_disagree,
            "resume_problems": resume_problems,
        },
    }


def print_report(rep: dict):
    print("=== Tokenization Systems: Site Metrics & Sync Report ===")
    print(f"Generated: {rep['generated_at']}\n")
    print(f"{'Metric':34s} | {'Live / Authoritative':46s} | {'Status':6s}")
    print("-" * 92)
    for m in rep["metrics"]:
        status = "OK" if m["ok"] else "DRIFT"
        print(f"{m['label']:34s} | {m['live']:46s} | {status:6s}")
        if not m["ok"]:
            print(f"  -> Site currently shows: {m['site']}")
    if rep["raw"]["scale_disagreements"]:
        print("\nScale disagreements:")
        for d in rep["raw"]["scale_disagreements"]:
            print(f"  - {d}")
    print("\nOverall status:", "ALL METRICS IN SYNC" if rep["all_ok"] else "DRIFT DETECTED (run with --write to update)")


def run_write_pipeline(sync_ssh: bool = False, with_resumes: bool = False) -> int:
    print("1. Measuring fleet metrics and hard-gate outcomes...")
    rep = collect_report(refresh_commits=True, sync_ssh=sync_ssh)

    # Optionally refresh shipped DOCX/PDF resumes if --with-resumes is requested or if floors moved
    if with_resumes and WF_REPO.is_dir():
        venv_py = Path(os.path.expanduser("~/.local/state/cryptozach/venvs/docx/bin/python"))
        producer = WF_REPO / "resumes" / "_render" / "refresh_shipped_measured_figures.py"
        if venv_py.is_file() and producer.is_file():
            print("2. Refreshing shipped resume DOCX/PDF files...")
            subprocess.run(
                [str(venv_py), str(producer), "--ship-dir", str(ROOT / "resumes"), "--in-place"],
                cwd=str(WF_REPO), check=True,
            )

    print("3. Updating hard-gate refusal counts across index.html, agent-infrastructure/index.html, and frameworks/index.html...")
    gate_changed = apply_hard_gate_updates(rep["raw"]["hard_gates_live"])
    if gate_changed:
        print("   Updated hard-gate surfaces:", ", ".join(gate_changed))
    else:
        print("   Hard-gate surfaces already up to date.")

    print("4. Refreshing interactive commit chart and scale figures...")
    rcc.main(["--write", "--refresh"])

    print("5. Running site generators (home stats, letters, letter counts, patents, notes, chrome, sitemap)...")
    generators = [
        [sys.executable, "scripts/render_home_stats.py", "--write"],
        [sys.executable, "scripts/render_letters.py", "--write"],
        [sys.executable, "scripts/render_letter_count.py", "--write"],
        [sys.executable, "scripts/check_patent_count.py", "--write"],
        [sys.executable, "scripts/render_notes.py", "--write"],
        [sys.executable, "scripts/render_brand.py", "--write"],
        [sys.executable, "scripts/render_chrome.py", "--write"],
        [sys.executable, "scripts/update_sitemap_lastmod.py"],
    ]
    for cmd in generators:
        r = subprocess.run(cmd, cwd=str(ROOT))
        if r.returncode != 0:
            print(f"Generator failed: {' '.join(cmd)}", file=sys.stderr)
            return r.returncode

    print("6. Running verification guard suite...")
    guards = [
        [sys.executable, "scripts/check_scale_figures.py"],
        [sys.executable, "scripts/check_agent_infra_stats.py"],
        [sys.executable, "scripts/render_commit_chart.py", "--check"],
        [sys.executable, "scripts/render_home_stats.py", "--check"],
        [sys.executable, "scripts/check_home_stats.py"],
        [sys.executable, "scripts/render_letters.py", "--check"],
        [sys.executable, "scripts/render_letter_count.py", "--check"],
        [sys.executable, "scripts/check_letter_count.py"],
        [sys.executable, "scripts/check_patent_count.py", "--check"],
        [sys.executable, "scripts/check_paper_count.py"],
        [sys.executable, "scripts/render_notes.py", "--check"],
        [sys.executable, "scripts/render_brand.py", "--check"],
        [sys.executable, "scripts/render_chrome.py", "--check"],
    ]
    for cmd in guards:
        r = subprocess.run(cmd, cwd=str(ROOT))
        if r.returncode != 0:
            print(f"Guard failed: {' '.join(cmd)}", file=sys.stderr)
            return r.returncode

    print("\nupdate_site_metrics: ALL SITE METRICS UPDATED AND VERIFIED.")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--json", action="store_true", help="Print JSON metrics report")
    ap.add_argument("--check", action="store_true", help="Exit 1 if any metric has drifted")
    ap.add_argument("--write", action="store_true", help="Update all drifted site surfaces and run guards")
    ap.add_argument("--sync-fleet", action="store_true", help="Sync peer fleet host over SSH before measuring")
    ap.add_argument("--with-resumes", action="store_true", help="Also refresh shipped DOCX/PDF resumes when --write is set")
    args = ap.parse_args(argv)

    if args.write:
        return run_write_pipeline(sync_ssh=args.sync_fleet, with_resumes=args.with_resumes)

    rep = collect_report(refresh_commits=False, sync_ssh=args.sync_fleet)
    if args.json:
        print(json.dumps(rep, indent=2))
    else:
        print_report(rep)

    if args.check and not rep["all_ok"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
