#!/bin/bash
set -e
cd "$(dirname "$0")"

rm -f .git/index.lock

git add \
  CLAUDE.md \
  api/README.md \
  api/package-lock.json \
  api/package.json \
  api/src/index.ts \
  api/src/lib/emailSender.ts \
  api/src/lib/notify.ts \
  api/src/lib/liveAuth.ts \
  api/src/lib/liveConversationStore.ts \
  api/src/lib/liveRateLimit.ts \
  api/src/lib/liveSessionStore.ts \
  api/src/lib/liveUserStore.ts \
  api/src/functions/liveChat.ts \
  api/src/functions/liveConversations.ts \
  api/src/functions/liveLogin.ts \
  api/src/functions/liveLogout.ts \
  api/src/functions/liveRegister.ts \
  api/src/functions/liveRequestPasswordReset.ts \
  api/src/functions/liveResetPassword.ts \
  api/src/functions/liveVerifyEmail.ts \
  src/App.tsx \
  src/components/AccessGate.tsx \
  src/components/Landing.tsx \
  src/components/LiveAuth.tsx \
  src/components/LiveChat.tsx \
  src/hooks/useLiveChat.ts \
  src/lib/i18n.ts \
  src/lib/liveClient.ts

git commit -m "Live-Version: echtes Login, keine Limits, automatische Gesprächsspeicherung

Neue, komplett eigenständige Ebene neben der bestehenden Demo-Pilotphase —
für Personen mit einem eigenen Konto statt eines geteilten Zugangscodes.

Backend (api/src/functions/live*.ts + api/src/lib/live{UserStore,
SessionStore,ConversationStore,RateLimit,Auth}.ts, bewusst komplett getrennt
von chat.ts/accessGate.ts):
- Offene Selbstregistrierung (E-Mail + Passwort, bcryptjs-Hashing),
  Pflicht-E-Mail-Bestätigung vor dem ersten Login (Kostenschutz, da
  unlimitiert nutzbar), Passwort-vergessen-Flow mit Session-Invalidierung.
- Sitzungs-Token via x-tei-live-token-Header, läuft nicht automatisch ab
  (bis Logout gültig).
- IP-Rate-Limit für Registrierung/Login/Passwort-Reset (liveRateLimit.ts).
- Neuer /live/chat-Endpoint: keine Wochenlimits, kein Nachrichten-Cap, kein
  Cliffhanger (topicTurnHint konstant 1) — Gespräch wird nach jeder Antwort
  automatisch in neuer TeiLiveConversations-Tabelle gespeichert,
  geräteübergreifend abrufbar über /live/conversations.
- Neue Tabellen: TeiLiveUsers, TeiLiveSessions, TeiLiveConversations,
  TeiLiveRateLimit. Neue Env-Var APP_BASE_URL für Links in Live-E-Mails.
- Alle neuen Function-Dateien in index.ts registriert (siehe bekannte
  Registrierungsfalle bei Azure Functions v4).

Frontend:
- Neue Routen /live, /live/register, /live/verify, /live/forgot-password,
  /live/reset-password, /live/gespraech (je mit /en-Präfix), siehe App.tsx.
- LiveAuth.tsx (Login mit Willkommens-/Vertrauens-Box, Register, Verify,
  Passwort-vergessen/-Reset) im selben visuellen Grundgerüst wie
  AccessGate.tsx. LiveChat.tsx (Chat-Ansicht ohne Cliffhanger-CTA, mit
  serverseitig geladener Gesprächsliste). useLiveChat.ts, liveClient.ts
  (Sitzungs-Token in localStorage statt sessionStorage — 'unbegrenzt bis
  Logout' würde sonst beim Schliessen des Browsers verloren gehen).
- AccessGate.tsx überspringt für /live-Pfade das Demo-Zugangscode-Gate
  komplett (isLivePath) — Live hat sein eigenes, unabhängiges Login.
- Landing.tsx: unauffälliger Link 'Bereits Live-Zugang? Hier einloggen →'
  als Einstieg, bis eine eigene Skalierungs-Homepage folgt."

git push
