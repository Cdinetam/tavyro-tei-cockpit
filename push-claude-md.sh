#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add CLAUDE.md
git commit -m "CLAUDE.md: Quota-Fixes dieser Session dokumentieren (Registrierungsfalle, Port-Bug, Connection-String-Format)"
git push
