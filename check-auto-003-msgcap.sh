#!/bin/bash
# Simuliert EIN einzelnes, wachsendes Gespräch mit Code auto-003 und prüft,
# ob ab der 8. Nutzer-Nachricht 'conversation_limit_reached' kommt (das neue,
# vom Wochenlimit unabhängige Nachrichtenlimit pro Gespräch, MAX=7).
python3 - <<'PYEOF'
import json, subprocess

messages = []
for i in range(1, 9):
    messages.append({"role": "user", "content": f"Testnachricht {i} im selben Gespräch."})
    payload = {
        "sessionId": "check-auto-003-msgcap",
        "messages": messages.copy(),
        "topicTurnHint": i,
        "lang": "de",
    }
    result = subprocess.run(
        [
            "curl", "-s", "-X", "POST", "https://tei.tavyro.ch/api/chat",
            "-H", "Content-Type: application/json",
            "-H", "x-tei-access-code: auto-003",
            "-d", json.dumps(payload),
            "-w", "\nHTTP_STATUS:%{http_code}",
        ],
        capture_output=True, text=True,
    )
    print(f"--- Nachricht {i} ---")
    print(result.stdout)
    print()
    # Nur bei 'ok' eine (Platzhalter-)Assistant-Antwort anhängen, damit die
    # Nachrichtenliste für den nächsten Turn korrekt alterniert.
    if '"status":"ok"' in result.stdout:
        messages.append({"role": "assistant", "content": "(Platzhalter-Antwort für den Test.)"})
PYEOF
