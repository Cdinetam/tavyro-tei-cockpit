#!/bin/bash
# Einzelner Test-Request, um zu prüfen, ob das Kontingent von den 7 echten
# Anfragen vorhin bereits erreicht ist. Kein neuer Verbrauch nötig, falls
# die Zählung in Azure Table Storage funktioniert (sollte bereits bei 7
# stehen) — dieser eine Aufruf sollte dann SOFORT "limit_reached" zurückgeben,
# ohne dass Azure OpenAI überhaupt aufgerufen wird (kein zusätzlicher
# Kostenpunkt, falls das Limit greift).

ACCESS_CODE="tavyro-test-007"
URL="https://tei.tavyro.ch/api/chat"

curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-tei-access-code: $ACCESS_CODE" \
  -d '{"sessionId":"limit-test-9","messages":[{"role":"user","content":"Testfrage neun."}],"topicTurnHint":1,"lang":"de"}' \
  -w "\nHTTP_STATUS:%{http_code}\n"
