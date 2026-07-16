# TEI® Cockpit veröffentlichen — Schritt für Schritt

Ziel: Aus `localhost` wird `https://tei.tavyro.ch`, erreichbar für ausgewählte
Kontakte, geschützt durch einen Zugangscode, ohne dass dein Laptop dafür an
sein muss.

Weg: **Azure Static Web Apps** — hostet Frontend und Backend (`api`-Ordner)
zusammen in einem Deployment, verbindet sich direkt mit deinem GitHub-Repo
und baut/deployed automatisch bei jedem Push.

---

## Schritt 1 — Projekt auf GitHub bringen

Im Cursor-Terminal, im Projekt-Hauptordner (nicht in `api`):

```bash
git init
git add .
git commit -m "Initial commit: TEI Cockpit"
```

Dann auf [github.com](https://github.com) ein **neues, leeres Repository**
anlegen (z. B. `tavyro-tei-cockpit`) — **ohne** README/.gitignore beim
Anlegen ankreuzen, das Projekt bringt das schon mit.

GitHub zeigt dir danach Befehle wie diese an (mit deinem echten Repo-Namen):

```bash
git remote add origin https://github.com/DEIN-USERNAME/tavyro-tei-cockpit.git
git branch -M main
git push -u origin main
```

Diese drei Zeilen im Terminal ausführen. Danach ist der Code auf GitHub.

**Wichtig:** `local.settings.json` und `.env` werden durch `.gitignore`
automatisch **nicht** mit hochgeladen — deine Azure-Zugangsdaten landen also
nicht öffentlich auf GitHub. Das ist gewollt und richtig so.

---

## Schritt 2 — Azure Static Web App anlegen

1. Im Azure Portal: **„Ressource erstellen"** → suchen nach **„Static Web App"**
2. Ausfüllen:
   - **Resource Group:** dieselbe wie bei deiner OpenAI-Ressource (z. B. `TaVyroAzure2026`)
   - **Name:** z. B. `tavyro-tei-cockpit`
   - **Plan-Typ:** „Standard" (der kostenlose „Free"-Plan hat kein Custom-Domain-SLA und weniger Funktionen — für eine echte Pilotphase mit Kunden würde ich Standard nehmen)
   - **Region:** möglichst nah an Switzerland North, z. B. **West Europe**
   - **Bereitstellungsdetails / Deployment source:** **GitHub** auswählen
3. Mit GitHub verbinden (Login-Aufforderung folgen), dann:
   - **Organization:** dein GitHub-Konto
   - **Repository:** `tavyro-tei-cockpit`
   - **Branch:** `main`
4. Build-Details:
   - **Build Presets:** „Custom" oder „React" (falls Vite nicht direkt gelistet ist)
   - **App location:** `/`
   - **Api location:** `api`
   - **Output location:** `dist`
5. **„Überprüfen + erstellen"** → **„Erstellen"**

Azure legt jetzt automatisch eine GitHub-Actions-Workflow-Datei in deinem
Repo an und startet den ersten Build. Das dauert 2–5 Minuten. Du kannst den
Fortschritt im GitHub-Repo unter dem Reiter **„Actions"** verfolgen.

Sobald fertig, bekommst du im Azure Portal unter **„Übersicht"** eine
automatisch generierte URL wie `https://calm-forest-0123.azurestaticapps.net`
— das ist deine Demo, schon live, nur noch ohne echte Zugangsdaten.

---

## Schritt 3 — Zugangsdaten eintragen (Application Settings)

Diese Werte liegen bei dir lokal in `api/local.settings.json` — auf Azure
müssen sie separat eingetragen werden, da diese Datei nie hochgeladen wird.

1. In der Static Web App-Ressource im Portal: linkes Menü → **„Configuration"** (oder „Konfiguration")
2. Für jede Zeile aus deiner lokalen `local.settings.json` (ausser
   `AzureWebJobsStorage` und `FUNCTIONS_WORKER_RUNTIME`, die braucht Azure
   hier nicht) einen neuen Eintrag über **„+ Add"** anlegen:

| Name | Wert |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | `https://tavyroazure2026.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | dein Key |
| `AZURE_OPENAI_DEPLOYMENT` | `TaVyro-gpt-4o` |
| `AZURE_OPENAI_API_VERSION` | `2024-10-21` |
| `DEMO_EXPIRES_AT` | z. B. `2026-09-30T23:59:59Z` |
| `PILOT_ACCESS_CODES` | JSON-Liste, siehe unten |
| `PILOT_WEEKLY_LIMIT` | `5` |
| `NOTIFY_WEBHOOK_URL` | optional, siehe unten |

3. **„Save"** klicken

**Zu `PILOT_ACCESS_CODES`:** Jede eingeladene Person bekommt einen eigenen
Code, damit das Wochenlimit ihr persönlich zugeordnet werden kann — nicht
einem geteilten Code, den sich mehrere Personen teilen und gegenseitig
aufbrauchen würden. Format, als eine Zeile ohne Zeilenumbrüche:

```json
[{"name":"Peter Müller","code":"tavyro-mueller-482"},{"name":"Sandra Keller","code":"tavyro-keller-917"}]
```

Ein einfaches Namensschema, das sich leicht mündlich weitergeben lässt:
`tavyro-<nachname>-<dreistellige-zahl>`. Neue Person einladen: Eintrag zur
Liste ergänzen, Application Setting speichern — kein Redeploy nötig, wirkt
sofort.

**Zu `NOTIFY_WEBHOOK_URL`:** Wenn du möchtest, dass du bei jeder Sparring-Session automatisch benachrichtigt wirst (z. B. per Slack), sag mir Bescheid — das richten wir separat ein, ist optional und die Demo funktioniert auch ohne.

---

## Schritt 4 — Eigene Domain `tei.tavyro.ch` verbinden

1. In der Static Web App-Ressource: linkes Menü → **„Custom domains"**
2. **„+ Add"** → Domain eingeben: `tei.tavyro.ch`
3. Azure zeigt dir einen **CNAME-Eintrag** an, den du bei deinem
   DNS-Anbieter (dort, wo `tavyro.ch` verwaltet wird — z. B. bei deinem
   Domain-Registrar oder deinem Website-Baukasten) hinzufügen musst:
   - **Name/Host:** `tei`
   - **Ziel/Value:** die von Azure angezeigte Adresse (etwas wie `calm-forest-0123.azurestaticapps.net`)
4. Nach dem Eintragen beim DNS-Anbieter zurück zu Azure, **„Validate"** klicken
   (kann je nach DNS-Anbieter zwischen Minuten und einigen Stunden dauern)
5. Sobald validiert, provisioniert Azure automatisch ein **kostenloses
   HTTPS-Zertifikat** für die Domain — kein Zusatzschritt nötig

**Falls du nicht weisst, wo die DNS-Einstellungen für tavyro.ch liegen**, sag
mir, wo die Domain registriert ist (z. B. Hostpoint, Infomaniak, GoDaddy,
Cloudflare) — dann zeig ich dir den genauen Klickpfad für diesen Anbieter.

---

## Schritt 5 — Testen

1. `https://tei.tavyro.ch` öffnen (oder erstmal die automatisch generierte
   `azurestaticapps.net`-Adresse, falls die Domain noch nicht validiert ist)
2. Es sollte die Zugangscode-Eingabe erscheinen
3. Zugangscode eingeben (den, den du in Schritt 3 als `PILOT_ACCESS_CODE`
   gesetzt hast)
4. Danach ganz normal die Demo testen — „Analyse starten", eigene Frage
   eingeben

---

## Laufende Kosten, ehrlich eingeordnet

- **Azure Static Web Apps, Standard-Plan:** ca. 9 USD/Monat Grundgebühr
- **Azure OpenAI:** nutzungsbasiert, abhängig davon, wie viele Analysen
  tatsächlich laufen — bei einer kleinen Pilotgruppe mit dem eingebauten
  Session-Limit (1 Analyse pro Sitzung) bleibt das überschaubar, aber nicht
  exakt vorhersehbar ohne Blick auf die Azure-Kostenanalyse
- Custom Domain selbst kostet bei Azure nichts zusätzlich, du zahlst nur die
  Domain-Registrierung, die du ohnehin schon hast

## Jede spätere Codeänderung

Sobald das einmal eingerichtet ist, reicht für jede zukünftige Änderung:
```bash
git add .
git commit -m "Beschreibung der Änderung"
git push
```
Azure baut und deployed automatisch neu, meist in 2–3 Minuten.
