#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  src/lib/i18n.ts \
  src/components/AccessGate.tsx \
  src/App.tsx \
  CLAUDE.md

git commit -m "Automatische Browsersprache-Erkennung beim Erstaufruf ohne /en-Präfix

Neue detectInitialLang(pathname) in i18n.ts: explizite /en-URL hat weiterhin
Vorrang, fehlt der Präfix (z.B. der feste Homepage-Link auf die Wurzel
https://tei.tavyro.ch, unabhängig von der Sprache der Homepage selbst),
entscheidet ersatzweise navigator.languages. AccessGate.tsx und App.tsx
nutzen das jetzt für den allerersten Render statt getLangFromPath — der
popstate-Handler für Browser-Navigation bleibt bewusst bei der reinen
URL-Lesart, damit spätere explizite Navigation nicht erneut überschrieben
wird."

git push
