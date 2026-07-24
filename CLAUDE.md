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
- **Alte Einmal-Analyse-Demo entfernt** (Produktentscheidung: der Dialog
  ist strikt überlegen, eine parallele schwächere Version verwässert den
  Cliffhanger-Effekt). Zugehörige Dateien (`api/src/functions/analyze.ts`,
  `src/components/AiScenarioInput.tsx`, `AiAnalysisView.tsx`,
  `EmpathicReflection.tsx`, `LockedDecisionCard.tsx`, `AdvisoryNote.tsx`*,
  `src/hooks/useAiSession.ts`) sind NICHT gelöscht (Sandbox-`rm`-Probleme
  bei Löschversuchen), aber aus Landing.tsx/App.tsx ausgehängt — toter Code,
  kann bei Gelegenheit bereinigt werden. *`AdvisoryNote.tsx` wird
  weiterhin vom separaten statischen Referenzfälle-Bereich genutzt, nicht
  löschen.
- `src/types.ts` — Frontend-Pendant zu `api/src/lib/schema.ts` (muss
  synchron gehalten werden, siehe Kommentar dort).
- `src/data/scenarios.ts` + zugehörige Komponenten (`AnalysisView.tsx`,
  `ExecutiveSituation.tsx`, `Hypotheses.tsx`, `RootCauseTree.tsx` etc.) —
  **separate, statische Referenzfälle-Ansicht** ("Referenzfälle ansehen"),
  zeigt bewusst noch die volle strukturierte Methodik (6 Dimensionen,
  Hypothesen) als Showcase — unabhängig vom Live-KI-Flow, nicht anfassen
  bei Änderungen am KI-Flow.
- `public/tavyro-logo.png` — TaVyro-Logo, Claim-Text ("People |
  Organisation | Impact") in Hellgold für Lesbarkeit auf Nachtblau-Hintergrund.

## Bekannte offene Punkte

- **Azure Storage Account für Quota-Persistenz**: `tavyroteiquota` wurde
  angelegt, `AzureWebJobsStorage` (Achtung Gross-/Kleinschreibung, genau
  so) muss in den Umgebungsvariablen der Static Web App auf den Connection
  String von `tavyroteiquota` gesetzt sein, sonst fällt das IP-Limit
  (`api/src/lib/clientIp.ts` + `chat.ts`, Standard 5/Woche pro IP über
  `PILOT_WEEKLY_LIMIT`) auf einen In-Memory-Fallback zurück, der
  Kaltstarts/Skalierung nicht übersteht — Stand zuletzt: im Portal
  eingerichtet, aber nicht mit letzter Sicherheit bestätigt, dass der
  Connection String tatsächlich im Feld mit korrekter Gross-/
  Kleinschreibung gespeichert wurde.
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
