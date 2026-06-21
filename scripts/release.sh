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

  if [ -f "doc/.env.production" ]; then
    sed -i '' -E "s/(NEXT_PUBLIC_LATEST_VERSION=).*/\1$VERSION/" doc/.env.production
  fi

  sed -i '' -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" shell/package.json
  if [ -f "doc/package.json" ]; then
    sed -i '' -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" doc/package.json
  fi
else
  sed -i -E "s/^([[:space:]]*version:[[:space:]]*).*/\1$VERSION/" scorix.yaml

  if [ -f "doc/.env.production" ]; then
    sed -i -E "s/(NEXT_PUBLIC_LATEST_VERSION=).*/\1$VERSION/" doc/.env.production
  fi

  sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" shell/package.json
  if [ -f "doc/package.json" ]; then
    sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" doc/package.json
  fi
fi

cp ./CHANGELOG.md ./doc/app/docs/changelog/page.mdx

echo "Release updated to $VERSION"
