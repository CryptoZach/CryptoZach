#!/usr/bin/env bash
# scripts/install-site-hooks.sh  (site-only clone)
#
# Install the committed site-clone hooks into .git/hooks and point the Claude
# Code settings at the in-repo hook bodies, so the guards survive a fresh clone
# and are NOT stranded in ~/.claude/hooks (the verified durability gap; 2026-06-24
# cutover step 11).
#
# Installs:
#   .git/hooks/pre-push    <- scripts/hooks/pre-push     (staleness + force-block + SERVED content-ancestry)
#   .git/hooks/pre-commit  <- scripts/hooks/pre-commit   (Layer 2 workflow-path + em-dash guard)
# Rewires settings.local.json hook commands (if they point at ~/.claude/hooks)
# to the in-repo paths:
#   PostToolUse   -> scripts/hooks/cz-open-localhost-on-edit.sh
#   SessionStart  -> scripts/hooks/cz-fetch-warn-stale-main.sh
#
# Resolves git-common-dir so worktrees are covered. Run from anywhere in the clone.
#
# Usage:
#   bash scripts/install-site-hooks.sh           # install + rewire
#   bash scripts/install-site-hooks.sh --check   # report only (exit 1 if anything missing/drifted)
set -eu

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
HOOKS_DIR="$(git rev-parse --git-common-dir 2>/dev/null)/hooks"
test -d "$HOOKS_DIR" || HOOKS_DIR=.git/hooks

MODE=install
case "${1:-}" in
  --check) MODE=check ;;
  -h|--help) grep -E '^#' "$0" | sed 's/^#\{1,2\} \{0,1\}//'; exit 0 ;;
  "") ;;
  *) echo "Error: unknown flag '${1}'." >&2; exit 1 ;;
esac

install_one() {  # src basename
  local name="$1" src="scripts/hooks/$1" dst="$HOOKS_DIR/$1"
  if [ ! -f "$src" ]; then echo "ERROR: missing committed hook $src" >&2; return 1; fi
  if [ "$MODE" = check ]; then
    if [ ! -f "$dst" ]; then echo "  MISSING: $dst"; return 1; fi
    if cmp -s "$src" "$dst"; then echo "  OK: $dst matches $src"; return 0; fi
    echo "  DRIFT: $dst differs from $src"; return 1
  fi
  cp "$src" "$dst"; chmod +x "$dst"; echo "  installed $dst"
}

# Rewire settings.local.json hook command paths to the in-repo bodies.
rewire_settings() {
  local sf=".claude/settings.local.json"
  [ -f "$sf" ] || { echo "  (no $sf; skipping settings rewire)"; return 0; }
  if [ "$MODE" = check ]; then
    if grep -q '/.claude/hooks/cz-' "$sf" 2>/dev/null; then
      echo "  DRIFT: $sf still references ~/.claude/hooks (run installer to rewire)"; return 1
    fi
    echo "  OK: $sf references in-repo hooks (or none)"; return 0
  fi
  ROOT="$ROOT" python3 - "$sf" <<'PY'
import json, os, sys, io
sf = sys.argv[1]; root = os.environ["ROOT"]
try:
    data = json.load(open(sf))
except Exception as e:
    print(f"  WARN: could not parse {sf}: {e}"); sys.exit(0)
repl = {
    "cz-open-localhost-on-edit.sh": f"{root}/scripts/hooks/cz-open-localhost-on-edit.sh",
    "cz-fetch-warn-stale-main.sh":  f"{root}/scripts/hooks/cz-fetch-warn-stale-main.sh",
}
changed = 0
def fix(node):
    global changed
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "command" and isinstance(v, str):
                for base, newp in repl.items():
                    if v.endswith(base) and v != newp:
                        node[k] = newp; changed += 1
            else:
                fix(v)
    elif isinstance(node, list):
        for x in node: fix(x)
fix(data)
if changed:
    json.dump(data, open(sf, "w"), indent=2); open(sf, "a").write("\n")
    print(f"  rewired {changed} hook command path(s) in {sf} to in-repo scripts/hooks/")
else:
    print(f"  {sf} hook commands already point at in-repo paths (or none matched)")
PY
}

echo "=== install-site-hooks ($MODE) ==="
rc=0
install_one pre-push   || rc=1
install_one pre-commit || rc=1
rewire_settings        || rc=1
if [ "$MODE" = check ]; then
  [ "$rc" -eq 0 ] && echo "All site hooks installed and in sync." || echo "Site hooks NOT fully installed (see above)." >&2
  exit "$rc"
fi
echo "Done. Note: the PostToolUse localhost + SessionStart fetch-warn bodies are referenced from"
echo "settings.local.json; deleting ~/.claude/hooks/* no longer disables the guards."
exit 0
