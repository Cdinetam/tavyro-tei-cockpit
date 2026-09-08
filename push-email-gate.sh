#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  api/package.json api/package-lock.json \
  api/src/lib/emailSender.ts \
  api/src/lib/issuedCodesStore.ts \
  api/src/functions/autoAccess.ts \
  api/README.md \
  src/lib/aiClient.ts \
  src/lib/i18n.ts \
  src/components/AccessGate.tsx \
  CLAUDE.md

git commit -m "Zugangscode-Vergabe auf echtes E-Mail-Gate umgestellt (Azure Communication Services statt IP-Sofortfreischaltung)"
git push
