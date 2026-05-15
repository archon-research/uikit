#!/usr/bin/env bash
set -euo pipefail

EVENT_NAME="${EVENT_NAME:?EVENT_NAME is required}"
RELEASE_EVENT_TAG="${RELEASE_EVENT_TAG:-}"
INPUT_RELEASE_TAG="${INPUT_RELEASE_TAG:-}"
GITHUB_OUTPUT="${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

if [ "$EVENT_NAME" = "release" ]; then
  BASE_TAG="$RELEASE_EVENT_TAG"
elif [ "$EVENT_NAME" = "workflow_dispatch" ]; then
  BASE_TAG="$INPUT_RELEASE_TAG"
else
  echo "Unexpected event: $EVENT_NAME"
  exit 1
fi

if [ -z "$BASE_TAG" ]; then
  echo "release tag is required"
  exit 1
fi

BASE_VERSION="${BASE_TAG#release-}"
if [ "$BASE_VERSION" = "$BASE_TAG" ]; then
  echo "Unexpected release tag format: $BASE_TAG"
  exit 1
fi

RELEASE_TAG="$BASE_TAG"
VERSION="$BASE_VERSION"
NPM_TAG="latest"
IS_DEV="false"
CHECKOUT_REF="$BASE_TAG"

# Any prerelease version (for example 1.2.3-dev.1) is published to the dev channel.
if [[ "$BASE_VERSION" == *-* ]]; then
  NPM_TAG="dev"
  IS_DEV="true"
fi

echo "release_tag=${RELEASE_TAG}" >> "$GITHUB_OUTPUT"
echo "version=${VERSION}" >> "$GITHUB_OUTPUT"
echo "npm_tag=${NPM_TAG}" >> "$GITHUB_OUTPUT"
echo "is_dev=${IS_DEV}" >> "$GITHUB_OUTPUT"
echo "checkout_ref=${CHECKOUT_REF}" >> "$GITHUB_OUTPUT"
