#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  CLAUDE.md \
  api/src/lib/schema.ts \
  api/src/functions/chat.ts \
  api/src/functions/liveChat.ts \
  api/src/lib/openaiClient.ts \
  api/src/lib/liveConversationStore.ts \
  src/types.ts \
  src/lib/attachments.ts \
  src/lib/i18n.ts \
  src/hooks/useDocumentAttachment.ts \
  src/hooks/useTrustRoomChat.ts \
  src/hooks/useLiveChat.ts \
  src/components/TrustRoomChat.tsx \
  src/components/LiveChat.tsx

git commit -m "Feature: Bild-Upload im Chat mit echtem GPT-4o-Vision-Verständnis

'upload lässt keine Bilder zu' — der bestehende Dokument-Anhang (PDF/Word/
Text) liess bisher keine Bilder zu. Bewusst mit echtem Bild-Verständnis
statt reiner OCR-Textextraktion umgesetzt: TEI sieht das Bild tatsächlich
(Screenshots, Charts, Fotos), nicht nur einen extrahierten Text daraus.

ChatMessage.content (src/types.ts + api/src/lib/schema.ts, synchron
gehalten) von string auf string | ChatContentPart[] erweitert —
ChatContentPart entspricht 1:1 dem Azure-OpenAI-Format, damit
openaiClient.ts es unverändert durchreicht. Neue Helfer chatMessageText()/
chatMessageHasContent() (in beiden Dateien) ersetzen jede bisherige
.trim()/.length-Stelle auf content, betroffen: chat.ts, liveChat.ts,
openaiClient.ts (adviceGuard), liveConversationStore.ts (deriveTitle).

Bilder laufen ohne Server-Roundtrip: clientseitig als data:-URL gelesen
(fileToDataUrl) und über composeMessageWithImage zu einem
ChatContentPart[]-Array zusammengesetzt. Derselbe 📎-Button nimmt jetzt
Dokumente UND Bilder entgegen (useDocumentAttachment.ts liefert ein
AttachedItem-Union), Bildgrösse auf 4 MB begrenzt.

Live-spezifischer Kompromiss (Azure Table Storage: ~64 KB pro Property,
~1 MB pro Entität — ein eingebettetes Bild würde das bei jedem Speichern
reissen): liveConversationStore.ts ersetzt Bilder beim Persistieren durch
den Platzhalter [Bild-Anhang] (collapseImagesForStorage), TEIs eigene
Antwort dazu bleibt als Text vollständig erhalten. Innerhalb der aktiven
Sitzung bleibt das Bild dagegen voll nutzbar (Client lädt nach dem Senden
nicht vom Server neu) — erst nach Seitenneuladen/Gerätewechsel/Fortsetzen
ist nur noch der Platzhalter da. Details siehe CLAUDE.md."

git push
