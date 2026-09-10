#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-archon-research/uikit}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/gh-pages.sh
source "${SCRIPT_DIR}/lib/gh-pages.sh"

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

  # Capture gh's own exit status explicitly: `mapfile -t x < <(cmd)` takes
  # its exit status from mapfile, not from cmd, so a failing/rate-limited
  # `gh pr list` would otherwise look identical to "zero PRs are open" and
  # every preview folder below would be deleted as "stale".
  OPEN_PR_LIMIT=500
  if ! open_prs_output="$(gh pr list --repo "$REPO" --state open --limit "$OPEN_PR_LIMIT" --json number -q '.[].number')"; then
    echo "gh pr list failed; aborting reconciliation without deleting anything" >&2
    git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
    exit 1
  fi

  # Avoid mapfile/declare -A: both are bash 4+, and this script is meant
  # to be run locally where `bash` may resolve to macOS's bash 3.2.
  open_prs=()
  while IFS= read -r n; do
    [[ -n "$n" ]] && open_prs+=("$n")
  done <<<"$open_prs_output"

  if [[ ${#open_prs[@]} -eq "$OPEN_PR_LIMIT" ]]; then
    echo "gh pr list returned exactly the --limit ${OPEN_PR_LIMIT} cap; there may be more open PRs than were fetched, so stale-folder detection could be wrong. Aborting rather than risk deleting a live preview." >&2
    git worktree remove "$WORKTREE_DIR" --force >/dev/null 2>&1 || true
    exit 1
  fi

  is_open_pr() {
    local needle="$1" n
    for n in "${open_prs[@]}"; do
      [[ "$n" == "$needle" ]] && return 0
    done
    return 1
  }

  stale=()
  for dir in "$WORKTREE_DIR"/pr/*/; do
    [[ -d "$dir" ]] || continue
    n="$(basename "$dir")"
    [[ "$n" =~ ^[0-9]+$ ]] || continue
    if ! is_open_pr "$n"; then
      stale+=("$n")
    fi
  done

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
    *)
      echo "gh_pages_commit_and_push returned unexpected value: '${result}'" >&2
      exit 1
      ;;
  esac
done
