#!/usr/bin/env bash
# BloodCare — Firestore setup via Firebase CLI
# Run from blood-donation/: ./scripts/setup-firestore.sh

set -e
cd "$(dirname "$0")/.."

PROJECT="bloodcare-5a516"
LOCATION="asia-south1"

echo "==> Using project $PROJECT"
firebase use "$PROJECT"

echo "==> Checking Firestore database"
if ! firebase firestore:databases:list --project "$PROJECT" 2>/dev/null | grep -q "(default)"; then
  echo "    Creating (default) database in $LOCATION"
  firebase firestore:databases:create "(default)" --location "$LOCATION" --project "$PROJECT"
else
  echo "    Database already exists, skipping create."
fi

echo "==> Deploying Firestore rules and indexes"
firebase deploy --only firestore --project "$PROJECT"

echo "==> Seeding dummy data"
if command -v npm >/dev/null 2>&1; then
  npm install --silent 2>/dev/null || npm install
  npm run seed
else
  echo "    npm not found — refresh the app to seed from the browser."
fi

echo ""
echo "Done! Firestore is ready."
echo "  Console: https://console.firebase.google.com/project/$PROJECT/firestore"
echo "  Refresh the app — sample data seeds automatically on first load."
