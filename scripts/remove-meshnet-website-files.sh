#!/bin/sh
# Remove website-related files from Research-Publications-and-Data/meshnet-depin-simulation.
# Run from CryptoZach repo root. Requires push access to meshnet-depin-simulation.
# Changelog content was moved to docs/changelog-research-pages-merge.md in CryptoZach/CryptoZach.

set -e
root="$(git rev-parse --show-toplevel)"
cd "$root"
cleanup_dir="${root}/meshnet-cleanup"
repo_url="https://github.com/Research-Publications-and-Data/meshnet-depin-simulation.git"

rm -rf "$cleanup_dir"
git clone "$repo_url" "$cleanup_dir"
cd "$cleanup_dir"

git rm changelog.md
git rm papers/adaptive-tokenomics.html papers/operational-risk-token-economies.html
git rm -r resume/

git commit -m "Remove website files: changelog, paper pages, resume tree

- changelog.md: site changelog moved to CryptoZach/CryptoZach (docs/changelog-research-pages-merge.md)
- papers/adaptive-tokenomics.html, papers/operational-risk-token-economies.html: website paper pages
- resume/: website resume hub (belongs in CryptoZach/CryptoZach)

This repo is for DePIN simulation only."

git push origin main
echo "Pushed. Removing local clone."
rm -rf "$cleanup_dir"
echo "Done."
