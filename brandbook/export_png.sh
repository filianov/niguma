#!/bin/bash
# Export brand SVGs to PNG via headless Chrome (transparent background).
# usage: ./export_png.sh <svg-dir> <png-out-dir>
set -e
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC="$1"; OUT="$2"
mkdir -p "$OUT"
TMP=$(mktemp -d)

render () {  # render <svg-file> <width> <height> <out-name>
  local svg="$1" w="$2" h="$3" name="$4"
  local html="$TMP/$name.html"
  cat > "$html" <<HTML
<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}
img{display:block;width:${w}px;height:${h}px}</style>
<img src="file://$svg">
HTML
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --default-background-color=00000000 \
    --force-device-scale-factor=1 \
    --window-size="${w},${h}" \
    --screenshot="$OUT/$name" "file://$html" >/dev/null 2>&1
  echo "  $name (${w}x${h})"
}

# --- icons ---
render "$SRC/app-icon.svg"        512 512 "app-icon-512.png"
render "$SRC/app-icon.svg"        192 192 "app-icon-192.png"
render "$SRC/app-icon.svg"        180 180 "apple-touch-icon.png"
render "$SRC/favicon.svg"          32  32 "favicon-32.png"
render "$SRC/favicon.svg"          16  16 "favicon-16.png"
render "$SRC/mark.svg"            256 256 "mark-256.png"
render "$SRC/mark.svg"            512 512 "mark-512.png"

# --- logos for ads / decks (transparent) ---
render "$SRC/logo-horizontal.svg"          642 128 "logo-horizontal@2x.png"
render "$SRC/logo-horizontal.svg"          963 192 "logo-horizontal@3x.png"
render "$SRC/logo-horizontal-mono-dark.svg"  642 128 "logo-horizontal-mono-dark@2x.png"
render "$SRC/logo-horizontal-on-dark.svg"    642 128 "logo-horizontal-on-dark@2x.png"
render "$SRC/logo-stacked.svg"             500 500 "logo-stacked@2x.png"
render "$SRC/logo-with-domain.svg"         680 153 "logo-with-domain@2x.png"

# --- social ---
render "$SRC/og-cover.svg"       1200 630 "og-cover.png"

rm -rf "$TMP"
