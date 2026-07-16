import { aiAnalysisJsonSchema, type AiAnalysisResult } from './schema.js'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt.js'

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
