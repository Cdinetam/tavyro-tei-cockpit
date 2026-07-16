import type { AnalyzeResponse, LeadRequest, LeadResponse } from '../types'
import { mockAnalyze } from './aiMock'

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

export async function analyzeQuestion(question: string): Promise<AnalyzeResponse> {
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
    return { status: 'error', message: 'Zugangscode ungültig oder abgelaufen. Bitte Seite neu laden.' }
  }
  if (!response.ok && response.status !== 400) {
    return { status: 'error', message: 'Die Analyse ist gerade nicht erreichbar. Bitte später erneut versuchen.' }
  }

  return (await response.json()) as AnalyzeResponse
}

export async function submitLead(payload: Omit<LeadRequest, 'sessionId'>): Promise<LeadResponse> {
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
    return { status: 'error', message: 'Anfrage konnte nicht übermittelt werden.' }
  }
  return (await response.json()) as LeadResponse
}
