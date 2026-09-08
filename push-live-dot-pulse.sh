#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add src/components/LiveChat.tsx

git commit -m "Live-Chat: Status-Punkt neben 'Live' pulsiert jetzt sanft

Gleiche animate-pulse-Animation wie bei den drei Warte-Punkten während
einer Antwort — signalisiert 'aktiv/live' auf die gleiche ruhige,
zurückhaltende Art statt eines schnellen, alarmartigen Blinkens."

git push
