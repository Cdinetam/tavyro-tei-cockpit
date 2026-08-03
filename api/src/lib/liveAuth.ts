import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { resolveSession } from './liveSessionStore.js'

export interface LiveAuthResult {
  denied: HttpResponseInit | null
  /** Normalisierte E-Mail-Adresse der eingeloggten Person. */
  email: string
}

/**
 * Prüft den Live-Sitzungs-Token (`x-tei-live-token`-Header) gegen
 * liveSessionStore.ts — das Live-Pendant zu checkAccessCode() in
 * accessGate.ts. Bewusst ein eigener Header-Name statt der bestehenden
 * `x-tei-access-code`, damit Demo- und Live-Anfragen im Backend eindeutig
 * unterscheidbar bleiben, auch wenn beide Systeme künftig einmal in
 * derselben Anfrage koexistieren sollten.
 */
export async function checkLiveSession(req: HttpRequest): Promise<LiveAuthResult> {
  const token = req.headers.get('x-tei-live-token') ?? ''

  if (!token) {
    return {
      denied: { status: 401, jsonBody: { status: 'error', message: 'Nicht eingeloggt.' } },
      email: '',
    }
  }

  const email = await resolveSession(token)
  if (!email) {
    return {
      denied: { status: 401, jsonBody: { status: 'error', message: 'Sitzung ungültig oder abgelaufen.' } },
      email: '',
    }
  }

  return { denied: null, email }
}
