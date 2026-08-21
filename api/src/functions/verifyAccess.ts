import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { accessCodeCookieHeader, checkAccessCode } from '../lib/accessGate.js'

interface VerifyAccessBody {
  /** Zugangscode — bevorzugt gegenüber dem Custom-Header, weil manche
   * Mobile-/In-App-Browser Custom-Header strippen. */
  code?: string
  /** Optional — nach "Code per E-Mail anfordern" mitgeschickt, damit der
   * by-email-Eintrag als Fallback greifen kann, falls der by-code-Index fehlt. */
  email?: string
}

async function readVerifyInput(req: HttpRequest): Promise<{ code: string; email: string }> {
  let code = req.query.get('code') ?? ''
  let email = req.query.get('email') ?? ''

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as VerifyAccessBody
      if (body.code) code = body.code
      if (body.email) email = body.email
    } catch {
      // Body optional — Header/Query reichen.
    }
  }

  return { code: code.trim(), email: email.trim() }
}

export async function verifyAccess(req: HttpRequest): Promise<HttpResponseInit> {
  const { code, email } = await readVerifyInput(req)
  const access = await checkAccessCode(req, {
    ...(code ? { code } : {}),
    ...(email ? { email } : {}),
  })
  if (access.denied) return access.denied

  return {
    status: 200,
    jsonBody: { status: 'ok' },
    headers: access.code ? { 'Set-Cookie': accessCodeCookieHeader(access.code) } : undefined,
  }
}

app.http('verifyAccess', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'verify-access',
  handler: verifyAccess,
})
