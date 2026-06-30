#!/usr/bin/env bash
set -euo pipefail

changed="${1:-false}"
filename="${2:-import roster}"

git config user.name "github-actions"
git config user.email "github-actions@github.com"
git add docs/import import-rosters import_last_filename.txt

if git diff --staged --quiet; then
  echo "No changes to commit"
  exit 0
fi

if [ "$changed" = "true" ]; then
  git commit -m "Update IMPORT roster: ${filename}"
else
  git commit -m "Refresh import roster pages"
fi

git pull --rebase --autostash
git push
echo "Pushed!"
