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
#
# OWNERSHIP RULE: while the launchd agent is loaded it OWNS :8080. This script may start it, but never
# kills its server and never starts a second one beside it. A manual server (the STAND-IN) runs only
# while the agent is not loaded; its pid is recorded, and once the agent is loaded the stand-in is
# stopped so the agent can bind. Nothing is ever killed by pattern: only the recorded stand-in.
#
# WHY (2026-09-29, measured on the Mac). The agent's stderr held 4,710 "Address already in use"
# restarts: a manual server held :8080 and KeepAlive kept restarting the agent into the taken port. This
# script's fallback is what starts manual servers. Its 2-second probe read a slow agent on a loaded box
# as down, and the old --install (bootout, then bootstrap, then a 1-second check) and --restart
# (kickstart -k, then an immediate check) opened windows in which the agent's server was not bound yet.
# A manual start while the agent holds the port only fails to bind; one that lands in such a window
# keeps the port.
# The old reap step was not involved: its `pgrep -f "http.server 8080\b"` matches nothing on macOS,
# which has no \b in its regex (measured 2026-09-30: no match with it, the agent's server without it),
# so it never killed anything here. Nor could it have cleared the loop, since it ran only before a
# manual start, and a stand-in outliving an agent reload is exactly what it left behind. Every wait
# below is bounded and short, because the edit hook calls this synchronously.
set -uo pipefail

SITE="${CZ_SITE_REPO:-/Users/zach/ai-research/CryptoZach}"
PORT="${CZ_PREVIEW_PORT:-8080}"
LABEL="com.tokenizationsystems.site-preview"
PLIST_SRC="$SITE/scripts/${LABEL}.plist"
PLIST_DST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/Library/Logs/cryptozach"          # not /tmp: /tmp is purged at reboot
LOG="$LOG_DIR/cz-site-preview-${PORT}.manual.log"
PIDFILE="$LOG_DIR/cz-site-preview-${PORT}.manual.pid"
PY="$(command -v python3 || echo /usr/bin/python3)"
DOM="gui/$(id -u)"

# serving [bound]: does :$PORT answer within <bound> seconds (default 2)? One miss can mean SLOW.
serving() { curl -s -m "${1:-2}" -o /dev/null "http://127.0.0.1:${PORT}/" 2>/dev/null; }
agent_loaded() { launchctl print "$DOM/${LABEL}" >/dev/null 2>&1; }
agent_pid() { launchctl print "$DOM/${LABEL}" 2>/dev/null | awk -F' = ' '$1=="\tpid"{print $2; exit}'; }

# stop_standin: stop the manual server THIS script recorded, and nothing else. The pid must still be an
# http.server on this port (a pid reused by another program is left alone) and never the agent's own.
stop_standin() {
  [ -s "$PIDFILE" ] || return 0
  local pid cmd ap
  pid="$(head -n 1 "$PIDFILE" 2>/dev/null)"
  case "$pid" in ''|*[!0-9]*) rm -f "$PIDFILE"; return 0 ;; esac
  cmd="$(ps -o command= -p "$pid" 2>/dev/null)"
  ap="$(agent_pid)"
  case "$cmd" in
    *"http.server ${PORT} "*|*"http.server ${PORT}")
      if [ "$pid" != "$ap" ]; then
        kill "$pid" 2>/dev/null || true
        for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$pid" 2>/dev/null || break; sleep 0.2; done
      fi
      ;;
  esac
  rm -f "$PIDFILE"
}

manual_start() {
  # Never beside a loaded agent: two servers for one port is the restart loop in the header.
  if agent_loaded; then echo "launchd agent ${LABEL} owns :${PORT}; not starting a second server" >&2; return 1; fi
  stop_standin
  mkdir -p "$LOG_DIR"
  ( cd "$SITE" && exec nohup "$PY" -m http.server "$PORT" --bind 127.0.0.1 ) >>"$LOG" 2>&1 </dev/null &
  echo "$!" > "$PIDFILE"
  for _ in 1 2 3 4 5 6; do serving && return 0; sleep 0.4; done
  return 1
}

# handover: the agent is loaded, so a recorded stand-in steps aside and the agent is started if idle.
handover() {
  stop_standin
  [ -n "$(agent_pid)" ] || launchctl kickstart "$DOM/${LABEL}" 2>/dev/null || true
}

case "${1:-}" in
  --status)
    serving && { echo "site preview UP: http://localhost:${PORT}/ (serving $SITE)"; exit 0; } || { echo "site preview DOWN on :${PORT}"; exit 1; }
    ;;
  --install)
    mkdir -p "$HOME/Library/LaunchAgents"
    if [ -f "$PLIST_SRC" ]; then cp "$PLIST_SRC" "$PLIST_DST"; else echo "ERROR: missing $PLIST_SRC" >&2; exit 2; fi
    launchctl bootout "$DOM/${LABEL}" 2>/dev/null || true
    if launchctl bootstrap "$DOM" "$PLIST_DST" 2>/dev/null; then :; else launchctl load "$PLIST_DST" 2>/dev/null || true; fi
    launchctl enable "$DOM/${LABEL}" 2>/dev/null || true
    agent_loaded && handover
    sleep 1
    if serving 5; then echo "launchd agent loaded; site preview UP: http://localhost:${PORT}/"
    else echo "agent loaded but not answering yet; launchd owns :${PORT}, so no manual start (see ~/Library/Logs/cryptozach/cz-site-preview-${PORT}.err)"; fi
    exit 0
    ;;
  --restart)
    if agent_loaded; then stop_standin; launchctl kickstart -k "$DOM/${LABEL}" 2>/dev/null || true; else manual_start || true; fi
    for _ in 1 2 3; do serving 5 && { echo "restarted; UP"; exit 0; }; sleep 1; done
    echo "restarted but not answering yet (slow is not down; see $LOG or the agent's .err log)" >&2
    exit 1
    ;;
esac

# default: ensure up (idempotent; cheap no-op if already serving). A recorded stand-in is checked FIRST,
# because once the agent is loaded a stand-in that answers here is the loop in the header, not a success.
# With no stand-in recorded (the normal state) this costs one file test before the probe.
if [ -s "$PIDFILE" ] && agent_loaded; then handover; fi
if serving; then exit 0; fi
# A loaded agent owns the port: start it if it is not running, give it a bounded moment (about 12s at
# most, since the edit hook waits on this), and never start a second server beside it.
if agent_loaded; then
  [ -n "$(agent_pid)" ] || launchctl kickstart "$DOM/${LABEL}" 2>/dev/null || true
  for _ in 1 2 3; do serving 3 && exit 0; sleep 1; done
  echo "WARN: ${LABEL} owns :${PORT} and did not answer within about 12s; not starting a second server" >&2
  exit 1
fi
manual_start && exit 0
echo "WARN: could not start site preview on :${PORT} (see $LOG)" >&2
exit 1
