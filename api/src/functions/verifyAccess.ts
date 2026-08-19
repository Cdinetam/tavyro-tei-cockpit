import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { checkAccessCode } from '../lib/accessGate.js'

interface VerifyAccessBody {
  /** Optional — nach "Code per E-Mail anfordern" mitgeschickt, damit der
   * by-email-Eintrag als Fallback greifen kann, falls der by-code-Index fehlt. */
  email?: string
}

export async function verifyAccess(req: HttpRequest): Promise<HttpResponseInit> {
  let email = ''
  try {
    const body = (await req.json()) as VerifyAccessBody
    email = (body.email ?? '').trim()
  } catch {
    // Body ist optional — reine Header-Prüfung bleibt gültig.
  }

  const access = await checkAccessCode(req, email ? { email } : undefined)
  if (access.denied) return access.denied
  return { status: 200, jsonBody: { status: 'ok' } }
}

app.http('verifyAccess', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'verify-access',
  handler: verifyAccess,
})
