import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { checkLiveSession } from '../lib/liveAuth.js'
import { clearLiveMemory, isLiveMemoryEmpty, loadLiveMemory } from '../lib/liveMemory.js'

/** Liest oder löscht die persistente Live-Erinnerung der eingeloggten
 * Person. GET liefert bewusst nur, ob eine Notiz existiert — nicht den
 * vollen JSON-Inhalt (der bleibt internes Sparring-Material). */
export async function liveMemory(req: HttpRequest): Promise<HttpResponseInit> {
  const auth = await checkLiveSession(req)
  if (auth.denied) return auth.denied

  if (req.method === 'DELETE') {
    await clearLiveMemory(auth.email)
    return { status: 200, jsonBody: { status: 'ok' } }
  }

  const memory = await loadLiveMemory(auth.email)
  return { status: 200, jsonBody: { status: 'ok', hasMemory: !isLiveMemoryEmpty(memory) } }
}

app.http('liveMemory', {
  methods: ['GET', 'DELETE'],
  authLevel: 'anonymous',
  route: 'live/memory',
  handler: liveMemory,
})
