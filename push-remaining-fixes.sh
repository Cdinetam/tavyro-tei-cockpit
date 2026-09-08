#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  api/README.md \
  api/src/functions/chat.ts \
  index.html \
  src/components/TrustRoomChat.tsx \
  src/hooks/useTrustRoomChat.ts \
  src/lib/aiClient.ts

git commit -m "Erzwungener Cliffhanger bei letzter Nachricht + restliche EN-Übersetzungslücken

Bündelt zwei zuvor vorbereitete, aber noch nicht gepushte Änderungen:

1. Letzte erlaubte Nachricht (7.) schliesst jetzt immer mit einem
   erzwungenen Cliffhanger ab (chat.ts: effectiveTopicTurnHint), der
   anschliessende Demo-Limit-Screen ist überarbeitet (TrustRoomChat.tsx).

2. Verbleibende hartkodierte deutsche Fehlermeldungen in aiClient.ts
   (401/Netzwerk-Fehler) und der Fallback in useTrustRoomChat.ts sind jetzt
   sprachabhängig; index.html liefert den aktualisierten Titel/Meta-
   Description-Startwert (wird zur Laufzeit ohnehin von applyDocumentMeta
   überschrieben, siehe bereits gepushtes i18n.ts/App.tsx/AccessGate.tsx).

Ausserdem: api/README.md-Dokumentation zu MAX_MESSAGES_PER_CONVERSATION
(war im ursprünglichen Commit versehentlich nicht mit committet)."

git push
