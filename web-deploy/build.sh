#!/usr/bin/env bash
# Builds the web version of Dashin & Flexin on Vercel from the public GitHub repo.
set -euo pipefail
REF="${APP_REF:-main}"
export EXPO_NO_TELEMETRY=1 CI=1
rm -rf app dist
git clone --quiet https://github.com/Reggiedavis999-hub/GOGETEM.git app
cd app
git checkout --quiet "$REF"
npm install --legacy-peer-deps --no-audit --no-fund
npm install --no-save --legacy-peer-deps --no-audit --no-fund typescript @types/react@19
npx tsc --noEmit || echo "tsc reported issues (not blocking the web build)"
npx expo export -p web
cd ..
mv app/dist dist
ls -la dist | head -30
