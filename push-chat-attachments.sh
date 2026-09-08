#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock
rm -f api/test-extract.mjs api/test-pdf.mjs api/test-docx.mjs

git add \
  CLAUDE.md \
  api/README.md \
  api/package.json \
  api/package-lock.json \
  api/src/index.ts \
  api/src/lib/documentExtract.ts \
  api/src/lib/extractRateLimit.ts \
  api/src/functions/extractDocument.ts \
  api/src/functions/chat.ts \
  api/src/functions/liveChat.ts \
  src/components/LiveChat.tsx \
  src/components/TrustRoomChat.tsx \
  src/hooks/useDocumentAttachment.ts \
  src/lib/attachments.ts \
  src/lib/aiClient.ts \
  src/lib/liveClient.ts \
  src/lib/i18n.ts

git commit -m "TaVyro-Logo in Live-Chat + Dokument-Anhänge (PDF/Word/Text) im Chat

Kosmetik: LiveChat.tsx zeigt jetzt das TaVyro-Logo im Kopfbereich (Empty-
State und aktiver Chat), analog zur Landing Page/den Live-Auth-Bildschirmen
— vorher nur der Status-Text ohne Logo sichtbar.

Neue Funktion: Anhang-Button (📎) neben dem Nachrichtenfeld, sowohl in der
Demo- (TrustRoomChat.tsx) als auch der Live-Version (LiveChat.tsx). Erlaubt
PDF, Word (.docx) und Text (.txt), max. 8 MB.

Backend:
- Neuer, geteilter Endpoint POST /api/extract-document (extractDocument.ts)
  — akzeptiert entweder einen gültigen Demo-Zugangscode ODER eine gültige
  Live-Sitzung, da beide Chat-Flows denselben Button nutzen.
- documentExtract.ts: Textextraktion via pdf-parse@1.x (bewusst nicht 2.x,
  das @napi-rs/canvas als ~50 MB native Abhängigkeit nachzieht — dasselbe
  Build-Risiko, weshalb schon bcryptjs statt bcrypt gewählt wurde) und
  mammoth (.docx). Umgeht einen bekannten pdf-parse@1.x-Stolperstein
  (Absturz beim ESM-Import durch ein isDebugMode-Konstrukt im
  Haupt-Entry-Point) durch direkten createRequire-Import des inneren
  Implementierungsmoduls — lokal mit echten PDF/DOCX/TXT-Testdateien
  verifiziert.
- Extrahierter Text auf 12'000 Zeichen begrenzt, Datei nirgends
  gespeichert. Eigenes IP-Rate-Limit (extractRateLimit.ts, 20/Std.).
- MAX_MESSAGE_LENGTH in chat.ts/liveChat.ts von 2000 auf 16'000 Zeichen
  angehoben (Nachricht muss Platz für eingebetteten Dokumenttext bieten).

Frontend:
- useDocumentAttachment.ts (geteilter Hook: Datei auswählen, Base64,
  Extraktion aufrufen) + attachments.ts (Delimiter-Format, um den
  Dokumenttext in ChatMessage.content einzubetten, ohne den Typ zu ändern
  — Bubble-Komponenten parsen das beim Rendern wieder heraus und zeigen
  nur einen klickbaren 📎-Dateiname-Chip statt des vollen Texts).
- aiClient.ts/liveClient.ts: extractDocument() mit den jeweils bestehenden
  Auth-Headern (Zugangscode/Sitzungs-Token).
- i18n.ts: neuer geteilter copy.attachment-Block (DE/EN)."

git push
