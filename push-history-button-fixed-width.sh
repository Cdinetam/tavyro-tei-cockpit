#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add src/components/LiveChat.tsx

git commit -m "Verlauf-Button: feste statt Mindestbreite, damit wirklich gleich gross

min-width liess 'Neues Gespräch' (längerer Text) trotzdem breiter werden
als 'Verlauf' — beide Buttons haben jetzt eine feste Breite (168px), damit
sie unabhängig vom Textinhalt exakt gleich gross sind."

git push
