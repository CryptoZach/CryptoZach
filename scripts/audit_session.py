#!/usr/bin/env python3
"""Retrospective Cursor session transcript extractor.

Reads a Cursor agent session transcript (JSONL) and emits a per-turn summary
showing what tools were invoked, what files were loaded into context (full
file vs snippet), per-Read token estimates, and a running cumulative total.

Usage:
  python scripts/audit_session.py                 # latest session
  python scripts/audit_session.py <session-uuid>  # specific session
  python scripts/audit_session.py --latest        # latest session (explicit)
  python scripts/audit_session.py --diffs         # include StrReplace/Write diff bodies
  python scripts/audit_session.py --list          # list all sessions, newest first

Token estimates require tiktoken. See scripts/README.md for setup.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

PROJECT_SLUG = str(WORKSPACE_ROOT).lstrip("/").replace("/", "-")
TRANSCRIPTS_ROOT = Path.home() / ".cursor" / "projects" / PROJECT_SLUG / "agent-transcripts"

TIKTOKEN_FALLBACK_PATHS = [
    WORKSPACE_ROOT / "scripts" / ".deps",
    Path("/tmp/tiktoken_pkgs"),
    Path.home() / ".cursor" / "agent-tools" / "tiktoken_pkgs",
]

ENC = None
HAS_TIKTOKEN = False
for fallback in TIKTOKEN_FALLBACK_PATHS:
    if fallback.exists() and str(fallback) not in sys.path:
        sys.path.insert(0, str(fallback))

try:
    import tiktoken
    ENC = tiktoken.get_encoding("cl100k_base")
    HAS_TIKTOKEN = True
except ImportError:
    pass


def fmt_int(n: int) -> str:
    return f"{n:,}"


def relpath(p: str) -> str:
    """Render a path relative to the workspace; leave outside-workspace paths absolute."""
    if not p:
        return "?"
    try:
        rel = Path(p).resolve().relative_to(WORKSPACE_ROOT)
        return str(rel)
    except (ValueError, OSError):
        return p


def tokenize(text: str) -> int:
    if not HAS_TIKTOKEN or not text:
        return 0
    return len(ENC.encode(text, disallowed_special=()))


def list_sessions() -> list[tuple[float, Path]]:
    if not TRANSCRIPTS_ROOT.exists():
        return []
    out = []
    for d in TRANSCRIPTS_ROOT.iterdir():
        if not d.is_dir():
            continue
        jsonl = d / f"{d.name}.jsonl"
        if jsonl.exists():
            out.append((jsonl.stat().st_mtime, jsonl))
    out.sort(reverse=True)
    return out


def find_latest_session() -> Path:
    sessions = list_sessions()
    if not sessions:
        sys.exit(f"No transcripts found under {TRANSCRIPTS_ROOT}")
    return sessions[0][1]


def find_session_by_uuid(uuid: str) -> Path:
    p = TRANSCRIPTS_ROOT / uuid / f"{uuid}.jsonl"
    if not p.exists():
        sys.exit(f"Session {uuid} not found at {p}")
    return p


def estimate_read_tokens(path: str, offset, limit, file_cache: dict) -> tuple[int, bool]:
    """Return (tokens, file_exists). Approximate; file may have changed since the Read."""
    if not HAS_TIKTOKEN:
        return 0, False
    try:
        full = Path(path)
        if not full.exists():
            return 0, False
        if full not in file_cache:
            file_cache[full] = full.read_text(encoding="utf-8", errors="replace").splitlines()
        lines = file_cache[full]
        if offset is None and limit is None:
            text = "\n".join(lines)
        else:
            if offset is None:
                start = 0
            elif offset > 0:
                start = offset - 1
            else:
                start = max(0, len(lines) + offset)
            end = start + (limit if limit is not None else len(lines))
            text = "\n".join(lines[start:end])
        return tokenize(text), True
    except Exception:
        return 0, False


def render_diff_body(label: str, body: str, max_lines: int = 8, max_cols: int = 100) -> list[str]:
    out = [f"      {label} ({fmt_int(len(body))} chars):"]
    body_lines = body.splitlines() or [""]
    for ln in body_lines[:max_lines]:
        out.append(f"        | {ln[:max_cols]}{'...' if len(ln) > max_cols else ''}")
    extra = len(body_lines) - max_lines
    if extra > 0:
        out.append(f"        | ... ({fmt_int(extra)} more lines)")
    return out


def process_tool_use(tu: dict, args, file_cache: dict) -> tuple[list[str], int]:
    """Return (formatted lines for display, tokens contributed to context)."""
    name = tu.get("name", "?")
    inp = tu.get("input", {}) or {}
    lines: list[str] = []
    tokens = 0

    if name == "Read":
        path = inp.get("path", "?")
        offset = inp.get("offset")
        limit = inp.get("limit")
        snippet = offset is not None or limit is not None
        kind = "SNIP" if snippet else "FULL"
        tokens, file_exists = estimate_read_tokens(path, offset, limit, file_cache)
        details = ""
        if snippet:
            parts = []
            if offset is not None:
                parts.append(f"offset={offset}")
            if limit is not None:
                parts.append(f"limit={limit}")
            details = " " + " ".join(parts)
        marker = "" if file_exists else " [file gone]"
        tok_str = f"~{fmt_int(tokens)} tok" if HAS_TIKTOKEN else "tokens N/A"
        lines.append(f"  Read    [{kind}] {relpath(path)}{details}  ({tok_str}){marker}")

    elif name == "Grep":
        pattern = inp.get("pattern", "")
        path = inp.get("path", "")
        mode = inp.get("output_mode", "content")
        head = inp.get("head_limit")
        glob = inp.get("glob", "")
        ftype = inp.get("type", "")
        details = f' "{pattern}"'
        if path:
            details += f" in {relpath(path)}"
        if glob:
            details += f" glob={glob}"
        if ftype:
            details += f" type={ftype}"
        scope = f"[{mode}"
        if head:
            scope += f", head={head}"
        scope += "]"
        lines.append(f"  Grep    {scope}{details}")

    elif name == "Glob":
        pattern = inp.get("glob_pattern", "")
        target = inp.get("target_directory", "")
        details = f' "{pattern}"'
        if target:
            details += f" in {relpath(target)}"
        lines.append(f"  Glob   {details}")

    elif name == "Shell":
        cmd_full = inp.get("command", "") or ""
        cmd = cmd_full.splitlines()[0][:140] if cmd_full else "(empty)"
        cwd = inp.get("working_directory", "")
        bg = inp.get("block_until_ms")
        marker = ""
        if bg == 0:
            marker = " [bg]"
        elif bg is not None and bg > 60000:
            marker = f" [block={bg}ms]"
        cwd_str = f" (cwd={relpath(cwd)})" if cwd else ""
        lines.append(f"  Shell   {cmd}{cwd_str}{marker}")

    elif name == "StrReplace":
        path = inp.get("path", "?")
        old = inp.get("old_string", "") or ""
        new = inp.get("new_string", "") or ""
        replace_all = inp.get("replace_all", False)
        old_lines = old.count("\n") + 1
        new_lines = new.count("\n") + 1
        delta = f"-{old_lines}/+{new_lines} lines"
        flag = " [replace_all]" if replace_all else ""
        lines.append(f"  Edit    StrReplace {relpath(path)} ({delta}){flag}")
        if args.diffs:
            lines.extend(render_diff_body("--- old", old))
            lines.extend(render_diff_body("+++ new", new))

    elif name == "Write":
        path = inp.get("path", "?")
        content = inp.get("contents", "") or ""
        n_lines = content.count("\n") + (1 if content else 0)
        lines.append(f"  Write   {relpath(path)} ({fmt_int(n_lines)} lines, {fmt_int(len(content))} chars)")
        if args.diffs:
            lines.extend(render_diff_body("contents", content, max_lines=15))

    elif name == "Delete":
        path = inp.get("path", "?")
        lines.append(f"  Delete  {relpath(path)}")

    elif name == "EditNotebook":
        path = inp.get("target_notebook", "?")
        cell = inp.get("cell_idx", "?")
        new_cell = inp.get("is_new_cell", False)
        action = "new cell" if new_cell else f"edit cell {cell}"
        lines.append(f"  Notebook {relpath(path)} ({action})")

    elif name == "ReadLints":
        paths = inp.get("paths") or []
        if paths:
            lines.append(f"  Lints   {len(paths)} path(s): {[relpath(p) for p in paths[:3]]}")
        else:
            lines.append(f"  Lints   workspace-wide")

    elif name == "Task":
        sub = inp.get("subagent_type", "?")
        desc = inp.get("description", "")
        bg = " [bg]" if inp.get("run_in_background") else ""
        ro = " [ro]" if inp.get("readonly") else ""
        lines.append(f"  Task    [{sub}]{bg}{ro} {desc}")

    elif name == "TodoWrite":
        todos = inp.get("todos") or []
        merge = inp.get("merge", False)
        in_prog = sum(1 for t in todos if t.get("status") == "in_progress")
        done = sum(1 for t in todos if t.get("status") == "completed")
        lines.append(f"  Todo    {'merge' if merge else 'replace'} {len(todos)} item(s) ({done} done, {in_prog} in progress)")

    elif name == "SemanticSearch":
        q = (inp.get("query", "") or "")[:90]
        targets = inp.get("target_directories") or []
        scope = f"[{', '.join(relpath(t) for t in targets) if targets else 'workspace'}]"
        lines.append(f'  Sem     {scope} "{q}"')

    elif name == "WebSearch":
        q = (inp.get("search_term", "") or "")[:90]
        lines.append(f'  WebSearch "{q}"')

    elif name == "WebFetch":
        url = inp.get("url", "")
        lines.append(f"  WebFetch {url}")

    elif name == "AwaitShell":
        tid = inp.get("task_id", "?")
        block = inp.get("block_until_ms")
        details = f" task={tid}"
        if block is not None:
            details += f" block={block}ms"
        pat = inp.get("pattern")
        if pat:
            details += f' pattern=/{pat[:50]}/'
        lines.append(f"  Await  {details}")

    elif name == "GenerateImage":
        desc = (inp.get("description", "") or "")[:90]
        lines.append(f'  GenImage "{desc}"')

    elif name == "AskQuestion":
        qs = inp.get("questions") or []
        lines.append(f"  Ask     {len(qs)} question(s)")

    elif name == "SwitchMode":
        target = inp.get("target_mode_id", "?")
        lines.append(f"  SwitchMode -> {target}")

    elif name == "CallMcpTool":
        server = inp.get("server", "?")
        tool = inp.get("toolName", "?")
        lines.append(f"  MCP     {server}/{tool}")

    elif name == "FetchMcpResource":
        server = inp.get("server", "?")
        uri = inp.get("uri", "?")
        lines.append(f"  MCPRes  {server} {uri}")

    else:
        lines.append(f"  {name:<8} (unhandled tool kind; raw input: {json.dumps(inp)[:120]})")

    return lines, tokens


def summarize_user_message(content_blocks: list) -> str:
    """Extract the user-typed query, stripping system-injected wrappers."""
    text = ""
    for c in content_blocks:
        if isinstance(c, dict) and c.get("type") == "text":
            text += c.get("text", "") or ""
    if "<user_query>" in text:
        start = text.find("<user_query>") + len("<user_query>")
        end = text.find("</user_query>", start)
        if end == -1:
            end = len(text)
        text = text[start:end].strip()
    return text


def process_session(jsonl_path: Path, args) -> None:
    file_cache: dict = {}
    cumulative_tokens = 0
    turn_idx = 0

    print(f"=== Session: {jsonl_path.parent.name}")
    print(f"=== Path:    {jsonl_path}")
    print(f"=== Size:    {fmt_int(jsonl_path.stat().st_size)} bytes")
    print(f"=== Tokens:  {'cl100k_base' if HAS_TIKTOKEN else 'NOT AVAILABLE (install tiktoken; see scripts/README.md)'}")
    print()

    with jsonl_path.open() as f:
        for raw_line in f:
            try:
                rec = json.loads(raw_line)
            except json.JSONDecodeError:
                continue

            role = rec.get("role")
            msg = rec.get("message", {}) or {}
            content = msg.get("content", []) or []
            if isinstance(content, str):
                content = [{"type": "text", "text": content}]

            if role == "user":
                user_text = summarize_user_message(content)
                if not user_text and turn_idx > 0:
                    continue
                turn_idx += 1
                head = user_text.replace("\n", " ").strip()
                if len(head) > 160:
                    head = head[:160] + "..."
                print(f"--- Turn {turn_idx} (user, {fmt_int(len(user_text))} chars typed) ---")
                if head:
                    print(f"  > {head}")
                print()
                continue

            if role != "assistant":
                continue

            turn_idx += 1
            tool_lines: list[str] = []
            text_chars = 0
            thinking_chars = 0
            turn_tokens = 0

            for c in content:
                if not isinstance(c, dict):
                    continue
                ctype = c.get("type")
                if ctype == "text":
                    text_chars += len(c.get("text", "") or "")
                elif ctype == "thinking":
                    thinking_chars += len(c.get("thinking", "") or "")
                elif ctype == "tool_use":
                    block_lines, tokens = process_tool_use(c, args, file_cache)
                    tool_lines.extend(block_lines)
                    turn_tokens += tokens

            cumulative_tokens += turn_tokens

            print(f"--- Turn {turn_idx} (assistant) ---")
            for line in tool_lines:
                print(line)
            footer_bits = []
            if text_chars > 0:
                footer_bits.append(f"text {fmt_int(text_chars)}c")
            if thinking_chars > 0:
                footer_bits.append(f"thinking {fmt_int(thinking_chars)}c")
            if turn_tokens > 0:
                footer_bits.append(f"reads ~{fmt_int(turn_tokens)} tok")
            footer_bits.append(f"cumulative ~{fmt_int(cumulative_tokens)} tok")
            print(f"  -> {' | '.join(footer_bits)}")
            print()

    print(f"=== End of session: {turn_idx} turns | cumulative read tokens ~{fmt_int(cumulative_tokens)}")


def cmd_list() -> None:
    sessions = list_sessions()
    if not sessions:
        print(f"No transcripts under {TRANSCRIPTS_ROOT}")
        return
    print(f"{'modified':<20}  {'size':>10}  uuid")
    print("-" * 80)
    import datetime
    for mtime, jsonl in sessions:
        ts = datetime.datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
        print(f"{ts:<20}  {fmt_int(jsonl.stat().st_size):>10}  {jsonl.parent.name}")


def main() -> None:
    p = argparse.ArgumentParser(
        description="Retrospective Cursor session transcript extractor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("session", nargs="?", help="Session UUID (defaults to --latest)")
    p.add_argument("--latest", action="store_true", help="Use most recent session (default behavior)")
    p.add_argument("--diffs", action="store_true", help="Include StrReplace/Write diff bodies (verbose)")
    p.add_argument("--list", action="store_true", help="List all sessions newest first; do not extract")
    args = p.parse_args()

    if args.list:
        cmd_list()
        return

    if args.session and not args.latest:
        path = find_session_by_uuid(args.session)
    else:
        path = find_latest_session()

    process_session(path, args)


if __name__ == "__main__":
    main()
