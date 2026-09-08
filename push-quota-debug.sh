#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add api/src/functions/quotaDebug.ts
git commit -m "Diagnose-Endpoint /api/quota-debug: Storage-Anbindung + aktueller Zaehlerstand pruefbar"
git push
