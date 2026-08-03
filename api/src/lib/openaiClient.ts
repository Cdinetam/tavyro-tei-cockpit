import {
  aiAnalysisJsonSchema,
  chatMessageText,
  chatReplyJsonSchema,
  type AiAnalysisResult,
  type ChatMessage,
  type ChatReplyResult,
} from './schema.js'
import { SYSTEM_PROMPT, buildUserPrompt, getChatSystemPrompt } from './prompt.js'
import {
  getAdviceReinforcement,
  hasListFormatting,
  isEvasiveReply,
  isExplicitAdviceRequest,
  needsReinforcedRetry,
  stripLeadingBannedOpener,
  stripListMarkers,
  type GuardLang,
} from './adviceGuard.js'

interface AzureOpenAiConfig {
  endpoint: string
  apiKey: string
  deployment: string
  apiVersion: string
}

function readConfig(): AzureOpenAiConfig {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21'

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      'Azure OpenAI ist nicht konfiguriert. AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY und ' +
        'AZURE_OPENAI_DEPLOYMENT müssen in local.settings.json (lokal) bzw. den Function App ' +
        'Application Settings (Azure) gesetzt sein.',
    )
  }

  return { endpoint: endpoint.replace(/\/$/, ''), apiKey, deployment, apiVersion }
}

async function callChatCompletions(
  config: AzureOpenAiConfig,
  question: string,
  useStructuredOutput: boolean,
): Promise<string> {
  const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`

  const body: Record<string, unknown> = {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(question) },
    ],
    temperature: 0.4,
    max_tokens: 2200,
  }

  if (useStructuredOutput) {
    body.response_format = { type: 'json_schema', json_schema: aiAnalysisJsonSchema }
  } else {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Azure OpenAI Fehler (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Azure OpenAI hat keine Antwort geliefert.')
  }
  return content
}

/**
 * Ruft Azure OpenAI auf und liefert das rohe, noch ungeklammerte
 * AiAnalysisResult zurück. Die serverseitige Konfidenz-/Baumtiefen-Klemmung
 * erfolgt separat in schema.ts (clampAiAnalysis) — hier nur Parsing.
 *
 * Struktur-Fallback: einige Deployments/API-Versionen unterstützen
 * response_format: json_schema (strict) noch nicht. In diesem Fall wird
 * automatisch auf json_object mit strikter Prompt-Vorgabe zurückgefallen.
 */
export async function requestAiAnalysis(question: string): Promise<AiAnalysisResult> {
  const config = readConfig()

  let raw: string
  try {
    raw = await callChatCompletions(config, question, true)
  } catch (err) {
    // Fällt zurück auf json_object, falls das Deployment strict structured
    // outputs (json_schema) nicht unterstützt (typischer Fehlercode: 400
    // "response_format.type" nicht unterstützt für dieses Modell/diese
    // API-Version).
    raw = await callChatCompletions(config, question, false)
  }

  let parsed: Omit<AiAnalysisResult, 'eingabeText'>
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Antwort von Azure OpenAI war kein valides JSON.')
  }

  return { ...parsed, eingabeText: question }
}

async function callChatReplyCompletion(
  config: AzureOpenAiConfig,
  history: ChatMessage[],
  topicTurnHint: number,
  useStructuredOutput: boolean,
  lang: GuardLang,
  reinforcement?: string,
  temperature = 0.5,
): Promise<string> {
  const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`

  // Der Turn-Hinweis wird dynamisch pro Aufruf an den System-Prompt
  // angehängt statt als eigene Chat-Nachricht eingefügt — so bleibt die
  // Nachrichtenliste sauber (System zuerst, dann abwechselnd User/Assistant)
  // und der Hinweis ist eindeutig dem aktuellen Turn zugeordnet.
  const turnHintText =
    lang === 'en'
      ? `\n\nCURRENT TURN HINT (internal context, not visible to the person): If the latest user message continues the existing topic, it would be message number ${topicTurnHint} on this topic — see CLIFFHANGER NOTE FOR THIS REPLY above.`
      : `\n\nAKTUELLER TURN-HINWEIS (interner Kontext, nicht für die Person sichtbar): Falls die neueste Nutzer-Nachricht das bisherige Thema fortsetzt, wäre sie die ${topicTurnHint}. Nachricht zu diesem Thema — siehe CLIFFHANGER-HINWEIS FÜR DIESE ANTWORT oben.`
  let systemContent = `${getChatSystemPrompt(lang)}${turnHintText}`
  // Nur beim automatischen Nachforderungs-Versuch gesetzt (siehe
  // requestChatReply/adviceGuard.ts) — verschärft die RATSCHLÄGE-Regel
  // gezielt für diesen einen Retry, statt den Haupt-Prompt dauerhaft zu
  // verändern.
  if (reinforcement) {
    systemContent = `${systemContent}\n\n${reinforcement}`
  }

  const body: Record<string, unknown> = {
    messages: [
      { role: 'system', content: systemContent },
      // m.content wird unverändert durchgereicht — bei einer Bild-Nachricht
      // ist das bereits ein Array aus {type:'text'|'image_url', ...}-Teilen
      // in exakt der Form, die Azure OpenAI (GPT-4o Vision) erwartet (siehe
      // ChatContentPart in schema.ts), keine weitere Umformung nötig.
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature,
    // Die direktivere Antwortlogik (Kernbeobachtung, Differenzierung,
    // Herausforderung, Vorläufige Einschätzung, Handlungssequenz,
    // Entscheidungsregel, Reflexionsfrage) ist deutlich länger als die
    // frühere reflektierende Kurzantwort — 700 Tokens reichten dafür nicht
    // zuverlässig aus und liefen Gefahr, Antworten abzuschneiden.
    max_tokens: 1500,
  }

  if (useStructuredOutput) {
    body.response_format = { type: 'json_schema', json_schema: chatReplyJsonSchema }
  } else {
    body.response_format = { type: 'json_object' }
  }

  // Harte Obergrenze für EINEN einzelnen Azure-OpenAI-Aufruf: ohne dieses
  // Limit könnte ein einzelner hängender/langsamer Call für sich allein
  // schon das kurze Timeout der Azure-SWA-verwalteten Function reissen,
  // bevor die Zeitbudget-Prüfung in requestChatReply überhaupt zwischen
  // zwei Versuchen greifen kann (die prüft nur VOR jedem Retry, nicht
  // während eines laufenden Calls). Läuft der Call in dieses Timeout,
  // wirft fetch einen AbortError, den der Aufrufer wie jeden anderen Fehler
  // behandelt (Fallback auf json_object bzw. abschliessendes catch in
  // chat.ts → 502 mit Nachricht statt eines nackten, leeren 500ers).
  const SINGLE_CALL_TIMEOUT_MS = Number(process.env.CHAT_REPLY_CALL_TIMEOUT_MS ?? '15000')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SINGLE_CALL_TIMEOUT_MS),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Azure OpenAI Fehler (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Azure OpenAI hat keine Antwort geliefert.')
  }
  return content
}

/**
 * Ruft Azure OpenAI für den echten, mehrteiligen Gespräch-Flow auf. history
 * enthält den gesamten bisherigen Gesprächsverlauf inklusive der neuesten
 * Nutzer-Nachricht. topicTurnHint kommt vom Client (siehe useTrustRoomChat)
 * und gibt an, die wievielte Nachricht zum selben Thema die neueste
 * Nachricht wäre, falls sie das bisherige Thema fortsetzt — Grundlage für
 * die Cliffhanger-Regel im Prompt (siehe CHAT_SYSTEM_PROMPT).
 *
 * Sicherheitsnetz (siehe adviceGuard.ts): wirkt eine Antwort ausweichend
 * (keine erkennbare vorläufige Position), werden automatisch bis zu ZWEI
 * weitere Nachforderungs-Versuche mit einem verschärften Zusatz-Hinweis
 * unternommen, bevor die Antwort zurückgegeben wird — ein einzelner Retry
 * erwies sich live als nicht zuverlässig genug (derselbe verschärfte Hinweis
 * kann bei Sampling-Varianz auch beim ersten Retry nochmal ausweichend
 * ausfallen). Der letzte Versuch läuft zusätzlich mit niedrigerer
 * Temperatur, um die Wahrscheinlichkeit einer regelkonformen Antwort weiter
 * zu erhöhen. log (optional) protokolliert, wenn/wie oft das greift — siehe
 * chat.ts.
 */
export async function requestChatReply(
  history: ChatMessage[],
  topicTurnHint: number,
  lang: GuardLang = 'de',
  log?: (message: string) => void,
): Promise<ChatReplyResult> {
  const config = readConfig()

  async function callOnce(reinforcement?: string, temperature?: number): Promise<ChatReplyResult> {
    let raw: string
    try {
      raw = await callChatReplyCompletion(config, history, topicTurnHint, true, lang, reinforcement, temperature)
    } catch {
      // Fällt zurück auf json_object, falls das Deployment strict structured
      // outputs (json_schema) nicht unterstützt.
      raw = await callChatReplyCompletion(config, history, topicTurnHint, false, lang, reinforcement, temperature)
    }

    let parsed: Partial<ChatReplyResult>
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('Antwort von Azure OpenAI war kein valides JSON.')
    }

    return {
      reply: (parsed.reply ?? '').toString().trim(),
      themenwechsel: Boolean(parsed.themenwechsel),
    }
  }

  // Die aktuelle Antwortlogik (siehe CHAT_SYSTEM_PROMPT) verlangt bei JEDER
  // Antwort eine vorläufige Position ("Meine vorläufige Empfehlung ist..."),
  // nicht mehr nur bei ausdrücklicher Nachfrage wie in einer früheren
  // Fassung des Prompts — die Prüfung läuft deshalb auf jede Antwort,
  // unabhängig davon, ob isExplicitAdviceRequest zusätzlich zutrifft (bleibt
  // nur für Logging/Diagnose erhalten, siehe adviceGuard.ts).
  const lastUserMessage = [...history].reverse().find((m) => m.role === 'user')
  // adviceGuard-Regex-Prüfungen laufen bewusst nur auf dem Text-Anteil — ein
  // Bild-Teil (siehe ChatContentPart) hat keinen Text, den eine Regex prüfen
  // könnte.
  const adviceWasRequested =
    !!lastUserMessage && isExplicitAdviceRequest(chatMessageText(lastUserMessage.content), lang)

  // Zeitbudget für die GESAMTE Funktion (Erstversuch + alle Nachforderungs-
  // Versuche zusammen): Azure Static Web Apps' verwaltete Functions laufen
  // hinter einem Reverse Proxy mit einem deutlich kürzeren Hard-Timeout als
  // eine reguläre Function App (die dort übliche 5-Minuten-Grenze gilt hier
  // NICHT). Bis zu drei sequenzielle Azure-OpenAI-Aufrufe (Erstversuch + 2
  // Nachforderungen, siehe unten) können dieses Timeout in Summe reissen —
  // live als nackter, leerer 500er beobachtet (kein try/catch im Aufrufer
  // kann das abfangen, da der Prozess von aussen beendet wird, bevor die
  // Antwort geschrieben ist). Wird das Budget während der Retry-Schleife
  // überschritten, bricht die Schleife sofort ab und die bislang letzte
  // Antwort geht (nach der ohnehin folgenden mechanischen Absicherung
  // weiter unten) zurück, statt einen weiteren, das Timeout riskierenden
  // Aufruf zu starten. Über Env-Variable konfigurierbar für den Fall, dass
  // sich das Plattform-Timeout ändert.
  const startedAt = Date.now()
  const TIME_BUDGET_MS = Number(process.env.CHAT_REPLY_TIME_BUDGET_MS ?? '20000')

  let result = await callOnce()
  const MAX_REINFORCED_ATTEMPTS = 2

  for (
    let attempt = 1;
    attempt <= MAX_REINFORCED_ATTEMPTS && needsReinforcedRetry(result.reply, lang);
    attempt++
  ) {
    if (Date.now() - startedAt >= TIME_BUDGET_MS) {
      log?.(
        `TEI chat: Zeitbudget (${TIME_BUDGET_MS}ms) vor Nachforderungs-Versuch ${attempt}/${MAX_REINFORCED_ATTEMPTS} erreicht — Antwort wird ohne weiteren Versuch mechanisch abgesichert zurückgegeben (Plattform-Timeout-Schutz).`,
      )
      break
    }
    const reason = isEvasiveReply(result.reply, lang)
      ? 'keine erkennbare vorläufige Einschätzung in der Antwort'
      : 'verbotene Listen-/Aufzählungs-Formatierung in der Antwort'
    log?.(
      `TEI chat: ${reason}${
        adviceWasRequested ? ' (trotz expliziter Nachfrage)' : ''
      } — Nachforderungs-Versuch ${attempt}/${MAX_REINFORCED_ATTEMPTS}.`,
    )
    // Der letzte Versuch läuft mit niedrigerer Temperatur, um deterministischer
    // der Anweisung zu folgen, statt erneut auf Sampling-Varianz zu hoffen.
    const temperature = attempt === MAX_REINFORCED_ATTEMPTS ? 0.2 : undefined
    result = await callOnce(getAdviceReinforcement(lang), temperature)
  }

  // Letzte, deterministische Absicherung: bleiben die verbotene Eröffnung
  // ("Sie stehen vor einer komplexen Situation" o.ä.) oder eine verbotene
  // Listen-Formatierung ("1. ... 2. ...") trotz aller Nachforderungs-
  // Versuche bestehen, werden sie mechanisch entfernt statt die Person
  // damit zu konfrontieren — siehe stripLeadingBannedOpener/
  // stripListMarkers in adviceGuard.ts für die Begründung. Beide Prüfungen
  // sind unabhängig voneinander möglich.
  let finalReply = result.reply
  if (isEvasiveReply(finalReply, lang)) {
    const stripped = stripLeadingBannedOpener(finalReply, lang)
    if (stripped !== finalReply) {
      log?.('TEI chat: verbotene Eröffnung auch nach Nachforderungs-Versuchen vorhanden — erster Satz mechanisch entfernt.')
      finalReply = stripped
    }
  }
  if (hasListFormatting(finalReply)) {
    const stripped = stripListMarkers(finalReply)
    if (stripped !== finalReply) {
      log?.('TEI chat: verbotene Listen-Formatierung auch nach Nachforderungs-Versuchen vorhanden — Aufzählungszeichen mechanisch entfernt.')
      finalReply = stripped
    }
  }

  return { ...result, reply: finalReply }
}
