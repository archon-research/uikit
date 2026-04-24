#!/usr/bin/env bash
set -euo pipefail

EVENT_NAME="${EVENT_NAME:?EVENT_NAME is required}"
SHA="${SHA:?SHA is required}"
GITHUB_WORKSPACE="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
PR_NUMBER="${PR_NUMBER:-}"
MERGED_PR_NUMBER="${MERGED_PR_NUMBER:-}"

TARGET_DIR="."
COMMIT_MSG="chore(preview): update main preview for ${SHA}"
if [[ "$EVENT_NAME" == "pull_request" ]]; then
  if [[ -z "$PR_NUMBER" ]]; then
    echo "PR_NUMBER is required for pull_request events"
    exit 1
  fi

  TARGET_DIR="pr/${PR_NUMBER}"
  COMMIT_MSG="chore(preview): update PR #${PR_NUMBER} for ${SHA}"
fi

WORKTREE_DIR="$(mktemp -d)"
trap 'git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true' EXIT

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch origin gh-pages
  git worktree add "$WORKTREE_DIR" origin/gh-pages
  cd "$WORKTREE_DIR"
  git checkout -B gh-pages
else
  git worktree add --detach "$WORKTREE_DIR"
  cd "$WORKTREE_DIR"
  git checkout --orphan gh-pages
  git rm -rf . >/dev/null 2>&1 || true
fi

mkdir -p pr

if [[ "$TARGET_DIR" == "." ]]; then
  # Keep the `pr` directory and replace everything else to avoid drift from stale hard-coded paths.
  find . -mindepth 1 -maxdepth 1 ! -name .git ! -name pr -exec rm -rf {} +
  cp -R "$GITHUB_WORKSPACE/packages/uikit-preview/dist/." .

  if [[ -n "$MERGED_PR_NUMBER" ]]; then
    rm -rf "pr/${MERGED_PR_NUMBER}"
  fi
else
  rm -rf "$TARGET_DIR"
  mkdir -p "$TARGET_DIR"
  cp -R "$GITHUB_WORKSPACE/packages/uikit-preview/dist/." "$TARGET_DIR"
fi

git add -A
if git diff --cached --quiet; then
  echo "No preview changes to publish"
  exit 0
fi

git commit -m "$COMMIT_MSG"
# Use an explicit refspec so this can only update gh-pages.
git push origin HEAD:gh-pages
