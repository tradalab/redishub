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
sed -i -E "s/(Version=\")[0-9]+\.[0-9]+\.[0-9]+/\1$VERSION/" installer/windows/installer.wxs
sed -i -E "s/(current_version:[[:space:]]*).*/\1$VERSION/" etc/app.yaml

echo "+ Copy icon"
cp assets/icon.ico "$TEMP_DIR/$APP_NAME.ico"

####################################################################################################
# Build application

echo "==> Building $APP_NAME $VERSION for $GOOS/$GOARCH"

case "$GOOS" in
  windows)
    echo "==> Building shell"

    sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" shell/package.json

    (
      cd shell
      pnpm install
      pnpm lint
      pnpm build
    )

    echo "==> Copy shell dist to .scorix/dist"

    [ -d "$SHELL_DIST_SRC" ] || {
      echo "!! shell/dist not found – shell build failed?"
      exit 1
    }

    rm -rf "$SHELL_DIST_DEST"
    mkdir -p "$SHELL_DIST_DEST"
    cp -R "$SHELL_DIST_SRC"/. "$SHELL_DIST_DEST"/

    # Build Go app

    GOOS=$GOOS GOARCH=$GOARCH \
      go build -ldflags "-H=windowsgui" -o "$TEMP_DIR/$APP_NAME" ./main.go

    echo "==> Packaging MSI..."

    BIN_PATH="$TEMP_DIR/$APP_NAME.exe"
    mv "$TEMP_DIR/$APP_NAME" "$BIN_PATH"

    if command -v candle >/dev/null && command -v light >/dev/null; then
      candle installer/windows/installer.wxs -dBinPath="$TEMP_DIR"
      mv installer.wixobj installer/windows/installer.wixobj
      light installer/windows/installer.wixobj \
        -o "$ARTIFACT_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.msi"
    else
      echo "!! WiX toolset not found. Skipping MSI."
    fi
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
    echo "Unsupported OS: $GOOS"
    exit 1
    ;;
esac

####################################################################################################
# Cleanup

echo "==> Cleanup"

rm -rf "$TEMP_DIR"
rm -f "$ARTIFACT_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.wixpdb"

echo "==> Done! Output in $ARTIFACT_DIR/"
