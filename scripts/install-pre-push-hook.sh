#!/bin/sh
# Install the pre-push hook from scripts/pre-push-hook.sh into .git/hooks/pre-push.
# Run from repo root. See docs/SITE_REPO_SAFETY.md.

set -e
cd "$(git rev-parse --show-toplevel)"
hook_src=scripts/pre-push-hook.sh
hook_dst=.git/hooks/pre-push

if test ! -f "$hook_src"; then
	echo "Error: $hook_src not found. Run from repo root." >&2
	exit 1
fi
cp "$hook_src" "$hook_dst"
chmod +x "$hook_dst"
echo "Installed pre-push hook to $hook_dst"
