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
APP_MANUFACTURER="TradaLab"
APP_DESC="Modern Redis Client - Fast, lightweight, and cross-platform"
VERSION=$(grep '^[[:space:]]\+version:' etc/app.yaml | awk '{print $2}')

####################################################################################################
# SYSTEM ENV

ARTIFACT_DIR="artifacts"

GOOS=${1:-$(go env GOOS)}
GOARCH=${2:-$(go env GOARCH)}

TEMP_DIR=".scorix/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}"
SHELL_DIST_SRC="$PROJECT_ROOT/shell/dist"
SHELL_DIST_DEST="$PROJECT_ROOT/.scorix/dist"

echo "==> Building application $APP_NAME version $VERSION"
echo "==> Project root: $PROJECT_ROOT"

mkdir -p "$ARTIFACT_DIR"
mkdir -p "$TEMP_DIR"

####################################################################################################
# Generate config

echo "==> Generate config"

echo "+ Write version"
sed -i -E "s/(current_version:[[:space:]]*).*/\1$VERSION/" etc/app.yaml

echo "+ Copy icon"
cp assets/icon.ico "$TEMP_DIR/$APP_NAME.ico"

####################################################################################################
# Build application

echo "==> Building $APP_NAME $VERSION for $GOOS/$GOARCH"

case "$GOOS" in
  windows)
    echo "==> Build go app"

    GOOS=$GOOS GOARCH=$GOARCH \
      go build -ldflags "-H=windowsgui" -o "$TEMP_DIR/$APP_NAME" ./main.go

    BIN_PATH="$TEMP_DIR/$APP_NAME.exe"
    mv "$TEMP_DIR/$APP_NAME" "$BIN_PATH"

    echo "==> Packaging MSI..."

    if ! command -v wix >/dev/null 2>&1; then
      echo "!! wix CLI not found in PATH"
      exit 1
    fi

    wix build installer/windows/$APP_NAME.wxs \
      -d BinPath="$TEMP_DIR" \
      -d Manufacturer="$APP_MANUFACTURER" \
      -d ProductName="$APP_NAME" \
      -d ProductDesc="$APP_DESC" \
      -d ProductVersion="$VERSION" \
      -o "$ARTIFACT_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.msi"
    ;;

  darwin)
    GOOS=$GOOS GOARCH=$GOARCH \
      go build -o "$TEMP_DIR/$APP_NAME" ./main.go

    echo "==> Packaging macOS .app + .dmg..."

    APP_BUNDLE="$ARTIFACT_DIR/${APP_NAME}.app"
    mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources"

    cp "$TEMP_DIR/$APP_NAME" "$APP_BUNDLE/Contents/MacOS/"
    cp installer/macos/Info.plist "$APP_BUNDLE/Contents/"

    [ -f installer/macos/AppIcon.icns ] && \
      cp installer/macos/AppIcon.icns "$APP_BUNDLE/Contents/Resources/"

    hdiutil create \
      -volname "$APP_NAME" \
      -srcfolder "$APP_BUNDLE" \
      -ov -format UDZO \
      "$ARTIFACT_DIR/${APP_NAME}-${VERSION}.dmg"
    ;;

  linux)
    GOOS=$GOOS GOARCH=$GOARCH \
      go build -o "$TEMP_DIR/$APP_NAME" ./main.go

    echo "==> Packaging Linux AppImage..."

    mkdir -p .scorix/AppDir

    linuxdeploy \
      --appimage-extract-and-run \
      --appdir .scorix/AppDir \
      --executable "$TEMP_DIR/$APP_NAME" \
      --desktop-file installer/linux/RedisHub.desktop \
      --icon-file installer/linux/RedisHub.png \
      --output appimage

    mv RedisHub-x86_64.AppImage $ARTIFACT_DIR
    ;;

  *)
    echo "!! unsupported OS: $GOOS"
    exit 1
    ;;
esac

####################################################################################################
# Cleanup

echo "==> Cleanup"

rm -rf "$TEMP_DIR"
rm -f "$ARTIFACT_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.wixpdb"

echo "==> Done! Output in $ARTIFACT_DIR/"
