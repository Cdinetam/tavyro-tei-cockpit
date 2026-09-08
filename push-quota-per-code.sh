#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  api/src/functions/chat.ts \
  api/src/functions/analyze.ts \
  api/README.md \
  CLAUDE.md

git commit -m "Wochenlimit pro Zugangscode statt pro IP-Adresse zaehlen (IP-Wechsel-Umgehung geschlossen)"
git push
