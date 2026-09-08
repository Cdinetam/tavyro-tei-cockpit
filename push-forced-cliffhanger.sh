#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  api/src/functions/chat.ts \
  src/lib/i18n.ts \
  src/components/TrustRoomChat.tsx

git commit -m "Letzte erlaubte Nachricht schliesst mit erzwungenem Cliffhanger ab, Demo-Limit-Screen überarbeitet

Die 7. (letzte im Gespräch erlaubte) Antwort wird jetzt immer als Cliffhanger
markiert (effectiveTopicTurnHint auf die Cliffhanger-Schwelle angehoben,
unabhängig vom Themen-Streak) — das Gespräch schliesst dadurch bewusst und
sauber ab, statt mitten im Gedanken abzubrechen, da danach ohnehin keine
weitere Antwort mehr folgt.

Der anschliessende 'conversation_limit_reached'-Screen (bei der 8. Nachricht)
kommuniziert jetzt klar 'Demo-Version-Limite erreicht' statt einer
technischen Formulierung, mit 'Erstgespräch buchen' als primärem Button und
'Neues Gespräch starten' als sekundärer Option — analog zum bestehenden
Wochenlimit-Screen (limitReached)."

git push
