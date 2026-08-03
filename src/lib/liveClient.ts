import type { ChatMessage } from '../types'
import type { Lang } from './i18n'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined
export const isLiveMockMode = !API_BASE_URL

// localStorage statt sessionStorage (anders als der Demo-Zugangscode,
// tei-access-code): Produktentscheidung "unbegrenzt eingeloggt bis
// Logout" — ein sessionStorage-Token würde beim Schliessen des Browsers
// verloren gehen, das wäre faktisch ein automatischer Logout.
const LIVE_TOKEN_KEY = 'tei-live-token'

export function getLiveToken(): string {
  return localStorage.getItem(LIVE_TOKEN_KEY) ?? ''
}

export function storeLiveToken(token: string): void {
  localStorage.setItem(LIVE_TOKEN_KEY, token)
}

export function clearLiveToken(): void {
  localStorage.removeItem(LIVE_TOKEN_KEY)
}

function liveHeaders(): Record<string, string> {
  const token = getLiveToken()
  return token ? { 'x-tei-live-token': token } : {}
}

type ApiResult<T> = { status: 'ok' } & T | { status: 'error'; message: string }

async function postJson<T>(path: string, body: unknown, fallbackMessage: string): Promise<ApiResult<T>> {
  if (!API_BASE_URL) {
    return { status: 'error', message: 'Live-Version ist im Mock-Modus nicht verfügbar.' }
  }
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...liveHeaders() },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      return { status: 'error', message: (data && (data as { message?: string }).message) || fallbackMessage }
    }
    return data as ApiResult<T>
  } catch {
    return { status: 'error', message: fallbackMessage }
  }
}

function fallbackError(lang: Lang): string {
  return lang === 'en' ? 'Something went wrong. Please try again.' : 'Etwas ist schiefgelaufen. Bitte erneut versuchen.'
}

export async function liveRegister(
  email: string,
  password: string,
  lang: Lang,
): Promise<ApiResult<Record<string, never>>> {
  return postJson('/live/register', { email, password, lang }, fallbackError(lang))
}

export async function liveVerifyEmail(token: string, lang: Lang): Promise<ApiResult<Record<string, never>>> {
  return postJson('/live/verify-email', { token }, fallbackError(lang))
}

export async function liveLogin(
  email: string,
  password: string,
  lang: Lang,
): Promise<ApiResult<{ token: string }>> {
  const result = await postJson<{ token: string }>('/live/login', { email, password, lang }, fallbackError(lang))
  if (result.status === 'ok') storeLiveToken(result.token)
  return result
}

export async function liveRequestPasswordReset(email: string, lang: Lang): Promise<ApiResult<Record<string, never>>> {
  return postJson('/live/request-password-reset', { email, lang }, fallbackError(lang))
}

export async function liveResetPassword(
  token: string,
  newPassword: string,
  lang: Lang,
): Promise<ApiResult<Record<string, never>>> {
  return postJson('/live/reset-password', { token, newPassword, lang }, fallbackError(lang))
}

export async function liveLogout(): Promise<void> {
  if (API_BASE_URL) {
    try {
      await fetch(`${API_BASE_URL}/live/logout`, { method: 'POST', headers: liveHeaders() })
    } catch {
      // Logout soll lokal in jedem Fall funktionieren, auch wenn der
      // Server-Aufruf fehlschlägt.
    }
  }
  clearLiveToken()
}

export interface LiveChatResponse {
  status: 'ok' | 'error'
  reply?: string
  cliffhanger?: boolean
  conversationId?: string
  message?: string
}

export async function sendLiveChatMessage(
  messages: ChatMessage[],
  conversationId: string | null,
  lang: Lang,
): Promise<LiveChatResponse> {
  if (!API_BASE_URL) {
    return { status: 'error', message: 'Live-Version ist im Mock-Modus nicht verfügbar.' }
  }
  try {
    const response = await fetch(`${API_BASE_URL}/live/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...liveHeaders() },
      body: JSON.stringify({ conversationId, messages, lang }),
    })
    if (response.status === 401) {
      return {
        status: 'error',
        message: lang === 'en' ? 'Session expired. Please log in again.' : 'Sitzung abgelaufen. Bitte erneut einloggen.',
      }
    }
    if (!response.ok && response.status !== 400) {
      return { status: 'error', message: fallbackError(lang) }
    }
    return (await response.json()) as LiveChatResponse
  } catch {
    return { status: 'error', message: fallbackError(lang) }
  }
}

export interface LiveConversationSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export async function listLiveConversations(): Promise<LiveConversationSummary[]> {
  if (!API_BASE_URL) return []
  try {
    const response = await fetch(`${API_BASE_URL}/live/conversations`, { headers: liveHeaders() })
    if (!response.ok) return []
    const data = (await response.json()) as { conversations?: LiveConversationSummary[] }
    return data.conversations ?? []
  } catch {
    return []
  }
}

export async function getLiveConversation(
  id: string,
): Promise<{ id: string; title: string; messages: ChatMessage[] } | null> {
  if (!API_BASE_URL) return null
  try {
    const response = await fetch(`${API_BASE_URL}/live/conversations/${encodeURIComponent(id)}`, {
      headers: liveHeaders(),
    })
    if (!response.ok) return null
    const data = (await response.json()) as { conversation?: { id: string; title: string; messages: ChatMessage[] } }
    return data.conversation ?? null
  } catch {
    return null
  }
}

export async function deleteLiveConversation(id: string): Promise<void> {
  if (!API_BASE_URL) return
  try {
    await fetch(`${API_BASE_URL}/live/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: liveHeaders(),
    })
  } catch {
    // Löschen ist ein Komfort-Feature — ein Fehlschlag hier darf die UI
    // nicht blockieren, die Liste wird beim nächsten Laden wieder korrekt.
  }
}
