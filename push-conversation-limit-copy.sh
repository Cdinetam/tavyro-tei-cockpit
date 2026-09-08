#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add src/lib/i18n.ts

git commit -m "Demo-Limit-Screen: Hinweis auf 'neues Gespräch starten' durch Erstgespräch-Hinweis ersetzt

Text bei erreichtem Nachrichtenlimit pro Gespräch (conversationLimitReached)
verwies bisher zusätzlich zum Buchungs-Button noch im Fliesstext auf die
Möglichkeit, jederzeit ein neues Gespräch zu starten — sollte stattdessen
klarer auf den vollen Zugang per Erstgespräch hinweisen. DE und EN
angepasst, der 'Neues Gespräch starten'-Button selbst bleibt unverändert."

git push
