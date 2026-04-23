#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PACKAGE_DIR"

rm -rf dist
mkdir -p dist

npm run generate
npm exec -- ladle build --outDir dist --base ./

touch dist/.nojekyll
