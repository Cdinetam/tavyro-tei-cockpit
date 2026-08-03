import type { AnalyzeResponse, ChatMessage, ChatResponse, LeadRequest, LeadResponse } from '../types'
import { mockAnalyze, mockChatReply } from './aiMock'
import type { Lang } from './i18n'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

/** true, solange keine Azure Function verdrahtet ist — siehe aiMock.ts */
export const isMockMode = !API_BASE_URL

const SESSION_STORAGE_KEY = 'tei-session-id'
const ACCESS_CODE_STORAGE_KEY = 'tei-access-code'

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

export function getStoredAccessCode(): string {
  return sessionStorage.getItem(ACCESS_CODE_STORAGE_KEY) ?? ''
}

export function storeAccessCode(code: string): void {
  sessionStorage.setItem(ACCESS_CODE_STORAGE_KEY, code)
}

function accessHeaders(): Record<string, string> {
  const code = getStoredAccessCode()
  return code ? { 'x-tei-access-code': code } : {}
}

/**
 * Prüft einen Zugangscode gegen das Backend, bevor er lokal gespeichert
 * wird. Ohne Backend (Mock-Modus) wird jeder nicht-leere Code akzeptiert,
 * damit sich der Flow lokal testen lässt.
 */
export async function verifyAccessCode(code: string): Promise<boolean> {
  if (!API_BASE_URL) {
    return code.trim().length > 0
  }

  try {
    const response = await fetch(`${API_BASE_URL}/verify-access`, {
      method: 'POST',
      headers: { 'x-tei-access-code': code },
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Fordert einen Zugangscode per E-Mail an (siehe
 * api/src/functions/autoAccess.ts) — ersetzt den manuellen "E-Mail an
 * hello@tavyro.ch"-Umweg auf der Zugangscode-Gate-Seite (AccessGate.tsx).
 * Anders als die frühere IP-basierte Sofort-Freischaltung ein echtes Gate:
 * der Code selbst kommt NIE in dieser Antwort zurück, sondern nur per
 * E-Mail — die Person muss ihn danach manuell im Zugangscode-Feld eingeben.
 */
export async function requestAutoAccess(
  email: string,
  lang: Lang = 'de',
): Promise<{ status: 'ok' } | { status: 'error'; message: string }> {
  if (!API_BASE_URL) {
    // Mock-Modus: kein Backend nötig, einfach Erfolg simulieren.
    return { status: 'ok' }
  }

  const fallbackMessage =
    lang === 'en'
      ? 'The code could not be sent right now. Please try again shortly.'
      : 'Der Code konnte gerade nicht verschickt werden. Bitte in Kürze erneut versuchen.'

  try {
    const response = await fetch(`${API_BASE_URL}/auto-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, lang }),
    })
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null
      return { status: 'error', message: data?.message ?? fallbackMessage }
    }
    return { status: 'ok' }
  } catch {
    return { status: 'error', message: fallbackMessage }
  }
}

export async function analyzeQuestion(question: string, lang: Lang = 'de'): Promise<AnalyzeResponse> {
  if (!API_BASE_URL) {
    const result = await mockAnalyze(question)
    return { status: 'ok', result, sessionAnalysesUsed: 1, sessionAnalysesLimit: 1 }
  }

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...accessHeaders() },
    body: JSON.stringify({ question, sessionId: getSessionId() }),
  })

  if (response.status === 401) {
    return {
      status: 'error',
      message:
        lang === 'en'
          ? 'Access code invalid or expired. Please reload the page.'
          : 'Zugangscode ungültig oder abgelaufen. Bitte Seite neu laden.',
    }
  }
  if (!response.ok && response.status !== 400) {
    return {
      status: 'error',
      message:
        lang === 'en'
          ? 'The analysis is currently unavailable. Please try again later.'
          : 'Die Analyse ist gerade nicht erreichbar. Bitte später erneut versuchen.',
    }
  }

  return (await response.json()) as AnalyzeResponse
}

/**
 * Sendet eine Nachricht im echten, mehrteiligen Gespräch-Flow. Anders als
 * analyzeQuestion oben wird hier bei jedem Aufruf der gesamte bisherige
 * Verlauf mitgeschickt (inkl. der neuesten Nutzer-Nachricht) — das Backend
 * ist bewusst zustandslos, der Verlauf lebt nur im Browser (siehe
 * useTrustRoomChat). topicTurnHint steuert die Cliffhanger-Regel im
 * Backend/Prompt (siehe dort).
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  topicTurnHint: number,
  lang: Lang = 'de',
): Promise<ChatResponse> {
  if (!API_BASE_URL) {
    const reply = await mockChatReply(messages)
    return { status: 'ok', reply, cliffhanger: topicTurnHint >= 5 }
  }

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...accessHeaders() },
    body: JSON.stringify({ sessionId: getSessionId(), messages, topicTurnHint, lang }),
  })

  if (response.status === 401) {
    return {
      status: 'error',
      message:
        lang === 'en'
          ? 'Access code invalid or expired. Please reload the page.'
          : 'Zugangscode ungültig oder abgelaufen. Bitte Seite neu laden.',
    }
  }
  if (!response.ok && response.status !== 400) {
    return {
      status: 'error',
      message:
        lang === 'en'
          ? 'The Trust Room is currently unavailable. Please try again later.'
          : 'Der Trust Room ist gerade nicht erreichbar. Bitte später erneut versuchen.',
    }
  }

  return (await response.json()) as ChatResponse
}

export type ExtractDocumentResult =
  | { status: 'ok'; text: string; truncated: boolean }
  | { status: 'error'; message: string }

/**
 * Textextraktion für einen Chat-Anhang (PDF/Word/Text) — siehe
 * api/src/functions/extractDocument.ts. Nutzt denselben Zugangscode-Header
 * wie die übrigen Demo-Endpoints (accessHeaders()).
 */
export async function extractDocument(filename: string, contentBase64: string, lang: Lang): Promise<ExtractDocumentResult> {
  const fallbackMessage =
    lang === 'en' ? 'The file could not be read. Please try again.' : 'Die Datei konnte nicht gelesen werden. Bitte erneut versuchen.'

  if (!API_BASE_URL) {
    return { status: 'error', message: lang === 'en' ? 'Not available in mock mode.' : 'Im Mock-Modus nicht verfügbar.' }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/extract-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...accessHeaders() },
      body: JSON.stringify({ filename, contentBase64, lang }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      return { status: 'error', message: (data && (data as { message?: string }).message) || fallbackMessage }
    }
    return data as ExtractDocumentResult
  } catch {
    return { status: 'error', message: fallbackMessage }
  }
}

export async function submitLead(
  payload: Omit<LeadRequest, 'sessionId'>,
  lang: Lang = 'de',
): Promise<LeadResponse> {
  if (!API_BASE_URL) {
    // Im lokalen Demo-Modus ohne Backend gibt es niemanden, der benachrichtigt
    // werden könnte — Erfolg wird simuliert, damit sich der Flow testen lässt.
    await new Promise((resolve) => setTimeout(resolve, 500))
    return { status: 'ok' }
  }

  const response = await fetch(`${API_BASE_URL}/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...accessHeaders() },
    body: JSON.stringify({ ...payload, sessionId: getSessionId() }),
  })

  if (!response.ok) {
    return {
      status: 'error',
      message: lang === 'en' ? 'The request could not be submitted.' : 'Anfrage konnte nicht übermittelt werden.',
    }
  }
  return (await response.json()) as LeadResponse
}
