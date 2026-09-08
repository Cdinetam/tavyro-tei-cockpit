#!/bin/bash
# Testet, ob das PILOT_WEEKLY_LIMIT (7) jetzt korrekt greift: 8 Anfragen
# hintereinander, jede zaehlt als eigenes "Erstgespraech" (eine Nachricht =
# isFirstTurn). Die 8. sollte "limit_reached" liefern statt einer echten
# (kostenpflichtigen) Antwort.
ACCESS_CODE="tavyro-test-007"
URL="https://tei.tavyro.ch/api/chat"

for i in 1 2 3 4 5 6 7 8; do
  echo "=== Anfrage $i ==="
  curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "x-tei-access-code: $ACCESS_CODE" \
    -d "{\"sessionId\":\"limit-check-$i\",\"messages\":[{\"role\":\"user\",\"content\":\"Testanfrage $i fuer Limit-Check.\"}],\"topicTurnHint\":1,\"lang\":\"de\"}" \
    -w "\nHTTP_STATUS:%{http_code}\n\n"
done
