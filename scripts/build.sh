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
APP_DESC="Professional Redis Command Center - High-performance desktop & web client for managing and monitoring Redis."
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
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' -E "s/(current_version:[[:space:]]*).*/\1$VERSION/" etc/app.yaml
else
  sed -i -E "s/(current_version:[[:space:]]*).*/\1$VERSION/" etc/app.yaml
fi

echo "+ Copy icon"
cp assets/icon.ico "$TEMP_DIR/$APP_NAME.ico"

####################################################################################################
# Build application

echo "==> Building $APP_NAME $VERSION for $GOOS/$GOARCH"

case "$GOOS" in
  windows)
    echo "==> Generating Windows icon resource"
    go run github.com/akavel/rsrc@latest -ico assets/icon.ico -o app_windows.syso

    echo "==> Build go app"

    GOOS=$GOOS GOARCH=$GOARCH \
      go build -ldflags "-H=windowsgui" -o "$TEMP_DIR/$APP_NAME" .

    rm -f app_windows.syso

    BIN_PATH="$TEMP_DIR/$APP_NAME.exe"
    mv "$TEMP_DIR/$APP_NAME" "$BIN_PATH"

    echo "==> Install wix extensions"

    if ! command -v wix >/dev/null 2>&1; then
      echo "!! wix CLI not found in PATH"
      exit 1
    fi

    wix extension add WixToolset.Util.wixext/6.0.2
    wix extension add WixToolset.UI.wixext/6.0.2
    wix extension list

    echo "==> Packaging MSI..."

    wix build installer/windows/product.wxs installer/windows/ui.wxs \
      -ext WixToolset.UI.wixext \
      -ext WixToolset.Util.wixext \
      -d BinPath="$TEMP_DIR" \
      -d Manufacturer="$APP_MANUFACTURER" \
      -d ProductName="$APP_NAME" \
      -d ProductDesc="$APP_DESC" \
      -d ProductVersion="$VERSION" \
      -o "${ARTIFACT_DIR}/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.msi"
    ;;

  darwin)
    if [ "$GOARCH" = "universal" ]; then
      echo "==> Building universal binary (amd64 + arm64)"
      mkdir -p "$TEMP_DIR/amd64" "$TEMP_DIR/arm64"

      echo "+ Build amd64"
      CC_AMD64=${CC_amd64:-${CC:-gcc}}
      GOOS=darwin GOARCH=amd64 CGO_ENABLED=1 CC="$CC_AMD64" \
        go build -ldflags "-s -w" -o "$TEMP_DIR/amd64/$APP_NAME" .

      echo "+ Build arm64"
      CC_ARM64=${CC_arm64:-${CC:-gcc}}
      GOOS=darwin GOARCH=arm64 CGO_ENABLED=1 CC="$CC_ARM64" \
        go build -ldflags "-s -w" -o "$TEMP_DIR/arm64/$APP_NAME" .

      echo "+ Merge universal binary (lipo)"
      LIPO_CMD="lipo"
      # If cross-compiling, use the prefixed lipo
      if command -v x86_64-apple-darwin-lipo >/dev/null 2>&1; then
        LIPO_CMD="x86_64-apple-darwin-lipo"
      elif command -v x86_64-apple-darwin23.1-lipo >/dev/null 2>&1; then
        LIPO_CMD="x86_64-apple-darwin23.1-lipo"
      fi
      $LIPO_CMD -create -output "$TEMP_DIR/$APP_NAME" "$TEMP_DIR/amd64/$APP_NAME" "$TEMP_DIR/arm64/$APP_NAME"
    else
      GOOS=$GOOS GOARCH=$GOARCH \
        go build -o "$TEMP_DIR/$APP_NAME" .
    fi

    echo "==> Packaging macOS .app + .dmg..."

    APP_BUNDLE="$ARTIFACT_DIR/${APP_NAME}.app"
    mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources"

    cp "$TEMP_DIR/$APP_NAME" "$APP_BUNDLE/Contents/MacOS/"
    # Corrected path to installer/mac
    if [ -f "installer/mac/Info.plist" ]; then
      cp "installer/mac/Info.plist" "$APP_BUNDLE/Contents/"
    fi

    if [ -f "installer/mac/AppIcon.icns" ]; then
      cp "installer/mac/AppIcon.icns" "$APP_BUNDLE/Contents/Resources/"
    fi

    if command -v hdiutil >/dev/null 2>&1; then
      echo "==> Using hdiutil to create DMG"
      hdiutil create \
        -volname "$APP_NAME" \
        -srcfolder "$APP_BUNDLE" \
        -ov -format UDZO \
        "$ARTIFACT_DIR/${APP_NAME}-${VERSION}-macos-${GOARCH}.dmg"
    elif command -v dmgbuild >/dev/null 2>&1; then
      echo "==> Using dmgbuild to create DMG (Linux-compatible)"
      # Create a basic settings file if it doesn't exist
      SETTINGS_FILE=".scorix/dmg_settings.py"
      cat > "$SETTINGS_FILE" <<EOF
filename = '$ARTIFACT_DIR/${APP_NAME}-${VERSION}.dmg'
volume_name = '$APP_NAME'
files = ['$APP_BUNDLE']
symlinks = {'Applications': '/Applications'}
EOF
      dmgbuild -s "$SETTINGS_FILE" "$APP_NAME" "$ARTIFACT_DIR/${APP_NAME}-${VERSION}-macos-${GOARCH}.dmg"
    else
      echo "!! No DMG tool found (hdiutil or dmgbuild). Skipping DMG creation."
    fi
    ;;

  linux)
    GOOS=$GOOS GOARCH=$GOARCH \
      go build -o "$TEMP_DIR/$APP_NAME" .

    echo "==> Packaging Linux AppImage..."

    mkdir -p .scorix/AppDir

    linuxdeploy \
      --appimage-extract-and-run \
      --appdir .scorix/AppDir \
      --executable "$TEMP_DIR/$APP_NAME" \
      --desktop-file installer/linux/RedisHub.desktop \
      --icon-file installer/linux/RedisHub.png \
      --output appimage

    mv RedisHub-x86_64.AppImage $ARTIFACT_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.AppImage
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
