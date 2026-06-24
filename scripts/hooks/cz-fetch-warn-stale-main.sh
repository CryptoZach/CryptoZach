#!/usr/bin/env bash
# SessionStart hook for the CryptoZach public-site clone (committed source;
# installed by scripts/install-site-hooks.sh).
#
# Two warnings, both warn-only (never auto-pulls, never blocks startup):
#   (A) Behind-origin staleness: parallel worktree/agent sessions push to the
#       SAME origin/main and this clone does not auto-sync, so a fresh session
#       can build on a base already behind origin and only discover it at push.
#   (B) Cross-clone SERVED divergence (2026-06-24 cutover step 10): the workflow
#       clone (the `workflow` filesystem remote) and this canonical site clone
#       can diverge on served paths. This makes detection SYMMETRIC; previously
#       only the WF side surfaced it, and the SITE side was blind.
#
# Companion: .git/hooks/pre-push (staleness + force-block + SERVED
# content-ancestry). See memory feedback_fetch_before_edit_site_clone and
# docs/SITE_REPO_SAFETY.md.
set -uo pipefail

REPO="${CLAUDE_PROJECT_DIR:-$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel 2>/dev/null || echo /Users/zach/ai-research/CryptoZach)}"

git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 || exit 0
case "$(git -C "$REPO" remote get-url origin 2>/dev/null || true)" in
  *CryptoZach/CryptoZach*) : ;;
  *) exit 0 ;;
esac

# (A) behind-origin staleness.
git -C "$REPO" -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=8 \
    fetch --quiet origin main 2>/dev/null || true
behind="$(git -C "$REPO" rev-list --count main..origin/main 2>/dev/null || echo 0)"
ahead="$(git -C "$REPO" rev-list --count origin/main..main 2>/dev/null || echo 0)"

msg=""
if [ "${behind:-0}" -gt 0 ]; then
  state="${behind} commit(s) BEHIND origin/main"
  [ "${ahead:-0}" -gt 0 ] && state="${state} and ${ahead} ahead (DIVERGED)"
  recent="$(git -C "$REPO" log --oneline -5 main..origin/main 2>/dev/null || true)"
  msg="COORDINATION WARNING (CryptoZach site clone): local main is ${state}.
Sibling sessions push to the same origin/main; this clone does not auto-sync. Building on this stale base will get the deploy push rejected.
ACTION before editing/committing: git pull --rebase --autostash origin main
New on origin/main not yet local:
${recent}"
fi

# (B) cross-clone SERVED divergence via the WF clone's manifest-scoped detector.
wf_url="$(git -C "$REPO" remote get-url workflow 2>/dev/null || true)"
if [ -n "$wf_url" ] && [ -d "$wf_url" ]; then
  git -C "$REPO" fetch --quiet workflow 2>/dev/null || true
  detector="$wf_url/scripts/check_site_divergence.sh"
  if [ -x "$detector" ] || [ -f "$detector" ]; then
    if ! CZ_SITE_REPO="$REPO" bash "$detector" --trees --quiet >/dev/null 2>&1; then
      cc="CROSS-CLONE SITE DIVERGENCE: served paths differ between the workflow clone ($wf_url) and this canonical site clone.
The site-only clone is canonical; reconcile WF-newer hunks via the workflow clone's scripts/reconcile_site_clones.sh (hunk-level), never a whole-file copy or a force-push.
Detail: CZ_SITE_REPO=$REPO bash $detector --trees"
      msg="${msg:+$msg

}${cc}"
    fi
  fi
fi

[ -n "$msg" ] || exit 0

if command -v jq >/dev/null 2>&1; then
  jq -nc --arg ctx "$msg" \
    '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$ctx}}'
else
  python3 - "$msg" <<'PY'
import json, sys
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": sys.argv[1]}}))
PY
fi
exit 0
