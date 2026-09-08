#!/bin/bash
echo "1) Quota-Status für Code auto-003:"
curl -s -H "x-tei-access-code: auto-003" "https://tei.tavyro.ch/api/quota-debug" | python3 -m json.tool

echo ""
echo "2) Tatsächlicher Chat-Aufruf mit auto-003 (sollte bei erreichtem Limit 'limit_reached' liefern):"
curl -s -X POST "https://tei.tavyro.ch/api/chat" \
  -H "Content-Type: application/json" \
  -H "x-tei-access-code: auto-003" \
  -d '{"sessionId":"check-auto-003","messages":[{"role":"user","content":"Testfrage zur Prüfung des Limits."}],"topicTurnHint":1,"lang":"de"}' \
  -w "\nHTTP_STATUS:%{http_code}\n"
