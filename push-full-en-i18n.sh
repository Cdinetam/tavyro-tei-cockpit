#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  src/lib/aiClient.ts \
  src/hooks/useTrustRoomChat.ts \
  src/lib/i18n.ts \
  src/components/AccessGate.tsx \
  src/App.tsx \
  index.html

git commit -m "Verbleibende deutsche Texte im EN-Flow übersetzt (Fehlermeldungen, Dokument-Meta)

Bisher deutsch hartkodierte Fehlermeldungen in aiClient.ts (401/Netzwerk-
Fehler bei sendChatMessage, analyzeQuestion, submitLead) und der Fallback in
useTrustRoomChat.ts sind jetzt sprachabhängig wie der Rest der UI.

Neu: applyDocumentMeta(lang) in i18n.ts setzt html[lang], <title> und die
Meta-Description passend zur aktuellen Sprache — aufgerufen sowohl in
AccessGate.tsx (Zugangscode-Gate, rendert vor App.tsx) als auch in App.tsx
(inkl. bei jedem D | EN-Wechsel im Header). Vorher blieb z.B. ein Deep-Link
auf /en/gespraech im Dokument-Head dauerhaft als lang=\"de-CH\" markiert.

Die versandte Zugangscode-E-Mail (emailSender.ts) und die fortlaufende
Codenummerierung (issuedCodesStore.ts, EIN gemeinsamer Zähler für DE+EN)
waren bereits korrekt bilingual bzw. sprachunabhängig — keine Änderung
nötig, nur verifiziert."

git push
