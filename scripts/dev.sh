#!/usr/bin/env bash
set -euo pipefail

####################################################################################################
# Resolve paths

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

####################################################################################################
# Shell

echo "==> Lint & build shell"

(
  cd shell
  pnpm lint
  pnpm build
)

echo "==> Copy shell dist to .scorix/dist"

DIST_SRC="$PROJECT_ROOT/shell/dist"
DIST_DEST="$PROJECT_ROOT/.scorix/dist"

# Clean & recreate dist dir
rm -rf "$DIST_DEST"
mkdir -p "$DIST_DEST"

# Copy build output
cp -R "$DIST_SRC"/. "$DIST_DEST"/

####################################################################################################
# Run application

echo "==> Run application"

go run -ldflags="-H=windowsgui" main.go
