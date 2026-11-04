#!/bin/sh
# Renders the 3 invented E6 worksheets (worksheets/*.html) to PNG for the docs page and to
# JPEG for the model (a JPEG attachment goes to the model as it is, files.ts in jadwigo-ai).
# Usage: sh apps/runner/experiments/render.sh
set -eu
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DOCS="../../../apps/docs/src/assets/experiments/e6"
mkdir -p "$DOCS"
for f in worksheets/w1-mnozenie worksheets/w2-ortografia worksheets/w3-zadanie; do
  name=$(basename "$f")
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=980,880 \
    --screenshot="$DOCS/$name.png" "file://$PWD/$f.html" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 85 "$DOCS/$name.png" \
    --out "worksheets/$name.jpg" >/dev/null
  echo "rendered $name"
done
