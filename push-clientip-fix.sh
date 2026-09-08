#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add api/src/lib/clientIp.ts
git commit -m "getClientIp: Portanteil aus x-forwarded-for entfernen (Limit zaehlte sonst pro Verbindung statt pro IP)"
git push
