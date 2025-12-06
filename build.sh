#!/usr/bin/env bash
set -euo pipefail

APP_ID="redishub"
APP_NAME="RedisHub"
APP_DESC="RedisHub – A fast, lightweight, and intuitive Redis desktop client"

DIST_DIR=".scorix"

VERSION=$(grep '^[[:space:]]\+version:' etc/app.yaml | awk '{print $2}')

GOOS=${1:-$(go env GOOS)}
GOARCH=${2:-$(go env GOARCH)}

OUT_DIR="$DIST_DIR/$APP_ID-$VERSION-$GOOS-$GOARCH"

echo "==> Building application $APP_NAME version $VERSION"

####################################################################################################

echo "==> Generate config"

echo "+ Write version"
sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" ./shell/package.json
sed -i -E "s/(Version=\")[0-9]+\.[0-9]+\.[0-9]+/\1$VERSION/" ./installer/windows/installer.wxs
sed -i -E "s/(current_version:[[:space:]]*).*/\1$VERSION/" ./etc/app.yaml

echo "+ Make out dir"
mkdir -p "$OUT_DIR"

####################################################################################################

echo "==> Building shell"

cd shell && pnpm install && pnpm lint && pnpm build && cd ..

####################################################################################################

case "$GOOS" in
  windows)
    echo "==> Make assets"

    cp ./installer/windows/icon.ico "$OUT_DIR/$APP_NAME.ico"

    echo "==> Building $APP_NAME $VERSION for $GOOS/$GOARCH"
    GOOS=$GOOS GOARCH=$GOARCH go build -ldflags "-H=windowsgui" -o "$OUT_DIR/$APP_NAME" ./main.go

    echo "==> Packaging MSI..."

    BIN_PATH="$OUT_DIR/$APP_NAME.exe"
    mv "$OUT_DIR/$APP_NAME" "$BIN_PATH"

    if command -v candle >/dev/null && command -v light >/dev/null; then
      candle installer/windows/installer.wxs -dBinPath="$OUT_DIR"
      mv installer.wixobj installer/windows/installer.wixobj
      light installer/windows/installer.wixobj -o "$DIST_DIR/$APP_ID-$VERSION-$GOOS-$GOARCH.msi"
    else
      echo "!! WiX toolset (candle, light) not found. Skipping MSI package."
    fi
    ;;

  darwin)
    echo "==> Make assets"

    echo "==> Building $APP_NAME $VERSION for $GOOS/$GOARCH"
    GOOS=$GOOS GOARCH=$GOARCH go build -o "$OUT_DIR/$APP_NAME" ./main.go

    echo "==> Packaging macOS .app + .dmg..."

    APP_BUNDLE="$DIST_DIR/${APP_NAME}.app"
    mkdir -p "$APP_BUNDLE/Contents/MacOS"
    mkdir -p "$APP_BUNDLE/Contents/Resources"

    cp "$OUT_DIR/$APP_NAME" "$APP_BUNDLE/Contents/MacOS/"
    cp installer/macos/Info.plist "$APP_BUNDLE/Contents/"

    if [ -f installer/macos/AppIcon.icns ]; then
      cp installer/macos/AppIcon.icns "$APP_BUNDLE/Contents/Resources/"
    fi

    hdiutil create -volname "$APP_NAME" -srcfolder "$APP_BUNDLE" -ov -format UDZO "$DIST_DIR/${APP_NAME}-${VERSION}.dmg"
    ;;

  linux)
    echo "==> Make assets"

    cp ./installer/linux/icon-256.png "$OUT_DIR/icon.png"
    cp ./installer/linux/app.desktop "$OUT_DIR/$APP_ID.desktop"

    echo "==> Building $APP_NAME $VERSION for $GOOS/$GOARCH"
    GOOS=$GOOS GOARCH=$GOARCH go build -o "$OUT_DIR/$APP_ID" ./main.go

    echo "==> Set assets permission"
    chmod 755 $OUT_DIR/$APP_ID
    chmod 644 $OUT_DIR/$APP_ID.desktop
    chmod 644 $OUT_DIR/icon.png

    echo "==> Packaging Linux .deb and .rpm..."
    if command -v fpm >/dev/null; then
      fpm -s dir -t deb \
        -n "$APP_ID" \
        -v "$VERSION" \
        --description "$APP_DESC" \
        -p "${DIST_DIR}/${APP_ID}_${VERSION}_${GOARCH}.deb" \
        $OUT_DIR/$APP_ID=/usr/bin/$APP_ID \
        $OUT_DIR/icon.png=/usr/share/icons/$APP_ID.png \
        $OUT_DIR/$APP_ID.desktop=/usr/share/applications/$APP_ID.desktop

      #fpm -s dir -t rpm \
      #  -n "$APP_ID" \
      #  -v "$VERSION" \
      #  --description "$APP_DESC" \
      #  --architecture x86_64 \
      #  $OUT_DIR/$APP_ID=/usr/bin/$APP_ID \
      #  $OUT_DIR/icon.png=/usr/share/icons/hicolor/256x256/apps/$APP_ID.png \
      #  $OUT_DIR/$APP_ID.desktop=/usr/share/applications/$APP_ID.desktop
    else
      echo "!! fpm not found. Skipping Linux packages."
    fi
    ;;

  *)
    echo "Unsupported OS: $GOOS"
    exit 1
    ;;
esac

echo "==> Cleanup"

rm -rf "$OUT_DIR"
rm -rf "$DIST_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.wixpdb"

echo "==> Done! Output in $DIST_DIR/"
