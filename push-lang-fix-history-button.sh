#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  CLAUDE.md \
  src/lib/i18n.ts \
  src/components/LiveChat.tsx \
  api/src/lib/prompt.ts

git commit -m "Bugfix: Browsersprache-Erkennung + KI antwortet in Sprache der Nachricht

detectInitialLang (i18n.ts) prüfte per .some(), ob IRGENDEINE Sprache in
navigator.languages mit 'en' beginnt, statt nur die primäre (erste). Viele
Browser führen 'en-US' als Rückfall weiter hinten in der Liste, selbst bei
deutscher Präferenz — das erzwang bei JEDEM Neuladen Englisch, live
gemeldet ('wenn ich refreshe kommt immer zuerst EN'). Behoben: liest nur
noch navigator.languages[0].

Zusätzlich CHAT_SYSTEM_PROMPT/CHAT_SYSTEM_PROMPT_EN um eine Regel ergänzt:
TEI antwortet immer in der Sprache der letzten Nutzer-Nachricht,
unabhängig von der Oberflächensprache — 'Deutsche Frage, Deutsche
Antwort, unabhängig von der Layout-Sprache'.

Ausserdem: Verlauf-Button im aktiven Live-Chat-Header hat jetzt dieselbe
Mindestbreite wie 'Neues Gespräch', damit beide gleich gross wirken."

git push
