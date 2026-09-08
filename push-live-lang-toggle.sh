#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  CLAUDE.md \
  src/App.tsx \
  src/components/LiveAuth.tsx \
  src/components/LiveChat.tsx

git commit -m "Bugfix: DE/EN-Umschalter für Live-Version ergänzt

Die Live-Version riet die Sprache beim ersten Aufruf still per
Browsersprache (detectInitialLang gilt pfad-übergreifend, auch für /live),
bot aber anders als die Demo (Header-Toggle) keine Möglichkeit, das danach
zu korrigieren — ein Nutzer mit englischsprachigem Browser/OS, der auf
Deutsch tippt, bekam ohne Erklärung englische Antworten und konnte nicht
zurückschalten.

Neuer LangToggle (identische Optik wie der bestehende Header-Toggle) auf
allen Live-Bildschirmen: Shell in LiveAuth.tsx (oben rechts neben Logo, für
Login/Register/Verify/Activate/Passwort-vergessen/-Reset) sowie im
Kopfbereich von LiveChat.tsx (Empty-State und aktiver Chat, neben Logout).
Nutzt dieselbe toggleLang()-Funktion aus App.tsx wie der Demo-Header —
kein neuer State, nur bisher fehlende UI-Anbindung."

git push
