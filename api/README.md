# TEI® AI-Backend — Azure Function

Diese Function ist der Gegenpart zum KI-Sparring-Flow im Frontend
(`src/components/AiScenarioInput.tsx` → `src/lib/aiClient.ts`). Ohne diese
Function läuft das Frontend automatisch im lokalen Mock-Modus (siehe
`src/lib/aiMock.ts`) — nichts bricht, aber es ist keine echte KI-Analyse.

## Was hier passiert

`POST /api/analyze` nimmt eine CEO-Frage entgegen, ruft Azure OpenAI mit
einem fest definierten Prompt auf (`src/lib/prompt.ts`) und liefert eine
strukturierte Antwort im TEI®-Schema zurück (`src/lib/schema.ts`). Zwei
Sicherungen sorgen dafür, dass die Antwort nie mehr Gewissheit vorgibt, als
das Produkt versprechen will:

1. **Prompt-Ebene** — das Modell wird angewiesen, Konfidenz auf
   „niedrig"/„mittel" zu begrenzen und den Ursachenbaum bei der
   Tiefenursache enden zu lassen, ohne die Entscheidungsfrage zu beantworten.
2. **Server-Ebene** (`clampAiAnalysis`) — unabhängig vom Prompt-Verhalten
   wird die Antwort vor dem Versand nochmals geklemmt. Falls das Modell die
   Vorgabe ignoriert, verlässt trotzdem nichts mit „hoch"-Konfidenz oder
   einer vierten Baumebene den Server.

`POST /api/lead` nimmt die optionale Kontaktanfrage aus der gesperrten
Entscheidungsfrage-Karte entgegen und benachrichtigt Tam persönlich (siehe
`notify.ts`) — keine automatisierte Sequenz.

## Voraussetzungen

- Node.js 18+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local)
  — in Cursor: `brew install azure-functions-core-tools@4` (macOS) oder laut
  Microsoft-Anleitung für dein OS
- Eine Azure OpenAI-Ressource mit einem Deployment, das JSON-Ausgabe
  unterstützt (empfohlen: `gpt-4o` oder `gpt-4o-mini`, aktuelle API-Version)

## Setup

```bash
cd api
npm install
cp local.settings.json.example local.settings.json
```

In `local.settings.json` eintragen:

```jsonc
"AZURE_OPENAI_ENDPOINT": "https://<dein-resource-name>.openai.azure.com",
"AZURE_OPENAI_API_KEY": "<dein-api-key>",
"AZURE_OPENAI_DEPLOYMENT": "<dein-deployment-name>",
```

`local.settings.json` ist in `.gitignore` — der Key landet nie im Repo.

## Lokal starten

Zwei Terminals parallel:

```bash
# Terminal 1 — Backend
cd api
npm start
# läuft auf http://localhost:7071
```

```bash
# Terminal 2 — Frontend
# im Projekt-Root: .env anlegen (von .env.example kopieren) mit:
# VITE_API_BASE_URL=http://localhost:7071/api
npm run dev
```

Danach ruft das Frontend automatisch die echte Azure-OpenAI-Antwort ab statt
des lokalen Mocks — sichtbar daran, dass der Hinweis „Demo-Modus lokal · kein
Live-Modell verbunden" im Cockpit verschwindet.

## Schnelltest ohne Frontend

```bash
curl -X POST http://localhost:7071/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"question":"Ich komme nicht mehr aus dem operativen Tagesgeschäft.","sessionId":"test-1"}'
```

## Konfiguration der Demo-Phase

| Variable | Zweck | Beispiel |
|---|---|---|
| `DEMO_EXPIRES_AT` | Harter Stichtag für die gesamte Pilotphase | `2026-09-30T23:59:59Z` |
| `PILOT_ACCESS_CODES` | JSON-Liste individueller Zugangscodes pro Person (leer = Zugangskontrolle deaktiviert) | `[{"name":"Peter Müller","code":"tavyro-mueller-482"}]` |
| `PILOT_WEEKLY_LIMIT` | Vertiefte Analysen pro Person innerhalb von 7 Tagen (gleitendes Fenster) | `5` |
| `QUOTA_STORAGE_CONNECTION_STRING` | Connection String eines eigenen Storage-Accounts (z.B. `tavyroteiquota`) für die persistente Zählung des Nutzungslimits | — |
| `NOTIFY_WEBHOOK_URL` | Webhook für persönliche Benachrichtigung (Slack/Teams/Zapier) | — |
| `ACS_EMAIL_CONNECTION_STRING` | Verbindungszeichenfolge der Azure-Communication-Services-Ressource für den Versand der Zugangscode-E-Mail | — |
| `ACS_SENDER_ADDRESS` | Absenderadresse aus der verknüpften Email-Communication-Services-Domain (z.B. `DoNotReply@xxxxxxxx.azurecomm.net`) | — |

**Zum Nutzungslimit:** Es gilt pro **Zugangscode** (nicht mehr pro
IP-Adresse — IP-Bindung liess sich trivial per Netzwerkwechsel, z.B.
Handy-Hotspot, umgehen, während derselbe dauerhaft gültige Code weiter
funktionierte). Ist Zugangskontrolle deaktiviert (kein `PILOT_ACCESS_CODES`
gesetzt), dient die IP-Adresse als Ersatzschlüssel. Gezählt wird in Azure
Table Storage, sobald `QUOTA_STORAGE_CONNECTION_STRING` gesetzt ist (lokal
ohne Azurite-Emulator automatisch In-Memory als Fallback, siehe
`src/lib/quotaStore.ts`). **Wichtig:** dafür NICHT `AzureWebJobsStorage`
verwenden — Azure Static Web Apps reserviert diesen Namen für seine
verwalteten Functions und lehnt ihn beim Setzen über die
Umgebungsvariablen-UI mit einem Fehler ab. `PILOT_UNLIMITED_IPS` bleibt
bewusst ein reiner IP-Check (unabhängig vom benutzten Code) — für internes
Testen von einer festen Netzwerkverbindung aus.

**Neue Person einladen:** In `PILOT_ACCESS_CODES` einen weiteren Eintrag
`{"name": "...", "code": "..."}` ergänzen. Auf Azure: in den Application
Settings der Static Web App den Wert aktualisieren, kein Redeploy nötig.

**Automatische Zugangscode-Vergabe per E-Mail (echtes Gate):** Besucher ohne
Code müssen nicht mehr manuell per E-Mail an hello@tavyro.ch nachfragen —
auf der Gate-Seite (`AccessGate.tsx`) können sie über "Code per E-Mail
anfordern" ihre Adresse eingeben und bekommen einen fortlaufend
nummerierten Code (z.B. `auto-014`, siehe `src/lib/issuedCodesStore.ts` und
`POST /api/auto-access`) per E-Mail zugeschickt (`api/src/lib/
emailSender.ts`, Versand über Azure Communication Services Email). Der Code
kommt bewusst NIE direkt in der HTTP-Antwort zurück — die Person muss ihn
danach manuell im normalen Zugangscode-Feld eingeben. Ein Code pro
E-Mail-Adresse, dauerhaft gültig, persistiert in derselben
Table-Storage-Verbindung wie das Nutzungslimit
(`QUOTA_STORAGE_CONNECTION_STRING`) — zählt danach ganz normal gegen
`PILOT_WEEKLY_LIMIT`. Bei jedem neu vergebenen Code (nicht bei
Wiederholungsaufrufen derselben Adresse) geht zusätzlich eine
Benachrichtigung an `NOTIFY_WEBHOOK_URL` (Kind `"access"`, siehe
`notify.ts`), damit Tam trotzdem sieht, wer über diesen Weg reinkommt.

**Einrichtung von Azure Communication Services Email** (einmalig, im
Azure-Portal):

1. Ressource **"E-Mail Communication Services"** anlegen (eigene
   Ressourcenart, nicht "Communication Services").
2. Dort unter "Domänen bereitstellen" eine **kostenlose, von Azure
   verwaltete Domain** hinzufügen — liefert sofort eine Absenderadresse wie
   `DoNotReply@xxxxxxxx.azurecomm.net`, keine eigene DNS-Konfiguration und
   keine Wartezeit nötig (für den Pilotbetrieb ausreichend; für bessere
   Zustellbarkeit später optional eine eigene Subdomain wie `mail.tavyro.ch`
   verifizieren).
3. Ressource **"Communication Services"** anlegen (die "normale", nicht die
   Email-spezifische Variante).
4. In dieser Communication-Services-Ressource unter "E-Mail" die
   Email-Domain aus Schritt 2 verknüpfen.
5. Unter "Schlüssel" die **Verbindungszeichenfolge** kopieren → als
   `ACS_EMAIL_CONNECTION_STRING` in den Umgebungsvariablen der Static Web
   App hinterlegen.
6. Die Absenderadresse aus Schritt 2 als `ACS_SENDER_ADDRESS` hinterlegen.

## Bekannte Grenze: Session-Store

`sessionStore.ts` hält das Limit aktuell in einer In-Memory-Map — reicht für
eine einzelne Function-Instanz, aber nicht für produktiven Betrieb mit
mehreren Instanzen (Azure Functions skaliert bei Last automatisch hoch, jede
Instanz zählt dann separat). Für den echten Demo-Betrieb: auf Azure Table
Storage umstellen (Storage-Konto ist ohnehin vorhanden, kein neuer Dienst
nötig). Die Funktionssignaturen sind bewusst so gehalten, dass nur die
Implementierung in `sessionStore.ts` ersetzt werden muss.

## Deployment

Am schnellsten über **Azure Static Web Apps** — bündelt Frontend (`/`) und
diese Function (`/api`) in einem Deployment mit automatischem Routing und
CORS-Handling. Alternativ: Frontend auf Static Web Apps/Vercel/Netlify,
Backend als eigenständige Azure Function App, dann `Host.CORS` in den
Function-App-Einstellungen auf die Frontend-Domain setzen (in
`local.settings.json` nur für lokale Entwicklung relevant).
