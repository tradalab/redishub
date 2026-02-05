#!/usr/bin/env bash
set -euo pipefail

####################################################################################################
# Resolve paths

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

####################################################################################################
# APP ENV

APP_NAME="RedisHub"
VERSION=$(grep '^[[:space:]]\+version:' etc/app.yaml | awk '{print $2}')

####################################################################################################
# SYSTEM ENV

DIST_DIR=".scorix"

GOOS=${1:-$(go env GOOS)}
GOARCH=${2:-$(go env GOARCH)}

OUT_DIR="$DIST_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}"

echo "==> Building application $APP_NAME version $VERSION"
echo "==> Project root: $PROJECT_ROOT"

####################################################################################################
# Generate config

echo "==> Generate config"

echo "+ Write version"
sed -i -E "s/(Version=\")[0-9]+\.[0-9]+\.[0-9]+/\1$VERSION/" installer/windows/installer.wxs
sed -i -E "s/(current_version:[[:space:]]*).*/\1$VERSION/" etc/app.yaml

echo "+ Copy icon"
mkdir -p "$OUT_DIR"
cp assets/icon.ico "$OUT_DIR/$APP_NAME.ico"

####################################################################################################
# Build application

echo "==> Building $APP_NAME $VERSION for $GOOS/$GOARCH"

case "$GOOS" in
  windows)
    echo "==> Building shell"
    cd shell && pnpm install && pnpm lint && pnpm build && cd ..

    GOOS=$GOOS GOARCH=$GOARCH \
      go build -ldflags "-H=windowsgui" -o "$OUT_DIR/$APP_NAME" ./main.go

    echo "==> Packaging MSI..."

    BIN_PATH="$OUT_DIR/$APP_NAME.exe"
    mv "$OUT_DIR/$APP_NAME" "$BIN_PATH"

    if command -v candle >/dev/null && command -v light >/dev/null; then
      candle installer/windows/installer.wxs -dBinPath="$OUT_DIR"
      mv installer.wixobj installer/windows/installer.wixobj
      light installer/windows/installer.wixobj \
        -o "$DIST_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.msi"
    else
      echo "!! WiX toolset not found. Skipping MSI."
    fi
    ;;

  darwin)
    GOOS=$GOOS GOARCH=$GOARCH \
      go build -o "$OUT_DIR/$APP_NAME" ./main.go

    echo "==> Packaging macOS .app + .dmg..."

    APP_BUNDLE="$DIST_DIR/${APP_NAME}.app"
    mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources"

    cp "$OUT_DIR/$APP_NAME" "$APP_BUNDLE/Contents/MacOS/"
    cp installer/macos/Info.plist "$APP_BUNDLE/Contents/"

    [ -f installer/macos/AppIcon.icns ] && \
      cp installer/macos/AppIcon.icns "$APP_BUNDLE/Contents/Resources/"

    hdiutil create \
      -volname "$APP_NAME" \
      -srcfolder "$APP_BUNDLE" \
      -ov -format UDZO \
      "$DIST_DIR/${APP_NAME}-${VERSION}.dmg"
    ;;

  linux)
    GOOS=$GOOS GOARCH=$GOARCH \
      go build -o "$OUT_DIR/$APP_NAME" ./main.go

    echo "==> Packaging Linux AppImage..."

    mkdir -p .scorix/AppDir

    linuxdeploy \
      --appimage-extract-and-run \
      --appdir .scorix/AppDir \
      --executable "$OUT_DIR/$APP_NAME" \
      --desktop-file installer/linux/RedisHub.desktop \
      --icon-file installer/linux/RedisHub.png \
      --output appimage

    mv RedisHub-x86_64.AppImage .scorix
    ;;

  *)
    echo "Unsupported OS: $GOOS"
    exit 1
    ;;
esac

####################################################################################################
# Cleanup

echo "==> Cleanup"

rm -rf "$OUT_DIR"
rm -f "$DIST_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.wixpdb"

echo "==> Done! Output in $DIST_DIR/"
