import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { requestChatReply } from '../lib/openaiClient.js'
import type { ChatMessage } from '../lib/schema.js'
import { checkLiveSession } from '../lib/liveAuth.js'
import { saveConversation } from '../lib/liveConversationStore.js'

// Siehe chat.ts für die Begründung der Anhebung von ursprünglich 2000 —
// muss Platz für einen eingebetteten Dokumentanhang bieten (siehe
// extractDocument.ts/documentExtract.ts, src/lib/attachments.ts).
const MAX_MESSAGE_LENGTH = 16000

interface LiveChatRequestBody {
  conversationId?: string | null
  messages?: ChatMessage[]
  lang?: string
}

/**
 * Live-Version-Pendant zu chat.ts — bewusst ein SEPARATER Endpoint statt
 * chat.ts mit Bedingungen zu überladen: die Demo-Ebene (Wochenlimit,
 * Nachrichten-Cap pro Gespräch, Cliffhanger-Mechanik) bleibt dadurch
 * unverändert und unberührt von diesen Änderungen. Unterschiede zu chat.ts:
 *  - Zugriff über echte Session (liveAuth.ts) statt Zugangscode.
 *  - KEIN Wochenlimit, KEIN Nachrichten-Cap pro Gespräch.
 *  - KEIN Cliffhanger: topicTurnHint wird immer als 1 an das Modell
 *    übergeben (nie eskaliert), cliffhanger in der Antwort ist immer false
 *    — das Modell bekommt so nie einen Grund, Richtung "Erstgespräch
 *    buchen" abzuschliessen (siehe CHAT_SYSTEM_PROMPT: dieselbe Regel, die
 *    im Demo-Flow den Cliffhanger auslöst, hängt direkt am Turn-Hinweis).
 *  - Der volle Gesprächsverlauf wird nach jeder erfolgreichen Antwort
 *    automatisch serverseitig gespeichert (liveConversationStore.ts) —
 *    anders als der bewusst zustandslose Demo-Flow.
 */
export async function liveChat(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const auth = await checkLiveSession(req)
  if (auth.denied) return auth.denied

  let body: LiveChatRequestBody
  try {
    body = (await req.json()) as LiveChatRequestBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const lang: 'de' | 'en' = body.lang === 'en' ? 'en' : 'de'
  const messages = Array.isArray(body.messages) ? body.messages : []
  const conversationId = body.conversationId ?? null

  if (messages.length === 0) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: lang === 'en' ? 'Message is missing.' : 'Nachricht fehlt.' },
    }
  }

  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user' || !lastMessage.content?.trim()) {
    return {
      status: 400,
      jsonBody: {
        status: 'error',
        message: lang === 'en' ? 'The last message is invalid.' : 'Letzte Nachricht ist ungültig.',
      },
    }
  }
  if (lastMessage.content.length > MAX_MESSAGE_LENGTH) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: lang === 'en' ? 'Message is too long.' : 'Nachricht ist zu lang.' },
    }
  }

  try {
    // topicTurnHint bewusst konstant 1 — siehe Kommentar oben, verhindert
    // jede Cliffhanger-/Abschluss-Tendenz im Modell für Live-Nutzer.
    const result = await requestChatReply(messages, 1, lang, (msg) => context.log(msg))

    const fullHistory: ChatMessage[] = [...messages, { role: 'assistant', content: result.reply, cliffhanger: false }]

    let savedConversationId = conversationId
    try {
      savedConversationId = await saveConversation(auth.email, conversationId, fullHistory)
    } catch (err) {
      context.error('TEI live chat: Speichern des Gesprächs fehlgeschlagen', err)
      // Die Antwort selbst ist schon generiert (kostenpflichtig) — sie darf
      // nicht verlorengehen, nur weil das Speichern fehlschlägt. Ohne
      // gespeicherte ID bleibt das Gespräch für diese eine Antwort einfach
      // clientseitig, ein erneuter Versuch beim nächsten Turn legt es dann
      // nach.
    }

    return {
      status: 200,
      jsonBody: {
        status: 'ok',
        reply: result.reply,
        cliffhanger: false,
        conversationId: savedConversationId,
      },
    }
  } catch (err) {
    context.error('TEI live chat failed', err)
    return {
      status: 502,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? 'The reply could not be generated right now. Please try again shortly.'
            : 'Die Antwort konnte gerade nicht erstellt werden. Bitte in Kürze erneut versuchen.',
      },
    }
  }
}

app.http('liveChat', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'live/chat',
  handler: liveChat,
})
