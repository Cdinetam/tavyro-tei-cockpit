#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  api/src/lib/autoAccessRateLimit.ts \
  api/src/lib/issuedCodesStore.ts \
  api/src/functions/autoAccess.ts \
  api/src/index.ts

git commit -m "auto-access: IP-Rate-Limit + E-Mail-Versand-Cooldown gegen Missbrauch"
git push
