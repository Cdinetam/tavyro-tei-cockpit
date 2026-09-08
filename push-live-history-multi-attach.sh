#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  CLAUDE.md \
  src/types.ts \
  src/lib/attachments.ts \
  src/hooks/useDocumentAttachment.ts \
  src/hooks/useTrustRoomChat.ts \
  src/components/TrustRoomChat.tsx \
  src/components/LiveChat.tsx \
  src/lib/i18n.ts

git commit -m "Live: Verlauf-Button im aktiven Chat + mehrere Anhänge pro Nachricht

Zwei Nutzer-Wünsche:

1. Live-Chat: neuer 'Verlauf'-Button im aktiven Chat-Header öffnet die
   gespeicherten Gespräche direkt als Overlay (HistoryPanel), ohne den
   bisherigen Umweg über 'Neues Gespräch' (reset() hätte das laufende
   Gespräch sofort beendet, nur um die Liste zu sehen, die vorher ausserdem
   nur auf dem Startbildschirm sichtbar war). Bewusst nur in der
   Live-Version, wie angefragt.

2. Anhang-Button liess bisher nur genau einen Anhang gleichzeitig zu.
   useDocumentAttachment.ts hält jetzt ein AttachedItem[]-Array,
   handleFilesSelected verarbeitet mehrere gleichzeitig gewählte Dateien
   (File-Input mit multiple) sequenziell, gedeckelt auf
   MAX_ATTACHMENTS_COUNT=5 pro Nachricht. attachments.ts:
   composeMessageWithAttachments baut aus beliebig vielen gemischten
   Dokumenten/Bildern den ChatMessage.content-Wert, parseMessageAttachments
   liefert alle eingebetteten Dokumente zurück, chatMessageImageUrls
   (types.ts) alle Bild-URLs. Bubble-Komponenten in TrustRoomChat.tsx/
   LiveChat.tsx rendern entsprechend eine Bild-Galerie plus unabhängig
   auf-/zuklappbare Dokument-Chips. Betrifft beide Chat-Flows (geteilte
   Anhang-Logik), der Verlauf-Button bleibt Live-exklusiv."

git push
