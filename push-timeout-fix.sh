#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add api/src/lib/openaiClient.ts
git commit -m "Zeitbudget + Per-Call-Timeout gegen Plattform-Timeout (leerer 500) in requestChatReply"
git push
