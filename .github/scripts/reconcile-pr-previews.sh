#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-archon-research/uikit}"

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
    echo "gh-pages branch does not exist, nothing to reconcile"
    rm -rf "$WORKTREE_DIR"
    WORKTREE_DIR=""
    exit 0
  fi

  if [[ ! -d "$WORKTREE_DIR/pr" ]]; then
    echo "No pr/ directory on gh-pages, nothing to reconcile"
    git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
    WORKTREE_DIR=""
    exit 0
  fi

  mapfile -t open_prs < <(gh pr list --repo "$REPO" --state open --limit 500 --json number -q '.[].number')
  declare -A open_pr_set=()
  for n in "${open_prs[@]}"; do
    open_pr_set["$n"]=1
  done

  stale=()
  for dir in "$WORKTREE_DIR"/pr/*/; do
    [[ -d "$dir" ]] || continue
    n="$(basename "$dir")"
    [[ "$n" =~ ^[0-9]+$ ]] || continue
    if [[ -z "${open_pr_set[$n]:-}" ]]; then
      stale+=("$n")
    fi
  done
  unset open_pr_set

  if [[ ${#stale[@]} -eq 0 ]]; then
    echo "No stale PR preview folders found"
    git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
    WORKTREE_DIR=""
    exit 0
  fi

  echo "Removing stale preview folders for closed PRs: ${stale[*]}"
  for n in "${stale[@]}"; do
    rm -rf "${WORKTREE_DIR:?}/pr/${n}"
  done

  result="$(gh_pages_commit_and_push "$WORKTREE_DIR" "chore(preview): reconcile stale PR previews (${stale[*]})")"
  git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
  WORKTREE_DIR=""

  case "$result" in
    pushed | no-changes)
      break
      ;;
    conflict)
      if (( attempt >= GH_PAGES_MAX_ATTEMPTS )); then
        echo "gh-pages kept moving; failed to reconcile after ${attempt} attempts" >&2
        exit 1
      fi
      echo "gh-pages moved during reconciliation, rebuilding and retrying" >&2
      gh_pages_backoff "$attempt"
      attempt=$(( attempt + 1 ))
      ;;
  esac
done
