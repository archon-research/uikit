#!/usr/bin/env bash
set -euo pipefail

PR_NUMBER="${PR_NUMBER:?PR_NUMBER is required}"
TARGET_DIR="pr/${PR_NUMBER}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/gh-pages.sh
source "${SCRIPT_DIR}/lib/gh-pages.sh"

gh_pages_configure_identity

WORKTREE_DIR=""
trap '[[ -n "$WORKTREE_DIR" ]] && git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true' EXIT

attempt=1
while true; do
  WORKTREE_DIR="$(mktemp -d)"

  if ! gh_pages_checkout "$WORKTREE_DIR" require-existing; then
    echo "gh-pages branch does not exist, nothing to clean"
    rm -rf "$WORKTREE_DIR"
    WORKTREE_DIR=""
    exit 0
  fi

  if [[ ! -d "$WORKTREE_DIR/$TARGET_DIR" ]]; then
    echo "No preview folder for this PR"
    git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
    WORKTREE_DIR=""
    exit 0
  fi

  rm -rf "${WORKTREE_DIR:?}/${TARGET_DIR}"

  result="$(gh_pages_commit_and_push "$WORKTREE_DIR" "chore(preview): remove PR #${PR_NUMBER} preview")"
  git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
  WORKTREE_DIR=""

  case "$result" in
    pushed)
      echo "Removed PR #${PR_NUMBER} preview from gh-pages"
      break
      ;;
    no-changes)
      echo "No changes after cleanup"
      break
      ;;
    conflict)
      if (( attempt >= GH_PAGES_MAX_ATTEMPTS )); then
        echo "gh-pages kept moving; failed to clean up after ${attempt} attempts" >&2
        exit 1
      fi
      echo "gh-pages moved during cleanup, rebuilding and retrying" >&2
      gh_pages_backoff "$attempt"
      attempt=$(( attempt + 1 ))
      ;;
  esac
done
