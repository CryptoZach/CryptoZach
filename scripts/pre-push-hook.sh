#!/bin/sh
# Block force-push to origin unless ALLOW_FORCE_PUSH_ORIGIN=1.
# Warn when pushing to publications (not the website repo).
# See docs/SITE_REPO_SAFETY.md.
# Installed by scripts/install-pre-push-hook.sh.

remote="$1"
url="$2"

zero=$(git hash-object --stdin </dev/null | tr '[0-9a-f]' '0')

if test "$remote" = "publications"; then
	echo >&2 "pre-push: You are pushing to 'publications' (meshnet-depin-simulation). That repo is not the website. See docs/SITE_REPO_SAFETY.md."
fi

if test "$remote" = "origin" && test -z "$ALLOW_FORCE_PUSH_ORIGIN"; then
	while read local_ref local_oid remote_ref remote_oid; do
		if test "$local_oid" = "$zero"; then
			:
		elif test "$remote_oid" != "$zero"; then
			if ! git merge-base --is-ancestor "$remote_oid" "$local_oid" 2>/dev/null; then
				echo >&2 "pre-push: Push to origin is not fast-forward. Force-push is blocked."
				echo >&2 "  To override (use only if you know what you are doing): ALLOW_FORCE_PUSH_ORIGIN=1 git push origin ..."
				exit 1
			fi
		fi
	done
fi

exit 0
