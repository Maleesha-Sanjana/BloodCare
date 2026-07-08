#!/usr/bin/env bash
# BloodCare — Firebase Authentication setup (CLI only)
# Run from blood-donation/: ./scripts/setup-auth.sh

set -e
cd "$(dirname "$0")/.."

echo "==> Using project bloodcare-5a516"
firebase use bloodcare-5a516

echo "==> Creating web app (if needed)"
if firebase apps:list WEB --project bloodcare-5a516 2>/dev/null | grep -q "No apps found"; then
  firebase apps:create WEB bloodcare-web --project bloodcare-5a516
else
  echo "    Web app already exists, skipping."
fi

echo "==> Deploying auth providers (email/password + Google)"
firebase deploy --only auth --project bloodcare-5a516

echo "==> Fetching SDK config into firebase-config.js"
./scripts/fetch-firebase-config.sh

echo ""
echo "Done! Auth is configured. Test locally:"
echo "  cd src/main/webapp && python3 -m http.server 8080"
echo "  open http://localhost:8080"
