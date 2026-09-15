#!/usr/bin/env bash
# Stage files first, then:
#   bash scripts/ci_commit_and_push.sh "commit message"
#
# Commits only if the index has changes, then pull --rebase + push with retries
# so export/import/training/absence cannot lose a generate because another
# workflow pushed main first.
set -euo pipefail

msg="${1:?commit message required}"
branch="${GITHUB_REF_NAME:-main}"

git config user.name "github-actions"
git config user.email "github-actions@github.com"

if git diff --staged --quiet; then
  echo "No changes to commit"
  exit 0
fi

git commit -m "$msg"

# Shallow Actions checkouts cannot rebase onto origin/main; deepen first.
if [ "$(git rev-parse --is-shallow-repository 2>/dev/null || echo false)" = "true" ]; then
  git fetch --prune --unshallow origin "$branch" || git fetch --prune --depth=200 origin "$branch"
fi

for attempt in 1 2 3 4 5; do
  git fetch origin "$branch"
  if git pull --rebase --autostash origin "$branch" && git push origin "HEAD:$branch"; then
    echo "Pushed!"
    exit 0
  fi
  echo "Push failed (attempt ${attempt}/5); retrying in $((attempt * 5))s ..."
  sleep $((attempt * 5))
done

echo "ERROR: git push failed after 5 attempts" >&2
exit 1
