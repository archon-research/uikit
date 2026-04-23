#!/usr/bin/env bash
set -euo pipefail

PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
TARGET_DIR="pr/${PR_NUMBER}"
WORKTREE_DIR="$(mktemp -d)"
trap 'git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true' EXIT

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

if ! git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  echo "gh-pages branch does not exist, nothing to clean"
  exit 0
fi

git fetch origin gh-pages
git worktree add "$WORKTREE_DIR" origin/gh-pages
cd "$WORKTREE_DIR"
git checkout -B gh-pages

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "No preview folder for this PR"
  exit 0
fi

rm -rf "$TARGET_DIR"
git add -A

if git diff --cached --quiet; then
  echo "No changes after cleanup"
  exit 0
fi

git commit -m "chore(preview): remove PR #${PR_NUMBER} preview"
# Use an explicit refspec so this can only update gh-pages.
git push origin HEAD:gh-pages
