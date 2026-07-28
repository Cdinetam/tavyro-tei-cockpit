# TEI® Trust Room — Projektübersicht

Kurzreferenz für zukünftige Sitzungen (Claude, Cursor, o.ä.), damit Hosting-
und Repo-Struktur nicht jedes Mal neu geklärt werden müssen.

## Was ist das

TEI® Trust Room: ein KI-gestützter, vertraulicher Reflexionsraum für
Schweizer KMU-CEOs und Geschäftsleitungen (TaVyro Executive Intelligence®).
Kein Analyse-/Diagnose-Tool — ein echtes, mehrteiliges Gespräch (`/gespraech`),
das aktiv zuhört, einordnet und mit offenen Fragen zum Weiterdenken einlädt;
keine Hypothesen, keine Konfidenzwerte, Handlungsempfehlungen nur auf
ausdrückliche Nachfrage und dann andeutend statt belehrend. Siehe
`api/src/lib/prompt.ts` (Kopfkommentar, `CHAT_SYSTEM_PROMPT`) für die volle
Begründung dieser Produktentscheidung.

## Repo & Hosting

- **Dieses Repo** (`tavyro-tei-cockpit_8` lokal) = GitHub
  `https://github.com/Cdinetam/tavyro-tei-cockpit` (public).
- Gehostet auf **Azure Static Web Apps** (nicht Vercel), Resource-Name
  `happy-moss-04885dd03`. Deploy automatisch via GitHub Action
  (`.github/workflows/azure-static-web-apps-happy-moss-04885dd03.yml`) bei
  jedem Push auf `main`.
- Live-URL: **https://tei.tavyro.ch** (Custom Domain, CNAME bei Hostpoint
  auf die Azure-SWA-Adresse).
- Backend: Azure Functions unter `api/`, ruft Azure OpenAI auf (Resource
  `TaVyroAzure2026`, Deployment `TaVyro-gpt-4o`, Region Switzerland North).

## Separates Projekt: TaVyro-Homepage

Die Haupt-Website `tavyro.ch` ist ein **komplett anderes Repo/Projekt**,
gehostet auf **Vercel**, lebt auf einem anderen Rechner (nicht diesem). Die
GitHub-URL dieses Homepage-Repos ist hier nicht bekannt — bei Bedarf via
`git remote -v` im Homepage-Ordner oder Vercel-Dashboard → Projekt →
Settings → Git ermitteln. Die Homepage verlinkt via Button/Icon
("Dialog starten") auf https://tei.tavyro.ch (neuer Tab).

## Wichtige Dateien

- **Trust-Room-Gespräch-Flow** (`/gespraech`, seit dem Entfernen der
  Einmal-Analyse-Demo der einzige und primäre Live-KI-Flow, direkt von der
  Landing Page aus erreichbar — kein separater "Analyse starten"-Button
  mehr): `api/src/functions/chat.ts` (Backend-Endpoint), `api/src/lib/
  prompt.ts` → `CHAT_SYSTEM_PROMPT` (natürlicher Fliesstext im Feld
  "reply", nicht mehr 5 fixe Felder wie in der alten Demo), `openaiClient.ts`
  → `requestChatReply`. Frontend: `src/components/TrustRoomChat.tsx`,
  `src/hooks/useTrustRoomChat.ts`. Gesprächsverlauf lebt bewusst nur
  clientseitig (kein Server-Speicher), wird bei jeder Anfrage komplett
  mitgeschickt; optional lokal speicherbar (localStorage, nur auf
  ausdrücklichen Wunsch beim Verlassen, nie automatisch). Kein
  Nachrichtenlimit mehr (bewusst entfernt, Kostenschutz läuft über
  Azure-Budget-Alert statt technischer Bremse).
- **Cliffhanger-Mechanik**: Antwort ist strukturiertes JSON
  `{reply, themenwechsel}` (`schema.ts` → `ChatReplyResult`,
  `chatReplyJsonSchema`). Client trackt `topicStreak` (siehe
  `useTrustRoomChat.ts`) und schickt `topicTurnHint` mit jeder Anfrage.
  Backend berechnet `cliffhanger = topicTurnHint >= 5 || themenwechsel` und
  gibt es in der Antwort zurück; ab dann schliesst TEI® den Gesprächsfaden
  bewusst deutlicher Richtung echtes Gespräch ab (Prompt-Regel
  "CLIFFHANGER-HINWEIS FÜR DIESE ANTWORT"), Frontend zeigt zusätzlich einen
  Inline-Hinweis (`CliffhangerCta` in `TrustRoomChat.tsx`) unter der
  jeweiligen Nachricht.
- **Alte Einmal-Analyse-Demo UND statische Referenzfälle-Ansicht entfernt**
  (Produktentscheidung: der Dialog ist strikt überlegen, eine parallele,
  stilistisch inkonsistente Ansicht — Konfidenzwerte, Hypothesen-Raster,
  sechs feste Dimensionen — verwässert die Stimme des Trust Room und den
  Cliffhanger-Effekt). Zugehörige Dateien (`api/src/functions/analyze.ts`,
  `src/components/AiScenarioInput.tsx`, `AiAnalysisView.tsx`,
  `EmpathicReflection.tsx`, `LockedDecisionCard.tsx`, `AdvisoryNote.tsx`,
  `src/hooks/useAiSession.ts`, `src/data/scenarios.ts`, `AnalysisView.tsx`,
  `ExecutiveSituation.tsx`, `Hypotheses.tsx`, `RootCauseTree.tsx`,
  `ScenarioInput.tsx`, `src/hooks/useAnalysis.ts` etc.) sind NICHT gelöscht
  (Sandbox-`rm`-Probleme bei Löschversuchen), aber aus Landing.tsx/App.tsx
  ausgehängt — toter Code, kann bei Gelegenheit bereinigt werden. Landing
  hat dadurch nur noch einen einzigen CTA ("Dialog starten"), `View` in
  App.tsx nur noch `'landing' | 'room'`, Header.tsx nur noch
  `'landing' | 'room'` als `stage`.
- `src/types.ts` — Frontend-Pendant zu `api/src/lib/schema.ts` (muss
  synchron gehalten werden, siehe Kommentar dort).
- `public/tavyro-logo.png` — TaVyro-Logo, Claim-Text ("People |
  Organisation | Impact") in Hellgold für Lesbarkeit auf Nachtblau-Hintergrund.
- **Englische Demo-Version** (`/en`, `/en/gespraech`): eigener Pfad-Präfix
  statt reiner In-App-Umschaltung, damit die EN-Version direkt verlinkbar
  ist. `src/lib/i18n.ts` (`getCopy`, `getLangFromPath`, `hasEnPrefix`,
  `BOOKING_URL`) ist das zentrale Wörterbuch für alle UI-Texte inkl.
  `AccessGate.tsx`. Die KI selbst antwortet im EN-Modus auch wirklich auf
  Englisch: `api/src/lib/prompt.ts` → `CHAT_SYSTEM_PROMPT_EN` (eigenständige
  Übersetzung/Adaption, kein Laufzeit-Übersetzer) plus `lang`-Parameter, der
  vom Client mitgeschickt wird (`sendChatMessage`/`useTrustRoomChat`) bis zu
  `requestChatReply`. `api/src/lib/adviceGuard.ts` hat dafür komplett
  eigene englische Regex-Sätze (`*_EN`-Varianten) — deutsche und englische
  Muster driften bewusst unabhängig auseinander, siehe dortige Kommentare
  zu wiederholt entdeckten Lücken (neue Adjektive/Synonyme bei generischen
  Öffnern, verbotene "1. 2. 3."-Listenformatierung v.a. auf Englisch
  beobachtet).
- **Automatische Zugangscode-Vergabe per E-Mail** (`AccessGate.tsx` →
  "Code per E-Mail anfordern"): ersetzt den früheren manuellen "E-Mail an
  hello@tavyro.ch"-Umweg für Besucher ohne persönlichen Code. Anfangs (v1)
  war das eine IP-basierte Sofort-Freischaltung ohne jeden Kontakt zur
  Person — bewusst durch ein echtes Gate ersetzt (v2, siehe Git-Historie für
  v1): Person gibt E-Mail-Adresse ein → bekommt einen fortlaufend
  nummerierten Code (`auto-014` o.ä., siehe
  `api/src/lib/issuedCodesStore.ts`, Endpoint `POST /api/auto-access`) per
  E-Mail zugeschickt (`api/src/lib/emailSender.ts`, Versand über Azure
  Communication Services Email, siehe `api/README.md` für die
  Portal-Einrichtung) → muss ihn danach manuell im normalen
  Zugangscode-Feld eingeben. Der Code kommt bewusst NIE direkt in der
  HTTP-Antwort zurück. Ein Code pro E-Mail-Adresse, dauerhaft gültig,
  persistiert in derselben Table-Storage-Verbindung wie das Nutzungslimit
  (`QUOTA_STORAGE_CONNECTION_STRING`). Zählt danach normal gegen
  `PILOT_WEEKLY_LIMIT`, löst bei Erstvergabe eine `notify()`-Benachrichtigung
  aus (Kind `"access"`). `api/src/lib/accessGate.ts` (`checkAccessCode`) ist
  seit dieser Änderung `async` — prüft zuerst die statische
  `PILOT_ACCESS_CODES`-Liste, dann `issuedCodesStore.ts` als Fallback. Die
  Gate-Seite zeigt weiterhin bewusst "Vertrauliche Pilotphase / auf
  ausgewählte Kontakte begrenzt" (Produktentscheidung).

## Bekannte offene Punkte

- **Azure Storage Account für Quota-Persistenz**: `tavyroteiquota` wurde
  angelegt. WICHTIG (live im Portal entdeckt): der Connection String darf
  NICHT über `AzureWebJobsStorage` gesetzt werden — Azure Static Web Apps
  reserviert diesen Namen für seine verwalteten Functions und lehnt das
  Setzen über die Umgebungsvariablen-UI mit `InvalidAppSettings` hart ab.
  Der Code nutzt daher stattdessen `QUOTA_STORAGE_CONNECTION_STRING` (siehe
  `api/src/lib/quotaStore.ts`) — diese Variable muss in den
  Umgebungsvariablen der Static Web App auf den vollständigen Connection
  String (Storage Account → Zugriffsschlüssel → "Verbindungszeichenfolge
  anzeigen" bei key1, NICHT ein SAS-Token/eine SAS-URL) von `tavyroteiquota`
  gesetzt sein, sonst fällt das Limit
  (`api/src/lib/clientIp.ts` + `chat.ts`, Standard 5/Woche pro IP über
  `PILOT_WEEKLY_LIMIT`) auf einen In-Memory-Fallback zurück, der
  Kaltstarts/Skalierung nicht übersteht. Ebenfalls wichtig: `PILOT_WEEKLY_LIMIT`
  ist ein reiner Code-Fallback (Standard `5`), wenn die Variable in Azure
  fehlt — sie muss aktiv als Umgebungsvariable gesetzt werden, um z.B. auf
  `7` zu stehen. Live verifiziert (siehe `/api/quota-debug`, Diagnose-Endpoint
  in `api/src/functions/quotaDebug.ts`, durch Zugangscode geschützt): das
  Limit greift jetzt nachweislich (8. Anfrage liefert `limit_reached` bei
  `PILOT_WEEKLY_LIMIT=7`).
- **Azure Functions v4 Node-Programmiermodell — Registrierungsfalle**:
  `api/src/index.ts` ist der EINZIGE Einstiegspunkt (`"main":
  "dist/src/index.js"` in `api/package.json`, kein automatisches Glob-
  Muster). Jede neue Datei unter `api/src/functions/*.ts` muss dort
  zusätzlich per `import './functions/<name>.js'` eingetragen werden —
  sonst wird `app.http(...)` nie ausgeführt, die Route wird nie registriert
  und liefert dauerhaft 404, OBWOHL Typecheck, Build und der GitHub-
  Actions-Deploy alle sauber grün laufen (kein Fehler irgendwo sichtbar).
  Live so entdeckt: `autoAccess.ts` und `quotaDebug.ts` liefen deswegen
  beide ins Leere, bis sie in `index.ts` nachgetragen wurden. Bei jeder
  neuen Function-Datei zwingend `index.ts` mit anpassen.
- **`getClientIp` (`api/src/lib/clientIp.ts`)**: der `x-forwarded-for`-
  Header hinter Azure Static Web Apps enthält live beobachtet einen
  angehängten Portanteil (z.B. `83.78.242.147:50290` statt nur der IP) —
  ohne Portbereinigung (`stripPort`) hätte das IP-basierte Wochenlimit nie
  zuverlässig zählen können, da der Port pro Verbindung wechselt. Seit der
  Behebung wird der Port vor der Verwendung als Quota-Schlüssel entfernt
  (IPv6 in Klammer-Notation bleibt unangetastet, ausser explizit mit
  angehängtem `:port`).
- Eigene, unabhängige Domain für TEI Trust Room (losgelöst von tavyro.ch)
  sowie vollständige TaVyro-Branding-Entfernung wurden diskutiert, dann
  bewusst zurückgestellt — aktuell bleibt das TaVyro-Logo im Header/Access
  Gate.
- Cowork-Sitzungen mit verbundenem Ordner syncen nicht geräteübergreifend
  (Anthropic-Produktverhalten) — bei Arbeit auf einem anderen Gerät neue
  Sitzung starten und diesen Ordner per `git clone` frisch holen, nicht
  manuell kopieren.

## Git-Hinweis

`git commit`/`push` gelegentlich mit hängendem `.git/index.lock` blockiert
(vermutlich durch parallel offenen Editor/Cursor) — dann hilft
`rm -f .git/index.lock` vor dem nächsten Versuch.
