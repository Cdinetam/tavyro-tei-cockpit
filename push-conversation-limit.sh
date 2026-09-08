#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  api/src/functions/chat.ts \
  src/types.ts \
  src/hooks/useTrustRoomChat.ts \
  src/lib/i18n.ts \
  src/components/TrustRoomChat.tsx

git commit -m "Neues, unabhängiges Nachrichtenlimit pro Gespräch (MAX_MESSAGES_PER_CONVERSATION=7)

Zusätzlich zum bestehenden Wochenlimit (zählt nur begonnene Gespräche) gibt es
jetzt eine harte Obergrenze von 7 Nutzer-Nachrichten INNERHALB eines einzelnen
Gesprächs, als reinen Kostenschutz gegen unbegrenzt lange Einzelgespräche.
Neuer Status 'conversation_limit_reached' (Backend chat.ts, Frontend types.ts,
useTrustRoomChat.ts, i18n.ts, TrustRoomChat.tsx) bietet direkt einen Button
zum Starten eines neuen Gesprächs an. Env-Var MAX_MESSAGES_PER_CONVERSATION
optional in Azure konfigurierbar, Standard 7."

git push
