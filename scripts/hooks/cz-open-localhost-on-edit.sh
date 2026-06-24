#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit): when a SERVED site file is edited,
# open the relevant page on a LIVE localhost preview so the change is verified
# in the browser. The "always open localhost when making a site change"
# forcing function (per docs/SITE_REPO_SAFETY.md).
#
# Committed in-repo (scripts/hooks/) and installed into .git/hooks +
# settings.local.json by scripts/install-site-hooks.sh, so it survives a fresh
# clone and is not stranded in ~/.claude/hooks (the verified durability gap).
#
# Fixes over the prior ~/.claude/hooks version (2026-06-24 cutover step 12):
#   (a) REPO is resolved from the EDITED FILE's git toplevel (or CZ_SITE_REPO),
#       so it works in the site clone, the workflow clone, AND every worktree,
#       instead of a hardcoded /Users/zach/ai-research/CryptoZach that no-ops
#       for all workflow/worktree edits.
#   (b) Matches SERVED .html/.css/.js/_config.yml, not *.html only (styles.css
#       and script.js, the files that diverged, got NO prompt before).
#   (c) For CSS/JS edits, opens a consuming page (or the homepage) so the
#       change is actually visible.
#   (d) Probes which server is listening (:8080 then :4000); if none, reports
#       (dry-run) or starts `python3 -m http.server 8080` (the verified-up port;
#       the old hook opened a dead :4000 tab).
#
# Reads the hook JSON payload on stdin. No-ops quietly for non-site files. Set
# CZ_HOOK_DRYRUN=1 to print the resolved URL/plan instead of touching a browser.
set -uo pipefail

input="$(cat)"
fp="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[ -n "$fp" ] || exit 0
[ -e "$fp" ] || exit 0

# (a) Resolve the repo from the edited file's location (worktree-safe).
dir="$(dirname "$fp")"
REPO="${CZ_SITE_REPO:-$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)}"
[ -n "$REPO" ] || exit 0
case "$fp" in "$REPO"/*) ;; *) exit 0 ;; esac

rel="${fp#"$REPO"/}"
# Skip build artifacts / non-served trees.
case "$rel" in _site/*|playwright-report/*|_drafts/*|node_modules/*|.git/*|scripts/*|.claude/*|.cursor/*) exit 0 ;; esac

# (b) Only SERVED-ish web assets.
case "$rel" in
  *.html|*.css|*.js|_config.yml) ;;
  *) exit 0 ;;
esac

# (c) Determine which page to open.
case "$rel" in
  *.css|*.js|_config.yml)
    # Open a page that references the asset so the change is visible; fall back
    # to the homepage. (grep is best-effort; never fail the hook on it.)
    base="$(basename "$rel")"
    consumer="$(grep -rl --include=*.html "$base" "$REPO" 2>/dev/null \
                  | grep -vE '/_site/|/node_modules/|/playwright-report/' \
                  | head -1 || true)"
    if [ -n "$consumer" ]; then
      crel="${consumer#"$REPO"/}"
      case "$crel" in
        index.html)   url_path="/" ;;
        */index.html) url_path="/${crel%index.html}" ;;
        *)            url_path="/$crel" ;;
      esac
    else
      url_path="/"
    fi
    ;;
  index.html)   url_path="/" ;;
  */index.html) url_path="/${rel%index.html}" ;;
  *)            url_path="/$rel" ;;
esac

# (d) Ensure the always-on site preview is up, then open the edited page on it.
# The PERMANENT server is the launchd agent (com.tokenizationsystems.site-preview,
# KeepAlive + RunAtLoad, serving the site clone on :8080); scripts/serve-site.sh
# is the idempotent ensure-path (kickstarts the agent, or manual-starts as a
# fallback). This replaces the old fragile inline `nohup ... http.server &` that
# did not persist past the hook process (the verified "8080 still isn't running"
# failure).
SITE_CLONE="${CZ_SITE_REPO:-/Users/zach/ai-research/CryptoZach}"
PORT="${CZ_PREVIEW_PORT:-8080}"
url="http://localhost:${PORT}${url_path}"

if [ "${CZ_HOOK_DRYRUN:-}" = "1" ]; then
  printf '%s\n' "$url"
  exit 0
fi

# Bring the preview up if it is not already serving (no-op when it is).
bash "$SITE_CLONE/scripts/serve-site.sh" >/dev/null 2>&1 || true
printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$url" >> /tmp/cz-open-localhost.log 2>/dev/null || true

# Open via LaunchServices (`open`), not AppleScript: `open` only asks Chrome to
# open a URL, needing no Automation permission.
open -a "Google Chrome" "$url" >/dev/null 2>&1 || open "$url" >/dev/null 2>&1 || true
exit 0
