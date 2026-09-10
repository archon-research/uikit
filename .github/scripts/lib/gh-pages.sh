#!/usr/bin/env bash
# Shared helpers for mutating the shared `gh-pages` branch safely when
# multiple workflow runs (different PRs, or a PR and a `main` push) touch it
# at the same time. Each mutation is applied to a fresh worktree checked out
# from the current tip of `gh-pages`, and the push is retried against a
# fresh fetch if another run updated the branch first — so callers don't
# need to serialize against each other to be correct.
#
# Source this file, then loop:
#   WORKTREE_DIR="$(mktemp -d)"
#   gh_pages_checkout "$WORKTREE_DIR" [create-if-missing]
#   ...apply your changes under $WORKTREE_DIR...
#   result="$(gh_pages_commit_and_push "$WORKTREE_DIR" "commit message")"
#   # $result is one of: pushed | no-changes | conflict
#   git worktree remove "$WORKTREE_DIR" --force

GH_PAGES_MAX_ATTEMPTS="${GH_PAGES_MAX_ATTEMPTS:-8}"
GH_PAGES_BOT_NAME="github-actions[bot]"
GH_PAGES_BOT_EMAIL="41898282+github-actions[bot]@users.noreply.github.com"

# Fetches the latest gh-pages and adds a fresh worktree at $1, checked out
# to a local `gh-pages` branch tracking the current remote tip. If the
# branch doesn't exist yet: with mode `create-if-missing` (default), an
# orphan `gh-pages` branch is created; otherwise this returns 1 so the
# caller can treat "branch doesn't exist" as "nothing to do".
#
# Every step explicitly propagates its own failure with `|| return 1`
# rather than relying on the caller's `set -e`: bash disables errexit for
# an entire function body when the call is used as an `if`/`while`
# condition (as cleanup/reconcile do), so a bare failing command in here
# would otherwise be silently swallowed instead of aborting the checkout.
gh_pages_checkout() {
  local worktree_dir="$1"
  local mode="${2:-create-if-missing}"

  if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
    git fetch origin gh-pages || return 1
    git worktree add "$worktree_dir" origin/gh-pages >/dev/null || return 1
    git -C "$worktree_dir" checkout -B gh-pages >/dev/null || return 1
    return 0
  fi

  if [[ "$mode" != "create-if-missing" ]]; then
    return 1
  fi

  git worktree add --detach "$worktree_dir" >/dev/null || return 1
  # A prior attempt in this run may have left a local (unpushed) gh-pages
  # branch behind after its worktree was removed — `checkout --orphan`
  # refuses to reuse that name, so drop it before recreating from scratch.
  git branch -D gh-pages >/dev/null 2>&1 || true
  git -C "$worktree_dir" checkout --orphan gh-pages >/dev/null || return 1
  git -C "$worktree_dir" rm -rf . >/dev/null 2>&1 || true
}

# Commits any staged changes under $1 with message $2 and pushes to
# gh-pages. Prints exactly one of: pushed | no-changes | conflict
# (all git output goes to stderr, so this is safe to capture with $(...)).
#
# The commit identity is passed via `-c` scoped to this one invocation,
# not `git config`, so running this locally never rewrites the caller's
# own git identity in their working clone.
gh_pages_commit_and_push() {
  local worktree_dir="$1"
  local commit_msg="$2"

  git -C "$worktree_dir" add -A
  if git -C "$worktree_dir" diff --cached --quiet; then
    echo "no-changes"
    return 0
  fi

  git -C "$worktree_dir" \
    -c "user.name=${GH_PAGES_BOT_NAME}" \
    -c "user.email=${GH_PAGES_BOT_EMAIL}" \
    commit -m "$commit_msg" >&2

  # Explicit refspec so this can only ever update gh-pages.
  if git -C "$worktree_dir" push origin HEAD:gh-pages >&2; then
    echo "pushed"
  else
    echo "conflict"
  fi
}

# Sleeps with jitter that grows per attempt, so a burst of concurrent runs
# spreads its retries out instead of colliding again immediately.
gh_pages_backoff() {
  local attempt="$1"
  local seconds=$(( (RANDOM % 5) + attempt * 2 ))
  echo "retrying in ${seconds}s (attempt ${attempt}/${GH_PAGES_MAX_ATTEMPTS})..." >&2
  sleep "$seconds"
}
