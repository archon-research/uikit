#!/usr/bin/env bash
set -euo pipefail

EVENT_NAME="${EVENT_NAME:?EVENT_NAME is required}"
RELEASE_EVENT_TAG="${RELEASE_EVENT_TAG:-}"
INPUT_RELEASE_TAG="${INPUT_RELEASE_TAG:-}"
REF_NAME="${REF_NAME:?REF_NAME is required}"
SHA="${SHA:?SHA is required}"
RUN_ID="${RUN_ID:?RUN_ID is required}"
GITHUB_OUTPUT="${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

if [ "$EVENT_NAME" = "release" ]; then
  BASE_TAG="$RELEASE_EVENT_TAG"
else
  BASE_TAG="$INPUT_RELEASE_TAG"
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

if [ "$EVENT_NAME" = "workflow_dispatch" ] && [ "$REF_NAME" != "main" ]; then
  VERSION="${BASE_VERSION}-dev${RUN_ID}"
  RELEASE_TAG="release-${VERSION}"
  NPM_TAG="dev"
  IS_DEV="true"
  CHECKOUT_REF="$SHA"
fi

echo "release_tag=${RELEASE_TAG}" >> "$GITHUB_OUTPUT"
echo "version=${VERSION}" >> "$GITHUB_OUTPUT"
echo "npm_tag=${NPM_TAG}" >> "$GITHUB_OUTPUT"
echo "is_dev=${IS_DEV}" >> "$GITHUB_OUTPUT"
echo "checkout_ref=${CHECKOUT_REF}" >> "$GITHUB_OUTPUT"
