#!/usr/bin/env python3
"""Block a push where one JSON-LD @id carries contradictory property values.

WHY THIS EXISTS. Every page on this site embeds its own inline JSON-LD, and
several pages describe the SAME entity by repeating its canonical @id, for
example "https://tokenization.systems/#person". In JSON-LD one @id is one
node: a consumer that merges the site graph (which is what the AI answer
surfaces do) gets a single node carrying whatever the pages collectively
said. When two pages disagree on a property, the merged node is
self-contradictory and nothing in the per-page markup looks wrong, so no
reviewer reading one page can see it.

That is not hypothetical. Measured 2026-08-25: index.html defined
"@id": ".../#person" with "jobTitle": "Founder, Tokenization Systems", and
its Organization block named that same @id as its "founder", while six
resume pages emitted the SAME @id with "jobTitle": "Independent researcher
and advisor". The site had been publishing one person with two job titles.
Fixed in bbab68a37; this guard is the enforcing half, so the class cannot
come back silently.

WHAT IS AND IS NOT A VIOLATION. Pages legitimately describe a shared node at
different levels of detail: the contact page adds "email", the homepage adds
"alternateName". A property present on one occurrence and absent on another
is a SUBSET, not a contradiction, and is allowed. A violation is exactly one
thing: the same @id, the same property name, two different values.

EXIT CONTRACT, matching the sibling guards in this directory
(check_letter_count.py, check_home_stats.py, check_agent_infra_stats.py) and
the run_check helper in .github/workflows/build-deploy.yml:
  0  clean
  1  a real contradiction; FAIL CLOSED, block the push or the deploy
  2  the guard could not run; FAIL OPEN, warn and do not block
"""

import io
import json
import os
import re
import subprocess
import sys

SCRIPT_BLOCK = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.S | re.I,
)

# Directories that are build output, another checkout, or another tool's state.
# _site/ is the generated Jekyll output and is gitignored; a finding there is a
# duplicate of the source finding and would double-report.
SKIP_PREFIXES = ("_site/", ".claude/", ".cursor/", "node_modules/", "vendor/")


def repo_root():
    out = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        raise RuntimeError("not a git repository")
    return out.stdout.strip()


def tracked_html(root):
    out = subprocess.run(
        ["git", "-C", root, "ls-files", "*.html"],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        raise RuntimeError("git ls-files failed: %s" % out.stderr.strip())
    files = []
    for rel in out.stdout.splitlines():
        rel = rel.strip()
        if not rel or rel.startswith(SKIP_PREFIXES):
            continue
        files.append(rel)
    return files


def walk_nodes(obj, sink):
    """Yield every dict in the tree that carries an @id."""
    if isinstance(obj, dict):
        node_id = obj.get("@id")
        if isinstance(node_id, str):
            sink.append(obj)
        for v in obj.values():
            walk_nodes(v, sink)
    elif isinstance(obj, list):
        for v in obj:
            walk_nodes(v, sink)


def canon(value):
    """Stable comparable form, so list order does not create false positives."""
    return json.dumps(value, sort_keys=True, ensure_ascii=False)


def main(argv):
    quiet = "--quiet" in argv

    try:
        root = repo_root()
        files = tracked_html(root)
    except Exception as exc:                       # noqa: BLE001
        print("check_jsonld_node_consistency: could not run: %s" % exc,
              file=sys.stderr)
        return 2

    if not files:
        print("check_jsonld_node_consistency: no tracked HTML found; "
              "refusing to report clean on an empty scan", file=sys.stderr)
        return 2

    # @id -> property -> canonical value -> list of "path (occurrence)"
    graph = {}
    parsed_blocks = 0

    for rel in files:
        path = os.path.join(root, rel)
        try:
            text = io.open(path, encoding="utf-8").read()
        except OSError:
            continue
        for raw in SCRIPT_BLOCK.findall(text):
            try:
                doc = json.loads(raw)
            except ValueError:
                # A malformed block is a different defect with a different
                # owner. Do not fail closed on it here: this guard's claim is
                # only about cross-page agreement.
                continue
            parsed_blocks += 1
            nodes = []
            walk_nodes(doc, nodes)
            for node in nodes:
                nid = node["@id"]
                props = graph.setdefault(nid, {})
                for key, value in node.items():
                    if key in ("@id", "@context"):
                        continue
                    props.setdefault(key, {}).setdefault(canon(value), []).append(rel)

    if parsed_blocks == 0:
        print("check_jsonld_node_consistency: parsed 0 JSON-LD blocks across "
              "%d file(s); the scan cannot be distinguished from a broken "
              "matcher, so this is not a clean result" % len(files),
              file=sys.stderr)
        return 2

    findings = []
    for nid in sorted(graph):
        for prop in sorted(graph[nid]):
            variants = graph[nid][prop]
            if len(variants) > 1:
                findings.append((nid, prop, variants))

    if findings:
        print("check_jsonld_node_consistency: BLOCKED. %d contradiction(s): "
              "one @id, one property, more than one value."
              % len(findings), file=sys.stderr)
        for nid, prop, variants in findings:
            print('  @id "%s" property "%s":' % (nid, prop), file=sys.stderr)
            for value, where in sorted(variants.items()):
                shown = sorted(set(where))
                more = ""
                if len(shown) > 4:
                    more = " (+%d more)" % (len(shown) - 4)
                    shown = shown[:4]
                print("      %s" % value, file=sys.stderr)
                print("        in: %s%s" % (", ".join(shown), more),
                      file=sys.stderr)
        print("  Pick the value the canonical node should carry and make every "
              "page agree. A property present on one page and absent on "
              "another is fine; only differing values are blocked.",
              file=sys.stderr)
        return 1

    if not quiet:
        print("check_jsonld_node_consistency: OK. %d @id node(s) across %d "
              "JSON-LD block(s) in %d file(s); no property disagreements."
              % (len(graph), parsed_blocks, len(files)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
