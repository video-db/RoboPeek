#!/usr/bin/env bash
# Renders card.html variants to public/og/*.png at 2x (2400×1260) with Playwright's headless Chromium.
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME:-$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell 2>/dev/null | tail -1)}"
mkdir -p ../public/og
for v in home rlds mcap; do
  "$CHROME" --headless --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=2 \
    --window-size=1200,630 --virtual-time-budget=8000 --screenshot="$PWD/../public/og/$v.png" "file://$PWD/card.html?v=$v"
done
