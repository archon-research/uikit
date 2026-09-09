#!/usr/bin/env bash
set -euo pipefail

EVENT_NAME="${EVENT_NAME:?EVENT_NAME is required}"
SHA="${SHA:?SHA is required}"
GITHUB_WORKSPACE="${GITHUB_WORKSPACE:?GITHUB_WORKSPACE is required}"
PR_NUMBER="${PR_NUMBER:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/gh-pages.sh
source "${SCRIPT_DIR}/lib/gh-pages.sh"

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

gh_pages_configure_identity

WORKTREE_DIR=""
trap '[[ -n "$WORKTREE_DIR" ]] && git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true' EXIT

attempt=1
while true; do
  WORKTREE_DIR="$(mktemp -d)"
  gh_pages_checkout "$WORKTREE_DIR" create-if-missing

  mkdir -p "$WORKTREE_DIR/pr"

  if [[ "$TARGET_DIR" == "." ]]; then
    # Keep the pr directory and replace everything else to avoid drift from stale paths.
    PR_BACKUP_DIR="$(mktemp -d)"
    if [[ -n "$(ls -A "$WORKTREE_DIR/pr" 2>/dev/null)" ]]; then
      cp -R "$WORKTREE_DIR/pr/." "$PR_BACKUP_DIR/"
    fi

    find "$WORKTREE_DIR" -mindepth 1 -maxdepth 1 ! -name .git ! -name pr -exec rm -rf {} +
    cp -R "$GITHUB_WORKSPACE/packages/uikit-preview/dist/." "$WORKTREE_DIR/"

    if [[ -n "$(ls -A "$PR_BACKUP_DIR" 2>/dev/null)" ]]; then
      cp -R "$PR_BACKUP_DIR/." "$WORKTREE_DIR/pr/"
    fi
    rm -rf "$PR_BACKUP_DIR"
  else
    rm -rf "${WORKTREE_DIR:?}/${TARGET_DIR}"
    mkdir -p "$WORKTREE_DIR/$TARGET_DIR"
    cp -R "$GITHUB_WORKSPACE/packages/uikit-preview/dist/." "$WORKTREE_DIR/$TARGET_DIR"
  fi

  result="$(gh_pages_commit_and_push "$WORKTREE_DIR" "$COMMIT_MSG")"
  git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
  WORKTREE_DIR=""

  case "$result" in
    pushed)
      echo "Published preview to gh-pages"
      break
      ;;
    no-changes)
      echo "No preview changes to publish"
      break
      ;;
    conflict)
      if (( attempt >= GH_PAGES_MAX_ATTEMPTS )); then
        echo "gh-pages kept moving; failed to publish after ${attempt} attempts" >&2
        exit 1
      fi
      echo "gh-pages moved during publish, rebuilding and retrying" >&2
      gh_pages_backoff "$attempt"
      attempt=$(( attempt + 1 ))
      ;;
  esac
done
