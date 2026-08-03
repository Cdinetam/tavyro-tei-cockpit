import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { deleteSession } from '../lib/liveSessionStore.js'

export async function liveLogout(req: HttpRequest): Promise<HttpResponseInit> {
  const token = req.headers.get('x-tei-live-token') ?? ''
  if (token) await deleteSession(token)
  return { status: 200, jsonBody: { status: 'ok' } }
}

app.http('liveLogout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'live/logout',
  handler: liveLogout,
})
