#!/usr/bin/env bash
# Add authorized OAuth domains to Firebase project bloodcare-5a516
# Requires: firebase login (as bloodcaree123@gmail.com)
# Run from blood-donation/: ./scripts/authorize-domains.sh

set -e
cd "$(dirname "$0")/.."

echo "==> Deploying auth config (includes authorized domains from firebase.json)"
firebase deploy --only auth --project bloodcare-5a516

echo ""
echo "If Google sign-in still fails, add domains manually in Firebase Console:"
echo "  https://console.firebase.google.com/project/bloodcare-5a516/authentication/settings"
echo ""
echo "Required domains:"
echo "  - localhost"
echo "  - 127.0.0.1"
echo ""
echo "Then hard-refresh your browser (Cmd+Shift+R) and use:"
echo "  http://localhost:5500/index.html"
