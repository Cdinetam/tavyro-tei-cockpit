import {
  aiAnalysisJsonSchema,
  chatReplyJsonSchema,
  type AiAnalysisResult,
  type ChatMessage,
  type ChatReplyResult,
} from './schema.js'
import { SYSTEM_PROMPT, buildUserPrompt, CHAT_SYSTEM_PROMPT } from './prompt.js'
import { ADVICE_REINFORCEMENT, isEvasiveReply, isExplicitAdviceRequest } from './adviceGuard.js'

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
  reinforcement?: string,
): Promise<string> {
  const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`

  // Der Turn-Hinweis wird dynamisch pro Aufruf an den System-Prompt
  // angehängt statt als eigene Chat-Nachricht eingefügt — so bleibt die
  // Nachrichtenliste sauber (System zuerst, dann abwechselnd User/Assistant)
  // und der Hinweis ist eindeutig dem aktuellen Turn zugeordnet.
  let systemContent = `${CHAT_SYSTEM_PROMPT}\n\nAKTUELLER TURN-HINWEIS (interner Kontext, nicht für die Person sichtbar): Falls die neueste Nutzer-Nachricht das bisherige Thema fortsetzt, wäre sie die ${topicTurnHint}. Nachricht zu diesem Thema — siehe CLIFFHANGER-HINWEIS FÜR DIESE ANTWORT oben.`
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
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.5,
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
 * Ruft Azure OpenAI für den echten, mehrteiligen Gespräch-Flow auf. history
 * enthält den gesamten bisherigen Gesprächsverlauf inklusive der neuesten
 * Nutzer-Nachricht. topicTurnHint kommt vom Client (siehe useTrustRoomChat)
 * und gibt an, die wievielte Nachricht zum selben Thema die neueste
 * Nachricht wäre, falls sie das bisherige Thema fortsetzt — Grundlage für
 * die Cliffhanger-Regel im Prompt (siehe CHAT_SYSTEM_PROMPT).
 *
 * Sicherheitsnetz (siehe adviceGuard.ts): fragt die Person ausdrücklich nach
 * einer Handlungsempfehlung und wirkt die Antwort trotzdem ausweichend,
 * wird automatisch EIN Nachforderungs-Versuch mit einem verschärften
 * Zusatz-Hinweis unternommen, bevor die Antwort zurückgegeben wird. log
 * (optional) protokolliert, wenn das greift — siehe chat.ts.
 */
export async function requestChatReply(
  history: ChatMessage[],
  topicTurnHint: number,
  log?: (message: string) => void,
): Promise<ChatReplyResult> {
  const config = readConfig()

  async function callOnce(reinforcement?: string): Promise<ChatReplyResult> {
    let raw: string
    try {
      raw = await callChatReplyCompletion(config, history, topicTurnHint, true, reinforcement)
    } catch {
      // Fällt zurück auf json_object, falls das Deployment strict structured
      // outputs (json_schema) nicht unterstützt.
      raw = await callChatReplyCompletion(config, history, topicTurnHint, false, reinforcement)
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

  const result = await callOnce()

  // Die aktuelle Antwortlogik (siehe CHAT_SYSTEM_PROMPT) verlangt bei JEDER
  // Antwort eine "Vorläufige Einschätzung" (Schritt 4), nicht mehr nur bei
  // ausdrücklicher Nachfrage wie in der Vorgänger-Fassung des Prompts —
  // die Prüfung läuft deshalb auf jede Antwort, unabhängig davon, ob
  // isExplicitAdviceRequest zusätzlich zutrifft (bleibt für Logging/
  // Diagnose erhalten, siehe adviceGuard.ts).
  const lastUserMessage = [...history].reverse().find((m) => m.role === 'user')
  const adviceWasRequested = !!lastUserMessage && isExplicitAdviceRequest(lastUserMessage.content)

  if (isEvasiveReply(result.reply)) {
    log?.(
      `TEI chat: keine erkennbare vorläufige Einschätzung in der Antwort${
        adviceWasRequested ? ' (trotz expliziter Nachfrage)' : ''
      } — fordere automatisch strenger nach.`,
    )
    return callOnce(ADVICE_REINFORCEMENT)
  }

  return result
}
