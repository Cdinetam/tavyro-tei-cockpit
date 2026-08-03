import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { checkLiveSession } from '../lib/liveAuth.js'
import { listConversations, getConversation, deleteConversation } from '../lib/liveConversationStore.js'

/** Listet alle gespeicherten Live-Gespräche der eingeloggten Person (ohne
 * Nachrichteninhalt, nur Übersicht — für eine Seitenleiste o.ä.). */
export async function liveConversationsList(req: HttpRequest): Promise<HttpResponseInit> {
  const auth = await checkLiveSession(req)
  if (auth.denied) return auth.denied

  const conversations = await listConversations(auth.email)
  return { status: 200, jsonBody: { status: 'ok', conversations } }
}

/** Lädt ein einzelnes gespeichertes Live-Gespräch inkl. vollem
 * Nachrichtenverlauf, oder löscht es (je nach HTTP-Methode). Route-Parameter
 * {id} statt Query-String, damit sich die URL sauber cachen/teilen liesse,
 * auch wenn das aktuell nicht genutzt wird. */
export async function liveConversationDetail(req: HttpRequest): Promise<HttpResponseInit> {
  const auth = await checkLiveSession(req)
  if (auth.denied) return auth.denied

  const id = req.params.id
  if (!id) {
    return { status: 400, jsonBody: { status: 'error', message: 'Gespräch-ID fehlt.' } }
  }

  if (req.method === 'DELETE') {
    await deleteConversation(auth.email, id)
    return { status: 200, jsonBody: { status: 'ok' } }
  }

  const conversation = await getConversation(auth.email, id)
  if (!conversation) {
    return { status: 404, jsonBody: { status: 'error', message: 'Gespräch nicht gefunden.' } }
  }
  return { status: 200, jsonBody: { status: 'ok', conversation } }
}

app.http('liveConversationsList', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'live/conversations',
  handler: liveConversationsList,
})

app.http('liveConversationDetail', {
  methods: ['GET', 'DELETE'],
  authLevel: 'anonymous',
  route: 'live/conversations/{id}',
  handler: liveConversationDetail,
})
