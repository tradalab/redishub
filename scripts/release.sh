#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "Usage: bash release.sh <version>"
  echo "Example: bash release.sh 1.0.0"
  exit 1
fi

echo "Releasing version: $VERSION"

# update scorix.yaml (single config source). current_version is removed — the
# updater defaults it from app.version, so only app.version is bumped here.
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' -E "s/^([[:space:]]*version:[[:space:]]*).*/\1$VERSION/" scorix.yaml

  # update doc env
  if [ -f "doc/.env.production" ]; then
    sed -i '' -E "s/(NEXT_PUBLIC_LATEST_VERSION=).*/\1$VERSION/" doc/.env.production
  fi

  # update package.json versions
  sed -i '' -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" shell/package.json
  if [ -f "doc/package.json" ]; then
    sed -i '' -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" doc/package.json
  fi
else
  sed -i -E "s/^([[:space:]]*version:[[:space:]]*).*/\1$VERSION/" scorix.yaml

  # update doc env
  if [ -f "doc/.env.production" ]; then
    sed -i -E "s/(NEXT_PUBLIC_LATEST_VERSION=).*/\1$VERSION/" doc/.env.production
  fi

  # update package.json versions
  sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" shell/package.json
  if [ -f "doc/package.json" ]; then
    sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" doc/package.json
  fi
fi

# copy changelog
cp ./CHANGELOG.md ./doc/app/docs/changelog/page.mdx

echo "Release updated to $VERSION"
