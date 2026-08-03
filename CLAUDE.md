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

- **Nachrichtenlimit pro Einzelgespräch** (`MAX_MESSAGES_PER_CONVERSATION`,
  `api/src/functions/chat.ts`): unabhängig vom `PILOT_WEEKLY_LIMIT`
  (zählt nur begonnene Gespräche, nicht einzelne Nachrichten) — live
  festgestellt, dass eine einzelne, dauerhaft offene Konversation dadurch
  beliebig viele kostenpflichtige Azure-OpenAI-Aufrufe auslösen konnte, ohne
  je gegen das Wochenkontingent zu zählen. Harte Obergrenze (Standard `7`,
  env-konfigurierbar) auf Nutzer-Nachrichten pro Gespräch, geprüft vor dem
  Wochenlimit-Check, ebenfalls für `PILOT_UNLIMITED_IPS` ausgenommen. Neuer
  Status `conversation_limit_reached` (`src/types.ts`,
  `useTrustRoomChat.ts`, `i18n.ts` → `copy.chat.conversationLimitReached`,
  `TrustRoomChat.tsx`) zeigt einen eigenen Bildschirm mit direktem Button
  zum Starten eines neuen Gesprächs (nutzt den bereits bestehenden
  `onRequestNewChat`-Flow aus `App.tsx`, inkl. Bestätigungsdialog bei noch
  ungespeichertem Verlauf).

- **Erzwungener Cliffhanger bei letzter erlaubter Nachricht** (`chat.ts`):
  bei der 7. (letzten von `MAX_MESSAGES_PER_CONVERSATION` erlaubten)
  Nachricht wird der an das Modell übergebene Turn-Hinweis
  (`effectiveTopicTurnHint`) künstlich auf `CLIFFHANGER_TOPIC_TURN_THRESHOLD`
  angehoben — dieselbe Prompt-Regel, die sonst bei Themenerschöpfung greift,
  sorgt so dafür, dass diese letzte Antwort bewusst und sauber Richtung
  echtes Gespräch abschliesst statt mitten im Gedanken abzubrechen, da danach
  ohnehin keine weitere Antwort mehr folgt. Der anschliessende
  `conversation_limit_reached`-Screen (8. Nachricht) formuliert seither
  explizit "Demo-Version-Limite erreicht" mit "Erstgespräch buchen" als
  primärem Button (analog zum Wochenlimit-Screen), "Neues Gespräch starten"
  bleibt als sekundäre Option daneben bestehen.

- **Automatische Spracherkennung beim Erstaufruf ohne /en-Präfix**
  (`detectInitialLang` in `src/lib/i18n.ts`, genutzt in `AccessGate.tsx` und
  `App.tsx` statt `getLangFromPath` NUR für den allerersten Render): löst das
  Problem, dass die Homepage (tavyro.ch, separates Projekt) mit ihrem
  "Dialog starten"-Button immer fest auf die Wurzel `https://tei.tavyro.ch`
  verlinkt, unabhängig von der Sprache der Homepage selbst — englische
  Homepage-Besucher landeten dadurch immer zuerst auf der deutschen
  Zugangsseite. Hat die URL keinen expliziten `/en`-Präfix, wird jetzt
  ersatzweise `navigator.languages` geprüft; beginnt die bevorzugte
  Browsersprache mit "en", startet die Seite direkt auf Englisch. Explizite
  `/en`- oder Root-URLs (z.B. per Lesezeichen oder Zurück-Navigation im
  Browser, siehe `popstate`-Handler) haben weiterhin Vorrang und werden NICHT
  erneut anhand der Browsersprache überschrieben — nur der allererste Render
  nutzt die Erkennung, siehe Kommentar bei `getLangFromPath` vs.
  `detectInitialLang`.

- **Live-Version** (`/live`, `/live/register`, `/live/verify`,
  `/live/forgot-password`, `/live/reset-password`, `/live/gespraech`, jeweils
  auch mit `/en`-Präfix): komplett eigenständige, parallele Ebene neben der
  Demo-Pilotphase — für Personen mit eigenem Konto statt geteiltem
  Zugangscode. Kein Wochenlimit, kein Nachrichten-Cap, kein Cliffhanger
  Richtung Erstgespräch, dafür automatische serverseitige Speicherung jedes
  Gesprächs (geräteübergreifend abrufbar nach Login). Offene
  Selbstregistrierung (E-Mail + Passwort), Konto erst nach Klick auf den
  Bestätigungslink in der Verifikations-E-Mail einsatzfähig (Kostenschutz
  gegen automatisierte Massenregistrierung, da unlimitiert). Sitzung läuft
  nicht automatisch ab (bis aktivem Logout gültig), wird aber bei einem
  Passwort-Reset komplett invalidiert (siehe `invalidateAllSessionsForEmail`
  in `liveSessionStore.ts`). `AccessGate.tsx` überspringt für `/live`-Pfade
  komplett das Demo-Zugangscode-Gate (siehe `isLivePath`) — Live hat sein
  eigenes, unabhängiges Login. Frontend: `LiveAuth.tsx` (Login/Register/
  Verify/Passwort-vergessen/-Reset-Bildschirme, alle im selben visuellen
  Grundgerüst wie `AccessGate.tsx`), `LiveChat.tsx` (Chat-Ansicht ohne
  Cliffhanger-CTA, mit serverseitig geladener statt lokal gespeicherter
  Gesprächsliste), `useLiveChat.ts`, `liveClient.ts` (Sitzungs-Token in
  `localStorage`, bewusst NICHT `sessionStorage` wie beim Demo-Zugangscode —
  "unbegrenzt bis Logout" würde sonst beim Schliessen des Browsers
  faktisch zu einem automatischen Logout). Backend: `api/src/functions/
  live*.ts` + `api/src/lib/live{UserStore,SessionStore,ConversationStore,
  RateLimit,Auth}.ts` — bewusst komplett getrennt von `chat.ts`/
  `accessGate.ts`, damit die produktiv laufende Demo-Ebene unangetastet
  bleibt. Neue Tabellen: `TeiLiveUsers`, `TeiLiveSessions`,
  `TeiLiveConversations`, `TeiLiveRateLimit` (gleiche Storage-Verbindung wie
  die übrigen TEI-Tabellen). Neue Env-Var `APP_BASE_URL` (Basis-URL für
  Links in Live-E-Mails, Standard `https://tei.tavyro.ch`). Auf der
  bestehenden Demo-Landing-Page gibt es einen unauffälligen Link
  "Bereits Live-Zugang? Hier einloggen →" als Einstieg, bis eine eigene
  Skalierungs-Homepage (separates, noch nicht existierendes Projekt unter
  einer neu zu registrierenden Domain `tavyro.com`, siehe Diskussion) einen
  eigenen Login-Button bekommt. **Datenschutz-Link + Zustimmung**: alle
  Live-Bildschirme (`Shell` in `LiveAuth.tsx`) zeigen im Footer einen Link
  zur bestehenden, bereits Trust-Room-spezifischen Datenschutzerklärung
  (`PRIVACY_URL` in `i18n.ts` → `tavyro.ch/de|en/datenschutz`, Abschnitt zur
  Azure-OpenAI-Verarbeitung in der Schweiz, kein KI-Training mit
  Nutzerdaten). Bei der Registrierung ist zusätzlich eine Pflicht-Checkbox
  ("Ich akzeptiere die Datenschutzerklärung") vorgeschaltet, die den
  Submit-Button bis zur Zustimmung blockiert.

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
  ohne Portbereinigung (`stripPort`) hätte ein IP-basiertes Limit nie
  zuverlässig zählen können, da der Port pro Verbindung wechselt.
- **Wochenlimit-Schlüssel: Code statt IP**: `chat.ts`/`analyze.ts` zählen
  `PILOT_WEEKLY_LIMIT` seit dieser Änderung pro **Zugangscode**
  (`access.code`), nicht mehr pro IP-Adresse — eine reine IP-Bindung liess
  sich trivial umgehen (Netzwerkwechsel, z.B. Handy-Hotspot, während
  derselbe dauerhaft gültige Code weiterfunktionierte). IP-Adresse bleibt
  nur Ersatzschlüssel, falls Zugangskontrolle komplett deaktiviert ist
  (kein `PILOT_ACCESS_CODES`). `PILOT_UNLIMITED_IPS` bleibt bewusst ein
  reiner IP-Check, unabhängig vom benutzten Code (für internes Testen von
  einer festen Netzwerkverbindung aus).
- **Missbrauchsschutz für `/api/auto-access`**: eigenständiges IP-Rate-Limit
  (5 Anfragen/Stunde, `api/src/lib/autoAccessRateLimit.ts`, eigene Tabelle
  `TeiAutoAccessRate`) plus Versand-Cooldown pro E-Mail-Adresse (frühestens
  alle 10 Minuten ein tatsächlicher erneuter Versand, siehe `canSend` in
  `issuedCodesStore.ts`) — verhindert, dass der Endpoint zum
  E-Mail-Spam-Vektor wird, unabhängig vom eigentlichen Wochenlimit.
- Eigene, unabhängige Domain für TEI Trust Room (losgelöst von tavyro.ch)
  sowie vollständige TaVyro-Branding-Entfernung wurden diskutiert, dann
  bewusst zurückgestellt — aktuell bleibt das TaVyro-Logo im Header/Access
  Gate.
- **Skalierungs-Homepage `tavyro.com/trustroom`** (separates, noch nicht
  existierendes Projekt, eigene Cowork-Sitzung nötig sobald relevant):
  geplant als eigenständige Marketing-Homepage mit Login-Button zur
  Live-Version, parallel zur bestehenden `tavyro.ch`-Homepage — z.B. für
  unterschiedliche Kundensegmente (Schweiz über `.ch`, international über
  `.com`), technisch unproblematisch, da Azure Static Web Apps mehrere
  Custom Domains pro App erlaubt (Free-Tarif: 2, Standard: 5 — `tei.tavyro.ch`
  belegt aktuell einen Platz). Domain `tavyro.com` muss zuerst registriert
  werden (Aufgabe von Tam, nicht durch Claude ausführbar). Gewählte Struktur
  ist ein **Pfad** (`/trustroom`) statt einer Subdomain — das bedeutet: sobald
  die neue Homepage irgendwo gehostet ist, braucht es dort eine
  Weiterleitungs-/Rewrite-Regel, die genau diesen Pfad zur eigentlichen
  Live-Version durchreicht; das ist Setup-Arbeit im NEUEN Homepage-Projekt,
  nicht in diesem Repo. Bis dahin bleibt der Einstieg über den
  "Bereits Live-Zugang? Hier einloggen →"-Link auf der bestehenden
  Demo-Landing-Page (siehe Live-Version-Eintrag oben).
- Cowork-Sitzungen mit verbundenem Ordner syncen nicht geräteübergreifend
  (Anthropic-Produktverhalten) — bei Arbeit auf einem anderen Gerät neue
  Sitzung starten und diesen Ordner per `git clone` frisch holen, nicht
  manuell kopieren.

## Git-Hinweis

`git commit`/`push` gelegentlich mit hängendem `.git/index.lock` blockiert
(vermutlich durch parallel offenen Editor/Cursor) — dann hilft
`rm -f .git/index.lock` vor dem nächsten Versuch.
