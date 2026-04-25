#!/usr/bin/env python3
"""claude-code-sync.py: print a current-state snapshot of the CryptoZach
research program for Claude Code CLI session-start sync.

Usage:
    python3 scripts/claude-code-sync.py                # full snapshot to stdout
    python3 scripts/claude-code-sync.py --terse        # one-line per entry, fewer entries
    python3 scripts/claude-code-sync.py > /tmp/sync.md # write to file, then paste
    bash -c 'python3 scripts/claude-code-sync.py | claude'  # pipe into claude (advanced)

What it prints (in order):
    1. Header: identity, lane reminder, hard constraints, timestamp
    2. Canonical-file freshness table (Last-updated date per file)
    3. SSRN publication snapshot (parsed from PROGRAM_STATE)
    4. Recent decisions (last N DEC entries)
    5. Recent corrections (last N EC entries)
    6. Critical known unknowns (KU entries under "Critical (Blocks Active Work)")
    7. Active outreach (open OL entries; non-Closed/FILED status)
    8. Top pending actions (PROGRAM_STATE "Pending actions (open)" entries)
    9. Output conventions (working-tree paths, handoff-memo location)
   10. Common workflow pointers (skill files for Dune, surgery, handoff, etc.)
   11. Comprehensive memory pointer (handoff/claude_web_project_memory.md)

Designed to be run at the start of every Claude Code CLI session in this repo.
The snapshot is a sync surface, not a substitute for reading the canonical files
themselves when doing substantive work. When the snapshot flags work that affects
a canonical file, read the file before acting.

Implementation: pure Python standard library; no external deps. Parses canonical
files via regex on entry headers (### DEC-NNN, ### KU-N, ### OL-NNN, ### EC-...).
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PRIMARY_CLONE = Path("/Users/zach/ai-research/CryptoZach")
DOCS = REPO_ROOT / "docs"

CANONICAL_FILES = [
    ("PROGRAM_STATE.md", "PM/editorial state"),
    ("EDITORIAL_STANDARDS.md", "PM/editorial state"),
    ("ERROR_CORRECTION_LOG.md", "PM/editorial state"),
    ("SITE_STATE.md", "PM/editorial state"),
    ("KNOWLEDGE_ARCHITECTURE.md", "PM/editorial state"),
    ("AGENT_ROSTER.md", "PM/editorial state"),
    ("DATA_REGISTRY.md", "Research content"),
    ("KEY_FINDINGS.md", "Research content"),
    ("CROSS_REFERENCE_MAP.md", "Research content"),
    ("GLOSSARY.md", "Research content"),
    ("FRAMEWORK_REGISTRY.md", "Research content"),
    ("ENTITY_PROFILES.md", "Research content"),
    ("DECISION_LOG.md", "Research-agentic state"),
    ("KNOWN_UNKNOWNS.md", "Research-agentic state"),
    ("HYPOTHESES.md", "Research-agentic state"),
    ("VERSION_HISTORY.md", "Research-agentic state"),
    ("OUTREACH_LOG.md", "Workflow state"),
    ("READING_LIST.md", "Reference content"),
]

DATE_LONG_RE = re.compile(
    r"\b(January|February|March|April|May|June|July|August|"
    r"September|October|November|December)\s+\d{1,2},\s+\d{4}\b"
)
DATE_ISO_RE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


MONTHS = {
    "January": "01", "February": "02", "March": "03", "April": "04",
    "May": "05", "June": "06", "July": "07", "August": "08",
    "September": "09", "October": "10", "November": "11", "December": "12",
}


def _normalize_iso(date_str: str) -> str:
    """Convert 'April 22, 2026' to '2026-04-22'; pass through if already ISO."""
    if DATE_ISO_RE.fullmatch(date_str):
        return date_str
    longmatch = re.match(r"^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$", date_str)
    if longmatch:
        month, day, year = longmatch.groups()
        return f"{year}-{MONTHS[month]}-{int(day):02d}"
    return date_str


def parse_last_updated(path: Path) -> str:
    """Extract a normalized ISO date from the 'Last updated:' line.

    Prefers the date that appears BEFORE any parenthetical, since the
    parenthetical typically contains historical references (other dates from
    the change description) that would mislead the freshness signal.
    """
    text = read_text(path)
    if not text:
        return "(file missing)"
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("Last updated:") or stripped.startswith("**Last updated:"):
            head = stripped.split("(", 1)[0]
            longform = DATE_LONG_RE.search(head)
            if longform:
                return _normalize_iso(longform.group(0))
            iso = DATE_ISO_RE.search(head)
            if iso:
                return iso.group(0)
            longform = DATE_LONG_RE.search(stripped)
            if longform:
                return _normalize_iso(longform.group(0))
            iso = DATE_ISO_RE.search(stripped)
            if iso:
                return iso.group(0)
            return stripped[:40]
    return "(no Last updated line)"


def get_recent_entries(path: Path, prefix: str, n: int = 5) -> list[tuple[str, str]]:
    """Extract the last N entries matching '## {prefix}-...' or '### {prefix}-...'."""
    if n <= 0:
        return []
    text = read_text(path)
    if not text:
        return []
    pattern = re.compile(rf"^#{{2,3}}\s+({prefix}-[A-Za-z0-9-]+):\s*(.+?)\s*$", re.MULTILINE)
    matches = pattern.findall(text)
    return matches[-n:] if matches else []


def get_critical_kus(path: Path) -> list[tuple[str, str]]:
    """Extract KU entries under the 'Critical (Blocks Active Work)' H2 section.

    Filters titles indicating closure (see `_is_closed_title()`) so resolved
    KU entries that have not been moved out of the Critical section do not
    surface as still-blocking. Same closure-marker convention as
    `get_pending_actions()`: append "(RESOLVED <date> <outcome>)" or
    "(CLOSED <date> ...)" to the KU H3 title when the question resolves
    without being relocated.
    """
    text = read_text(path)
    if not text:
        return []
    in_section = False
    entries: list[tuple[str, str]] = []
    pattern = re.compile(r"^#{2,3}\s+(KU-[A-Za-z0-9-]+):\s*(.+?)\s*$")
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("## Critical"):
            in_section = True
            continue
        if in_section and stripped.startswith("## ") and not stripped.startswith("### "):
            break
        if in_section:
            match = pattern.match(stripped)
            if match:
                title = match.group(2)
                if not _is_closed_title(title):
                    entries.append((match.group(1), title))
    return entries


def get_open_outreach(path: Path) -> list[tuple[str, str, str]]:
    """Extract OL entries whose Status line is not Closed/FILED/Logged/Declined."""
    text = read_text(path)
    if not text:
        return []
    entries: list[tuple[str, str, str]] = []
    current_id: str | None = None
    current_title: str | None = None
    current_status: str | None = None
    header_re = re.compile(r"^###\s+(OL-\d+):\s*(.+?)\s*$")
    status_re = re.compile(r"^[-*]?\s*\*?\*?Status:\*?\*?\s*(.+?)\.?\s*$")

    def flush() -> None:
        if current_id and current_title:
            status = current_status or "(no status line)"
            if not _is_closed(status):
                entries.append((current_id, current_title, status))

    for line in text.splitlines():
        stripped = line.strip()
        m = header_re.match(stripped)
        if m:
            flush()
            current_id = m.group(1)
            current_title = m.group(2)
            current_status = None
            continue
        if current_id and current_status is None:
            ms = status_re.match(stripped)
            if ms:
                current_status = ms.group(1)
    flush()
    return entries


def _is_closed(status: str) -> bool:
    s = status.lower()
    closed_markers = ("closed", "declined", "filed", "logged", "complete", "completed")
    return any(s.startswith(m) or f" {m}" in s for m in closed_markers)


CLOSED_TITLE_MARKERS = (
    "(CLOSED ",
    "(COMPLETE ",
    "(RESOLVED ",
    "(DONE ",
    "(SUPERSEDED ",
    "(RETIRED ",
    "(CLOSED;",
    "(COMPLETE;",
    "(RESOLVED;",
)


def _is_closed_title(title: str) -> bool:
    """Filter section H3 titles whose header explicitly indicates closure.

    Used by both pending-action filtering (PROGRAM_STATE `## Pending actions`
    section) and critical-KU filtering (KNOWN_UNKNOWNS `## Critical (Blocks
    Active Work)` section). Convention: append a closure marker to the H3
    title (e.g., "(CLOSED 2026-04-18 via Path D)", "(COMPLETE 2026-04-20)",
    or "(RESOLVED 2026-04-22 REJECTED)") when an entry resolves but the
    section it's in does not have a natural relocation target. The
    parsing-side filter naturally hides the entry from the snapshot. See
    `.cursor/rules/knowledge-architecture.mdc` for the convention spec.
    """
    upper = title.upper()
    return any(marker in upper for marker in CLOSED_TITLE_MARKERS)


def get_pending_actions(path: Path, n: int = 8) -> list[str]:
    """Extract H3 titles under '## Pending actions (open)' in PROGRAM_STATE.

    Filters titles indicating closure (see `_is_closed_title()`) so resolved
    entries that have not been moved out of the section do not surface as
    pending. This is a parsing-side filter; the canonical convention is to
    append "(CLOSED <date> ...)" or "(COMPLETE <date>)" to the H3 title
    when an entry resolves without being relocated.
    """
    if n <= 0:
        return []
    text = read_text(path)
    if not text:
        return []
    in_section = False
    titles: list[str] = []
    h3_re = re.compile(r"^###\s+(.+?)\s*$")
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("## Pending actions"):
            in_section = True
            continue
        if in_section and stripped.startswith("## ") and not stripped.startswith("### "):
            break
        if in_section:
            match = h3_re.match(stripped)
            if match:
                title = match.group(1)
                if not _is_closed_title(title):
                    titles.append(title)
    return titles[:n]


def get_ssrn_table_block(path: Path) -> str:
    """Extract the markdown table under the SSRN publication layer section."""
    text = read_text(path)
    if not text:
        return ""
    in_section = False
    block: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("## SSRN publication layer"):
            in_section = True
            continue
        if in_section and stripped.startswith("## ") and not stripped.startswith("### "):
            break
        if in_section:
            block.append(line.rstrip())
    return "\n".join(block).strip()


def render_header(now: str) -> str:
    if REPO_ROOT == PRIMARY_CLONE:
        clone_identity = "primary clone (designated canonical; see `CLAUDE.md` Multi-clone coordination)"
    else:
        clone_identity = (
            f"**WORKING CLONE** (primary is `{PRIMARY_CLONE}`, symlink `~/cryptozach`). "
            "Session is fully functional; `docs/*.md` absolute-path narrative references cite the primary clone path. "
            "Prefer starting new sessions in the primary clone."
        )
    return f"""# Claude Code CLI sync, {now}

> Snapshot from `scripts/claude-code-sync.py`. Reflects the current canonical state in `docs/` at run time.
> Re-run this script to refresh; the canonical files are the source of truth.

## You are Claude Code CLI in the CryptoZach research repo

- **Repo root:** `{REPO_ROOT}`
- **Clone identity:** {clone_identity}
- **Project:** Tokenization Systems research program (Zach Zukowski; zach@tokenization.systems)
- **Site:** tokenization.systems (cryptozach.com 301 redirects via Cloudflare)

### Your lane (per `docs/KNOWLEDGE_ARCHITECTURE.md`)

You are the **execution engine** for:

- Data pipelines: Dune Analytics, FRED, DefiLlama, Helius (Solana SPL), Nansen, Artemis, Spacescope, Blockscout, Token Terminal
- Econometrics: R, Stata, Python; DiD, event studies, synthetic control, panel regressions
- Long-running computation, replication runs, simulation
- Manuscript surgery: DOCX/PDF unpack/edit/repack via the `cryptozach-docx-surgery-patterns` skill

### Hard constraints

- **Do not write to `docs/*.md`.** Cursor is the sole canonical writer (DEC-069, 2026-04-19). When findings warrant canonical updates, produce a handoff memo for Cursor to apply.
- **Do not write to `papers/`, `research/`, `index.html`, or other site directories** unless the author explicitly authorizes a Claude-Code-side site edit. Site implementation is Cursor's lane.
- **Do not commit on behalf of the author** without explicit authorization in the same session.
- **Editorial: zero em-dashes (\u2014) and en-dashes (\u2013)** in any output (prose, code comments, commit messages, memos). Use commas, semicolons, colons, parentheses, or sentence breaks. Structural-separator exception only for GLOSSARY-style `**Term** -- definition` patterns. See `~/.cursor/skills/no-em-dashes/SKILL.md`.
- **Calibrated verbs** (per `docs/EDITORIAL_STANDARDS.md` section 13): forbidden "confirms / proves / establishes / we recommend"; required "evidence consistent with / indicating / is consistent with / documents / reveals."

### When canonical-worthy work happens

Produce `Living_File_Updates_YYYY-MM-DD_HHMM_[Paper|Workstream]_[Summary].md` in `.cursor/tasks/` per `.cursor/skills/cryptozach-session-patch-producer/SKILL.md`. The next Cursor session applies the memo and commits."""


def render_freshness_table() -> str:
    rows = ["", "## Canonical-file freshness", "",
            "| File | Category | Last updated |", "|---|---|---|"]
    for filename, category in CANONICAL_FILES:
        last = parse_last_updated(DOCS / filename)
        rows.append(f"| `{filename}` | {category} | {last} |")
    rows.append("")
    rows.append("If a file is older than the snapshot context calls for, read it directly before acting on its domain.")
    return "\n".join(rows)


def render_ssrn_block() -> str:
    block = get_ssrn_table_block(DOCS / "PROGRAM_STATE.md")
    if not block:
        return "\n## SSRN publication snapshot\n\n(could not parse SSRN section from `docs/PROGRAM_STATE.md`)"
    return f"\n## SSRN publication snapshot\n\nFrom `docs/PROGRAM_STATE.md` `## SSRN publication layer`. `docs/DATA_REGISTRY.md` is authoritative for public dates and DOIs.\n\n{block}"


def render_decisions(n: int) -> str:
    entries = get_recent_entries(DOCS / "DECISION_LOG.md", "DEC", n=n)
    lines = ["", f"## Recent decisions (last {len(entries)} of {n} requested)", ""]
    if not entries:
        lines.append("(no DEC entries parsed)")
    else:
        for dec_id, title in entries:
            lines.append(f"- **{dec_id}**: {title}")
    lines.append("")
    lines.append("Read `docs/DECISION_LOG.md` for full Context, Decision, Rationale, Rejected, and Affected fields.")
    return "\n".join(lines)


def render_corrections(n: int) -> str:
    entries = get_recent_entries(DOCS / "ERROR_CORRECTION_LOG.md", "EC", n=n)
    lines = ["", f"## Recent corrections (last {len(entries)} of {n} requested)", ""]
    if not entries:
        lines.append("(no EC entries parsed; the log uses `## EC-...` and `### EC-...` formats)")
    else:
        for ec_id, title in entries:
            lines.append(f"- **{ec_id}**: {title}")
    lines.append("")
    lines.append("Read `docs/ERROR_CORRECTION_LOG.md` for Context, Root cause, Fix, and Prevention pattern.")
    return "\n".join(lines)


def render_critical_kus() -> str:
    entries = get_critical_kus(DOCS / "KNOWN_UNKNOWNS.md")
    lines = ["", "## Critical known unknowns (block active work)", ""]
    if not entries:
        lines.append("(no entries under `## Critical (Blocks Active Work)`)")
    else:
        for ku_id, title in entries:
            lines.append(f"- **{ku_id}**: {title}")
    lines.append("")
    lines.append("Significant and Strategic categories also live in `docs/KNOWN_UNKNOWNS.md`.")
    return "\n".join(lines)


def render_outreach(n: int) -> str:
    entries = get_open_outreach(DOCS / "OUTREACH_LOG.md")
    lines = ["", f"## Open outreach (non-Closed/FILED status; first {n} of {len(entries)})", ""]
    if not entries:
        lines.append("(no open OL entries parsed)")
    else:
        for ol_id, title, status in entries[:n]:
            lines.append(f"- **{ol_id}** ({status}): {title}")
    lines.append("")
    lines.append("Read `docs/OUTREACH_LOG.md` for hooks, history, constraints, and sequencing gates. `docs/ENTITY_PROFILES.md` carries per-entity context.")
    return "\n".join(lines)


def render_pending_actions(n: int) -> str:
    titles = get_pending_actions(DOCS / "PROGRAM_STATE.md", n=n)
    lines = ["", f"## Top pending actions (PROGRAM_STATE; first {n})", ""]
    if not titles:
        lines.append("(no entries under `## Pending actions (open)`)")
    else:
        for title in titles:
            lines.append(f"- {title}")
    lines.append("")
    lines.append("Read `docs/PROGRAM_STATE.md` for status brackets, trigger conditions, and required actions per entry. Status format per `.cursor/skills/cryptozach-status-tracking/SKILL.md`.")
    return "\n".join(lines)


def render_conventions() -> str:
    return """
## Output conventions

- **Surgery / pipeline working trees:** `/Users/zach/<paper>_surgery/` or `/Users/zach/<workstream>/` (NOT inside the CryptoZach repo). Example: `/Users/zach/b1_surgery/` for B1 manuscript surgery output.
- **Handoff memos for Cursor:** `.cursor/tasks/Living_File_Updates_YYYY-MM-DD_HHMM_[Paper|Workstream]_[Summary].md` per `.cursor/skills/cryptozach-session-patch-producer/SKILL.md`. Cursor reads `.cursor/tasks/` at session start and moves applied memos to `.cursor/tasks/applied/`.
- **Cursor task specs (multi-phase prompts for Cursor to execute):** `.cursor/tasks/<workstream>_<descriptor>.md`. Use the spec format in `.cursor/skills/cryptozach-spec-execution/SKILL.md`.
- **Surgery summary memos** (per-paper EC resolution): `<Paper>_<EC-id>_Surgery.md` in the surgery working tree, alongside the corrected DOCX/PDF.

## Common workflow pointers

| Task | Primary skill / path |
|---|---|
| Dune query execution | `~/.claude/skills/dune/SKILL.md` (column naming: `evt_block_time` for decoded; `block_time` for spellbook; never mix) |
| Real-time wallet/token lookups | `~/.claude/skills/sim/SKILL.md` (Dune Sim API; EVM and SVM) |
| DOCX surgery (unpack/edit/repack) | `.cursor/skills/cryptozach-docx-surgery-patterns/SKILL.md` (assert `doc.count(anchor) == 1` before each replacement) |
| Multi-tool handoff structure | `.cursor/skills/cryptozach-multi-tool-handoff/SKILL.md` (in-scope vs may-include-unchanged file lists) |
| Session-end memo | `.cursor/skills/cryptozach-session-patch-producer/SKILL.md` |
| Cursor spec-execution discipline | `.cursor/skills/cryptozach-spec-execution/SKILL.md` (halt-on-divergence, acceptance tests, author-decision options) |
| Editorial standards | `docs/EDITORIAL_STANDARDS.md` (calibrated verbs, finding-first, no causal overclaims) |
| Solana data sources (Dune unreliable) | `docs/setup/solana-data-sources.md` |
| MCP config edits | `docs/setup/mcp-config-editing.md` (use Python `json.load`/`json.dump`; TextEdit silently fails) |

## Comprehensive memory snapshot

For a longer narrative snapshot of program state (Track A/B inventory, key verified canonical values, frameworks, on-the-horizon items), see `handoff/claude_web_project_memory.md`. That document is the Claude Web equivalent; you have direct file access, so prefer reading the canonical files for ground truth and use the snapshot for orientation."""


def render_footer(now: str) -> str:
    return f"\n---\n\n*End of sync snapshot. Generated {now}. Re-run `python3 scripts/claude-code-sync.py` to refresh.*\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Print a current-state snapshot of the CryptoZach research program for Claude Code CLI session-start sync.",
    )
    parser.add_argument("--decisions", type=int, default=5, help="number of recent DEC entries to show (default 5)")
    parser.add_argument("--corrections", type=int, default=5, help="number of recent EC entries to show (default 5)")
    parser.add_argument("--outreach", type=int, default=12, help="number of open OL entries to show (default 12)")
    parser.add_argument("--pending", type=int, default=8, help="number of PROGRAM_STATE pending actions to show (default 8)")
    parser.add_argument("--terse", action="store_true", help="reduce all counts to 3 entries per section")
    args = parser.parse_args(argv)

    if args.terse:
        args.decisions = 3
        args.corrections = 3
        args.outreach = 5
        args.pending = 5

    if not DOCS.exists():
        print(f"ERROR: docs/ not found at {DOCS}", file=sys.stderr)
        return 1

    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    parts = [
        render_header(now),
        render_freshness_table(),
        render_ssrn_block(),
        render_decisions(args.decisions),
        render_corrections(args.corrections),
        render_critical_kus(),
        render_outreach(args.outreach),
        render_pending_actions(args.pending),
        render_conventions(),
        render_footer(now),
    ]

    print("\n".join(parts))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
