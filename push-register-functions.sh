#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add api/src/index.ts
git commit -m "autoAccess und quotaDebug in index.ts registrieren (fehlten, daher 404)"
git push
