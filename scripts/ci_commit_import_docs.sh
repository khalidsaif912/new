#!/usr/bin/env bash
set -euo pipefail

changed="${1:-false}"
filename="${2:-import roster}"

git config user.name "github-actions"
git config user.email "github-actions@github.com"
git add docs/import import-rosters import_last_filename.txt
git add docs/name_translations.json 2>/dev/null || true

if git diff --staged --quiet; then
  echo "No changes to commit"
  exit 0
fi

if [ "$changed" = "true" ]; then
  git commit -m "Update IMPORT roster: ${filename}"
else
  git commit -m "Refresh import roster pages"
fi

for attempt in 1 2 3; do
  git pull --rebase --autostash origin main
  if git push origin HEAD:main; then
    echo "Pushed!"
    exit 0
  fi
  echo "Push failed (attempt ${attempt}/3); retrying in 5s ..."
  sleep 5
done

echo "ERROR: git push failed after 3 attempts" >&2
exit 1
