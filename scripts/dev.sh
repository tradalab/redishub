#!/usr/bin/env bash
set -euo pipefail

####################################################################################################
# Resolve paths

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

####################################################################################################
# SYSTEM ENV

GOOS=${1:-$(go env GOOS)}
GOARCH=${2:-$(go env GOARCH)}

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

case "$GOOS" in
  windows)
    go run -ldflags="-H=windowsgui" main.go
    ;;

  darwin)
    go run main.go
    ;;

  linux)
    go run main.go
    ;;

  *)
    echo "!! unsupported OS: $GOOS"
    exit 1
    ;;
esac
