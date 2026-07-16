# TaVyro Executive Intelligence® — TEI® Cockpit

Ein Web-Prototyp mit zwei Modi:

1. **KI-Sparring** (`/src/components/AiScenarioInput.tsx` → Cockpit) — eine
   freie CEO-Frage wird an Azure OpenAI übergeben und als TEI®-Ersteinschätzung
   strukturiert zurückgegeben. Der Ursachenbaum stoppt bewusst bei der
   Tiefenursache, die Entscheidungsfrage wird benannt statt beantwortet
   ("Cliffhanger") und führt zu „Erstgespräch buchen" bzw. einer persönlichen
   Rückmeldung von Tam. Ohne Backend-Anbindung läuft dieser Modus automatisch
   mit lokal simulierten Antworten (`src/lib/aiMock.ts`) — so lässt sich der
   gesamte Flow testen, bevor Azure OpenAI verdrahtet ist.
2. **Referenzfälle** (vormals der einzige Modus) — fünf vollständig
   ausgearbeitete, statische Schweizer KMU-Fallakten zur Illustration der
   TEI®-Methodik ohne KI-Aufruf.

Reines Frontend-Projekt plus optionales Azure-Function-Backend. Keine
Datenbank, keine echten Kundendaten.

## Schnellstart (nur Frontend, mit simulierter KI-Antwort)

```bash
npm install
npm run dev
```

Browser: **http://localhost:5173**

## Mit echter Azure-OpenAI-Anbindung

Siehe **[`api/README.md`](./api/README.md)** — Setup der Azure Function,
Prompt-Contract, Session-Limit, Deployment.

Kurzfassung:

```bash
cd api && npm install && cp local.settings.json.example local.settings.json
# Azure-OpenAI-Zugangsdaten eintragen, dann:
npm start                      # Backend auf :7071

# in einem zweiten Terminal, im Projekt-Root:
cp .env.example .env           # VITE_API_BASE_URL=http://localhost:7071/api setzen
npm run dev                    # Frontend auf :5173
```

## Weitere Befehle

```bash
npm run build      # Produktions-Build nach dist/
npm run preview    # Produktions-Build lokal testen
```

## Projektstruktur

```
src/
├── App.tsx                     Umschaltung: Landing → KI-Sparring | Referenzfälle
├── types.ts                    Domänenmodell, inkl. AiAnalysisResult (KI-Contract)
├── lib/
│   ├── aiClient.ts              Ruft Azure Function oder fällt auf Mock zurück
│   └── aiMock.ts                Lokale Simulation ohne Backend
├── hooks/
│   ├── useAnalysis.ts           Zustand Referenzfall-Flow
│   └── useAiSession.ts          Zustand KI-Sparring-Flow (loading/limit/expired/error)
├── data/
│   └── scenarios.ts             5 Referenz-Fallakten
└── components/
    ├── AiScenarioInput.tsx       Eingabe für KI-Sparring
    ├── AiAnalysisView.tsx        Loading-/Error-/Limit-/Result-Zustände
    ├── LockedDecisionCard.tsx    Der Cliffhanger: gesperrte Entscheidungsfrage + CTA
    ├── ScenarioInput.tsx         Eingabe für Referenzfälle
    ├── CaseRail.tsx / CaseHeader.tsx
    ├── ExecutiveSituation.tsx / OrganisationSignals.tsx / Hypotheses.tsx
    ├── RootCauseTree.tsx         Von beiden Modi genutzt (Ai-Baum ist Teilmenge)
    ├── DecisionOptions.tsx       Nur Referenzfall-Modus
    └── AdvisoryNote.tsx          Von beiden Modi genutzt

api/                             Azure Function Backend (siehe api/README.md)
├── src/functions/analyze.ts     POST /api/analyze
├── src/functions/lead.ts        POST /api/lead
└── src/lib/                     Prompt, Schema+Klemmung, Session-Limit, Notify
```

## Design-Grundsatz

Dunkles, ruhiges C-Level-Cockpit statt Dashboard: Graphitflächen, ein
zurückhaltender Messing-Akzent, redaktionelle Serife für Titel, Grotesk für
Fliesstext, Mono für Fallnummern und Konfidenzangaben. Konfidenz- und
Signalstärken werden über Tickmarken und Balken codiert, bewusst ohne
Ampelfarben.

## Produktphilosophie des KI-Modus

Die KI liefert Mustererkennung aus einer kurzen Freitext-Eingabe — keine
verifizierte Organisationsanalyse. Diese Grenze wird nicht versteckt, sondern
aktiv gestaltet: gedeckelte Konfidenz, ein Baum, der ehrlich dort endet, wo
das Wissen aufhört, und eine Entscheidungsfrage, die benannt statt
vorgetäuscht beantwortet wird. Das ist kein Verkaufstrick, sondern die
tatsächliche Grenze zwischen Mustererkennung und einem Gespräch mit jemandem,
der die Organisation kennt.

## Hinweis

Dieser Prototyp dient der Konzeptvalidierung. Er ersetzt kein Urteil und
keine reale TEI®-Analyse — diese erfolgt durch TaVyro auf Basis von
C-Level-Erfahrung und Kontextverständnis.
