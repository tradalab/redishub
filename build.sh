#!/usr/bin/env bash
set -euo pipefail

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

####################################################################################################

echo "==> Generate config"

echo "+ Write version"
sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" ./shell/package.json
sed -i -E "s/(Version=\")[0-9]+\.[0-9]+\.[0-9]+/\1$VERSION/" ./installer/windows/installer.wxs
sed -i -E "s/(current_version:[[:space:]]*).*/\1$VERSION/" ./etc/app.yaml

echo "+ Copy icon"
mkdir -p "$OUT_DIR"
cp ./assets/icon.ico "$OUT_DIR/$APP_NAME.ico"

####################################################################################################

echo "==> Building shell"

cd shell && pnpm install && pnpm lint && pnpm build && cd ..

####################################################################################################

echo "==> Building $APP_NAME $VERSION for $GOOS/$GOARCH"

case "$GOOS" in
  windows)
    GOOS=$GOOS GOARCH=$GOARCH go build -ldflags "-H=windowsgui" -o "$OUT_DIR/$APP_NAME" ./main.go

    echo "==> Packaging MSI..."

    BIN_PATH="$OUT_DIR/$APP_NAME.exe"
    mv "$OUT_DIR/$APP_NAME" "$BIN_PATH"

    if command -v candle >/dev/null && command -v light >/dev/null; then
      candle installer/windows/installer.wxs -dBinPath="$OUT_DIR"
      mv installer.wixobj installer/windows/installer.wixobj
      light installer/windows/installer.wixobj -o "$DIST_DIR/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}.msi"
    else
      echo "!! WiX toolset (candle, light) not found. Skipping MSI package."
    fi
    ;;

  darwin)
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
    GOOS=$GOOS GOARCH=$GOARCH go build -o "$OUT_DIR/$APP_NAME" ./main.go
    
    echo "==> Packaging Linux AppImage ..."

    echo "+ Init AppDir"
    mkdir -p .scorix/AppDir

    echo "+ Generate AppImage"
    
    .scorix/tool/linuxdeploy.AppImage \
      --appdir .scorix/AppDir \
      --executable "$OUT_DIR/$APP_NAME" \
      --desktop-file ./installer/linux/RedisHub.desktop \
      --icon-file ./installer/linux/RedisHub.png \
      --output appimage

    mv RedisHub-x86_64.AppImage .scorix

    # echo "==> Packaging Linux .deb and .rpm..."
    # if command -v fpm >/dev/null; then
    #   fpm -s dir -t deb -n "$APP_NAME" -v "$VERSION" --prefix /usr/local/bin -C "$OUT_DIR" $APP_NAME
    #   fpm -s dir -t rpm -n "$APP_NAME" -v "$VERSION" --prefix /usr/local/bin -C "$OUT_DIR" $APP_NAME
    # else
    #  echo "!! fpm not found. Skipping Linux packages."
    #fi
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
