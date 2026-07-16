import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { notify } from '../lib/notify.js'
import { checkAccessCode } from '../lib/accessGate.js'

interface LeadRequestBody {
  sessionId?: string
  email?: string
  question?: string
  note?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function lead(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const access = checkAccessCode(req)
  if (access.denied) return access.denied

  let body: LeadRequestBody
  try {
    body = (await req.json()) as LeadRequestBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const email = (body.email ?? '').trim()
  const question = (body.question ?? '').trim()
  const sessionId = (body.sessionId ?? '').trim()

  if (!EMAIL_PATTERN.test(email)) {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültige E-Mail-Adresse.' } }
  }
  if (!sessionId) {
    return { status: 400, jsonBody: { status: 'error', message: 'sessionId fehlt.' } }
  }

  try {
    await notify({
      kind: 'lead',
      sessionId,
      question,
      email,
      note: body.note?.trim(),
      personName: access.ownerName ?? undefined,
    })
    return { status: 200, jsonBody: { status: 'ok' } }
  } catch (err) {
    context.error('TEI lead capture failed', err)
    return { status: 502, jsonBody: { status: 'error', message: 'Anfrage konnte nicht übermittelt werden.' } }
  }
}

app.http('lead', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'lead',
  handler: lead,
})
