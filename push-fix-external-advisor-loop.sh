#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add CLAUDE.md api/src/lib/prompt.ts api/src/lib/adviceGuard.ts

git commit -m "Bugfix: Antwort-Schlaufe 'externe Berater/Expertise hinzuziehen'

Live gemeldet: bei wiederholter Nachfrage nach Konkretem (Tools, konkreter
Vorschlag) wich das Modell mehrfach hintereinander auf praktisch dieselbe
Ausweich-Formulierung aus, statt konkreter zu werden.

- prompt.ts: neuer Punkt 14 im Steuerungsblock (DE+EN) verbietet 'externe
  Beratung' als Standardausweg, verlangt reale Kategorien/Beispiele bei
  konkreten Tool-/Methoden-Fragen, plus Anti-Schlaufe-Regel (konkretere
  Nachfrage = vorherige Antwort war zu allgemein, nicht wiederholen).
- adviceGuard.ts: VAGUE_ACTION_PATTERNS_DE/EN erkennt 'externe Berater/
  Expertise/Unterstützung' jetzt als Ausweich-Muster und löst den
  bestehenden Nachforderungs-Retry aus."

git push
