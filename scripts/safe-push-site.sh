#!/bin/sh
# Push to origin main only if origin is CryptoZach/CryptoZach.
# Run from repo root. See docs/SITE_REPO_SAFETY.md.

set -e
root="$(git rev-parse --show-toplevel)"
cd "$root"
origin_url="$(git remote get-url origin)"
want="CryptoZach/CryptoZach"

case "$origin_url" in
*"$want"*)
	git push origin main
	;;
*)
	echo "safe-push-site: origin is not CryptoZach/CryptoZach." >&2
	echo "  origin URL: $origin_url" >&2
	echo "  To update the live site, use a clone where origin is https://github.com/CryptoZach/CryptoZach.git" >&2
	echo "  See docs/SITE_REPO_SAFETY.md" >&2
	exit 1
	;;
esac
