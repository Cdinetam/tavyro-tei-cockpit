#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  CLAUDE.md \
  api/README.md \
  api/src/index.ts \
  api/src/lib/emailSender.ts \
  api/src/lib/notify.ts \
  api/src/lib/liveRateLimit.ts \
  api/src/lib/liveUserStore.ts \
  api/src/functions/liveRegister.ts \
  api/src/functions/liveLogin.ts \
  api/src/functions/liveApprove.ts \
  api/src/functions/liveActivate.ts \
  src/App.tsx \
  src/components/LiveAuth.tsx \
  src/lib/i18n.ts \
  src/lib/liveClient.ts

git commit -m "Live-Version: manuelle Freigabe (Tam-Approval) zusätzlich zur E-Mail-Bestätigung

Bisher: offene Selbstregistrierung + Pflicht-E-Mail-Bestätigung waren die
einzige Hürde vor der ersten Nutzung. Zusätzlich jetzt eine manuelle
Freigabe durch Tam, ohne die bestehende Registrierung (E-Mail+Passwort
sofort wählbar) anzutasten.

Backend:
- Neues Feld 'approved' auf LiveUserRecord (liveUserStore.ts) — ein Konto
  kann sich trotz bestätigter E-Mail-Adresse erst einloggen, wenn approved
  true ist. Bestandskonten (kein approved-Feld in der Tabelle) gelten
  automatisch als freigegeben, damit z.B. Tams eigenes Testkonto nicht
  rückwirkend gesperrt wird.
- Registrierung erzeugt einen stabilen approveToken; dessen Freigabe-Link
  (GET /api/live/approve?token=...) landet in der bestehenden
  Registrierungs-Benachrichtigung (notify.ts) — ein Klick genügt.
- liveApprove.ts (neu): löst den Freigabe-Link ein, generiert einen kurzen
  Zugangscode (issueActivationCode) und verschickt ihn per E-Mail an die
  Person (sendLiveActivationCodeEmail, emailSender.ts). Liefert eine
  schlichte HTML-Bestätigungsseite statt JSON.
- liveActivate.ts (neu): POST /api/live/activate — Person gibt E-Mail +
  Zugangscode ein (activateWithCode), danach approved=true.
- liveLogin.ts: prüft approved zusätzlich zu emailVerified, eigene
  DE/EN-Meldung 'Konto wird geprüft…'.
- Neue Rate-Limit-Kategorie 'activate' in liveRateLimit.ts (10/Std./IP).
- Alle neuen Function-Dateien in index.ts registriert.

Frontend:
- Neue Route /live/activate (+ /en-Präfix), LiveActivateScreen in
  LiveAuth.tsx (E-Mail + Code, gleiches visuelles Grundgerüst wie die
  übrigen Live-Bildschirme).
- Login-Bildschirm: permanenter Link 'Zugangscode erhalten? Konto
  aktivieren →'.
- i18n.ts: Copy.live.activate + login.activateLink (DE/EN), Register-/
  Verify-Erfolgstexte angepasst (erklären jetzt den zweistufigen Ablauf:
  E-Mail bestätigen → auf Freigabe warten → Zugangscode eingeben).
- liveClient.ts: liveActivate(email, code, lang)."

git push
