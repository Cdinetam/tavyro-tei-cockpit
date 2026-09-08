#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add src/components/AccessGate.tsx src/lib/i18n.ts

git commit -m "AccessGate: E-Mail-Anfrage vor Zugangscode-Feld, als vollen Button statt Text-Link"
git push
