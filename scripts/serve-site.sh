#!/usr/bin/env bash
# scripts/serve-site.sh  (site-only clone)
#
# Ensure a localhost static preview of the site clone is running on :8080, so
# the "open localhost when a site edit is made" forcing function always lands on
# a live server. The PERMANENT mechanism is a launchd user agent
# (com.tokenizationsystems.site-preview) with KeepAlive, so :8080 stays up across
# crashes and logins; this script installs/loads that agent and is also the
# idempotent ensure-up path the edit hook calls.
#
# Pages are static HTML, so `python3 -m http.server` (fast) is sufficient; use
# `bundle exec jekyll serve` separately when include/content-hash fidelity is
# needed (see docs/SITE_REPO_SAFETY.md).
#
# Usage:
#   bash scripts/serve-site.sh              # ensure :8080 is serving (idempotent)
#   bash scripts/serve-site.sh --install    # install + load the launchd agent (permanent)
#   bash scripts/serve-site.sh --status     # report serving/down
#   bash scripts/serve-site.sh --restart    # kick the server
#
# Env: CZ_SITE_REPO (default /Users/zach/ai-research/CryptoZach), CZ_PREVIEW_PORT (8080).
set -uo pipefail

SITE="${CZ_SITE_REPO:-/Users/zach/ai-research/CryptoZach}"
PORT="${CZ_PREVIEW_PORT:-8080}"
LABEL="com.tokenizationsystems.site-preview"
PLIST_SRC="$SITE/scripts/${LABEL}.plist"
PLIST_DST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG="/tmp/cz-site-preview-${PORT}.log"
PY="$(command -v python3 || echo /usr/bin/python3)"

serving() { curl -s -m 2 -o /dev/null "http://127.0.0.1:${PORT}/" 2>/dev/null; }

reap_stale() {
  # Kill any non-serving http.server on this port (leftover hook starts). Only
  # this exact port; never touches other sessions' --bind servers on other ports.
  for pid in $(pgrep -f "http.server ${PORT}\b" 2>/dev/null); do kill "$pid" 2>/dev/null || true; done
  sleep 0.3
}

manual_start() {
  reap_stale
  ( cd "$SITE" && nohup "$PY" -m http.server "$PORT" --bind 127.0.0.1 >"$LOG" 2>&1 </dev/null & )
  for _ in 1 2 3 4 5 6; do serving && return 0; sleep 0.4; done
  return 1
}

case "${1:-}" in
  --status)
    serving && { echo "site preview UP: http://localhost:${PORT}/ (serving $SITE)"; exit 0; } || { echo "site preview DOWN on :${PORT}"; exit 1; }
    ;;
  --install)
    mkdir -p "$HOME/Library/LaunchAgents"
    if [ -f "$PLIST_SRC" ]; then cp "$PLIST_SRC" "$PLIST_DST"; else echo "ERROR: missing $PLIST_SRC" >&2; exit 2; fi
    launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
    if launchctl bootstrap "gui/$(id -u)" "$PLIST_DST" 2>/dev/null; then :; else launchctl load "$PLIST_DST" 2>/dev/null || true; fi
    launchctl enable "gui/$(id -u)/${LABEL}" 2>/dev/null || true
    sleep 1
    serving && echo "launchd agent loaded; site preview UP: http://localhost:${PORT}/" || { echo "agent loaded but not serving yet; falling back to manual start"; manual_start && echo "up via manual start" || echo "FAILED; see $LOG" >&2; }
    exit 0
    ;;
  --restart)
    launchctl kickstart -k "gui/$(id -u)/${LABEL}" 2>/dev/null || manual_start
    serving && echo "restarted; UP" || { manual_start && echo "up (manual)" || { echo "FAILED; see $LOG" >&2; exit 1; }; }
    exit 0
    ;;
esac

# default: ensure up (idempotent; cheap no-op if already serving)
if serving; then exit 0; fi
# prefer the launchd agent if it is installed; else manual start
if [ -f "$PLIST_DST" ]; then
  launchctl kickstart "gui/$(id -u)/${LABEL}" 2>/dev/null || true
  for _ in 1 2 3 4; do serving && exit 0; sleep 0.4; done
fi
manual_start && exit 0
echo "WARN: could not start site preview on :${PORT} (see $LOG)" >&2
exit 1
