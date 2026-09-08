#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add api/src/functions/quotaDebug.ts

git commit -m "quota-debug: gleiche Code-basierte Schluessel-Logik wie chat.ts verwenden (war noch auf IP)"
git push
