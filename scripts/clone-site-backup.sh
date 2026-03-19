#!/bin/sh
# Clone or pull CryptoZach/CryptoZach into a sibling directory for a known-good backup.
# Does not push. Run from repo root. See docs/SITE_REPO_SAFETY.md.

set -e
root="$(git rev-parse --show-toplevel)"
cd "$root"
backup_dir="${1:-$(dirname "$root")/CryptoZach-site-backup}"
repo_url="https://github.com/CryptoZach/CryptoZach.git"

if test -d "$backup_dir/.git"; then
	echo "Pulling existing backup at $backup_dir"
	git -C "$backup_dir" fetch origin
	git -C "$backup_dir" checkout main
	git -C "$backup_dir" merge --ff-only origin/main
else
	echo "Cloning CryptoZach/CryptoZach into $backup_dir"
	git clone "$repo_url" "$backup_dir"
	git -C "$backup_dir" checkout main
fi
echo "Backup at $backup_dir is up to date with origin/main"
