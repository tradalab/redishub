#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Usage: bash release.sh <version>"
  echo "Example: bash release.sh 1.0.0"
  exit 1
fi

echo "Releasing version: $VERSION"

# Only app.version is bumped; the updater derives current_version from it.
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' -E "s/^([[:space:]]*version:[[:space:]]*).*/\1$VERSION/" scorix.yaml
  sed -i '' -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" shell/package.json
else
  sed -i -E "s/^([[:space:]]*version:[[:space:]]*).*/\1$VERSION/" scorix.yaml
  sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" shell/package.json
fi

echo "Release updated to $VERSION"
