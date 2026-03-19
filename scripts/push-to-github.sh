#!/usr/bin/env bash
# One-time script to commit (if needed) and push to https://github.com/CryptoZach/CryptoZach
set -e
cd "$(dirname "$0")/.."
echo "Branch: $(git branch --show-current)"
echo "Remote origin: $(git remote get-url origin)"
echo ""
if [[ -n $(git status -s) ]]; then
  echo "Staging and committing..."
  git add -A
  git commit -m "Site updates: Get in touch link, resume hub buttons, selected-research filters and labels, paper full-bleed and Control Layer image, proof bar revert, kicker/title copy, Start Here utility card, remove duplicate lines and link row"
  echo "Committed."
else
  echo "Working tree clean (no new changes to commit)."
fi
echo ""
echo "Pushing to origin main..."
git push origin main
echo "Done."
