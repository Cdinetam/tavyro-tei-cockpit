import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { checkAccessCode } from '../lib/accessGate.js'

export async function verifyAccess(req: HttpRequest): Promise<HttpResponseInit> {
  const access = checkAccessCode(req)
  if (access.denied) return access.denied
  return { status: 200, jsonBody: { status: 'ok' } }
}

app.http('verifyAccess', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'verify-access',
  handler: verifyAccess,
})
