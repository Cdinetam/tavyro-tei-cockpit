import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { verifyEmailToken } from '../lib/liveUserStore.js'

interface VerifyBody {
  token?: string
}

/**
 * Bestätigt eine Live-Registrierung anhand des Tokens aus der
 * Verifikations-E-Mail (siehe liveUserStore.ts/emailSender.ts). Wird von
 * der SPA-Seite /live/verify aufgerufen, NICHT direkt aus der E-Mail heraus
 * (der E-Mail-Link zeigt auf die SPA, die dann diesen Endpoint aufruft) —
 * so bleibt die Bestätigung ein POST mit sauberer Fehlerdarstellung statt
 * einer nackten API-Antwort.
 */
export async function liveVerifyEmail(req: HttpRequest): Promise<HttpResponseInit> {
  let body: VerifyBody
  try {
    body = (await req.json()) as VerifyBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const token = (body.token ?? '').trim()
  if (!token) {
    return { status: 400, jsonBody: { status: 'error', message: 'Token fehlt.' } }
  }

  const ok = await verifyEmailToken(token)
  if (!ok) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: 'Dieser Bestätigungslink ist ungültig oder abgelaufen.' },
    }
  }

  return { status: 200, jsonBody: { status: 'ok' } }
}

app.http('liveVerifyEmail', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'live/verify-email',
  handler: liveVerifyEmail,
})
