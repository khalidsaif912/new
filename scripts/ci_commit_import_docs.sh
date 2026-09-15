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
  msg="Update IMPORT roster: ${filename}"
else
  msg="Refresh import roster pages"
fi

bash "$(dirname "$0")/ci_commit_and_push.sh" "$msg"
