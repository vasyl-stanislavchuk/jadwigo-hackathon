#!/usr/bin/env bash
# Renders every mock in diagrams/ to img/<name>.png at its own size, with gstack's headless
# browser. Run after build.ts: bash docs/drops/identity/shots.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
B="${BROWSE_BIN:-$HOME/.claude/skills/gstack/browse/dist/browse}"

size() {
  case "$1" in
    hero-*) echo 1280x800 ;;
    phone-*) echo 390x844 ;;
    card-*) echo 720x640 ;;
    og-*) echo 1200x630 ;;
    a6-*) echo 560x794 ;;
    poster-*) echo 794x1123 ;;
    name-*) echo 1200x520 ;;
    about) echo 1280x720 ;;
    *) echo "no size for $1" >&2; exit 1 ;;
  esac
}

for f in "$here"/diagrams/*.html; do
  name="$(basename "$f" .html)"
  "$B" viewport "$(size "$name")" >/dev/null
  "$B" goto "file://$f" >/dev/null
  "$B" wait --load >/dev/null
  "$B" js "document.fonts.ready.then(() => true)" >/dev/null
  "$B" screenshot --viewport "$here/img/$name.png" >/dev/null
  echo "img/$name.png"
done
