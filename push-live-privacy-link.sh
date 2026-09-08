#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  src/lib/i18n.ts \
  src/components/LiveAuth.tsx \
  CLAUDE.md

git commit -m "Live-Version: Datenschutz-Link + Zustimmungs-Checkbox bei Registrierung

- Neuer PRIVACY_URL-Export (i18n.ts), zeigt auf die bestehende, bereits
  Trust-Room-spezifische Datenschutzerklärung (tavyro.ch/de|en/datenschutz,
  Abschnitt zur Azure-OpenAI-Verarbeitung in der Schweiz, kein KI-Training
  mit Nutzerdaten).
- Shell-Komponente in LiveAuth.tsx zeigt auf jedem Live-Bildschirm einen
  Footer-Link zur Datenschutzerklärung.
- LiveRegisterScreen: Pflicht-Checkbox 'Ich akzeptiere die
  Datenschutzerklärung', blockiert den Submit-Button bis akzeptiert."

git push
