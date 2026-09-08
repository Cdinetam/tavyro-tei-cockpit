#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  CLAUDE.md \
  api/src/index.ts \
  api/src/lib/issuedCodesStore.ts \
  api/src/functions/autoAccessDebug.ts

git commit -m "Neuer Diagnose-Endpoint: Anzahl vergebener auto-00x Zugangscodes

Beantwortet 'wieviele Leute haben die Demo bereits über Code-per-E-Mail
genutzt' (GET /api/auto-access-debug), ohne Azure-Portal-Zugriff auf die
TeiIssuedCodes-Tabelle zu brauchen.

- issuedCodesStore.ts: neue, rein lesende getIssuedCodeCount() (erhöht den
  Zähler NICHT, anders als getOrIssueCodeForEmail), formatCode exportiert.
- autoAccessDebug.ts: liefert {issuedCodeCount, latestCode, ownerName}.
  Auth wie quotaDebug.ts primär per Header, zusätzlich als ?code=...
  Query-Parameter akzeptiert, damit sich der Endpoint ohne Zusatz-Tool
  direkt per Browser-URL aufrufen lässt.
- index.ts: neue Function registriert (sonst 404 trotz grünem Build, siehe
  bekannte Registrierungsfalle in CLAUDE.md)."

git push
