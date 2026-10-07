import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { checkLiveSession } from '../lib/liveAuth.js'
import {
  applyUserMemoryEdit,
  clearLiveMemory,
  isLiveMemoryEmpty,
  loadLiveMemory,
  syncPendingConversationsIntoMemory,
  type LiveMemory,
} from '../lib/liveMemory.js'

/** Liest, korrigiert oder löscht die persistente Live-Erinnerung der
 * eingeloggten Person. GET liefert den vollen Inhalt, damit die Person in
 * der Ansicht "Was TEI über mich weiss" sieht und korrigieren kann, was
 * über sie gespeichert ist. */
export async function liveMemory(req: HttpRequest): Promise<HttpResponseInit> {
  const auth = await checkLiveSession(req)
  if (auth.denied) return auth.denied

  if (req.method === 'DELETE') {
    await clearLiveMemory(auth.email)
    return { status: 200, jsonBody: { status: 'ok' } }
  }

  if (req.method === 'PUT') {
    let body: { memory?: Partial<LiveMemory> }
    try {
      body = (await req.json()) as { memory?: Partial<LiveMemory> }
    } catch {
      return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
    }
    if (!body.memory || typeof body.memory !== 'object') {
      return { status: 400, jsonBody: { status: 'error', message: 'Erinnerung fehlt.' } }
    }
    const memory = await applyUserMemoryEdit(auth.email, body.memory)
    return { status: 200, jsonBody: { status: 'ok', hasMemory: !isLiveMemoryEmpty(memory), memory } }
  }

  const memory = await loadLiveMemory(auth.email)
  return { status: 200, jsonBody: { status: 'ok', hasMemory: !isLiveMemoryEmpty(memory), memory } }
}

/** Arbeitet noch nicht eingeflossene Gespräche schrittweise in die
 * Erinnerung ein. Der Client ruft das beim Öffnen von Live wiederholt auf,
 * bis remaining 0 ist (siehe syncPendingConversationsIntoMemory). */
export async function liveMemorySync(req: HttpRequest): Promise<HttpResponseInit> {
  const auth = await checkLiveSession(req)
  if (auth.denied) return auth.denied

  const result = await syncPendingConversationsIntoMemory(auth.email)
  return { status: 200, jsonBody: { status: 'ok', ...result } }
}

app.http('liveMemory', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'live/memory',
  handler: liveMemory,
})

app.http('liveMemorySync', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'live/memory/sync',
  handler: liveMemorySync,
})
