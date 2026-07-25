import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { requestChatReply } from '../lib/openaiClient.js'
import type { ChatMessage } from '../lib/schema.js'
import { getUsageCount, recordUsage, getWeeklyLimit } from '../lib/quotaStore.js'
import { isDemoExpired, getDemoExpiresAt } from '../lib/pilotWindow.js'
import { notify } from '../lib/notify.js'
import { checkAccessCode } from '../lib/accessGate.js'
import { getClientIp, isUnlimitedIp } from '../lib/clientIp.js'

interface ChatRequestBody {
  sessionId?: string
  messages?: ChatMessage[]
  /**
   * Vom Client mitgeschickt (siehe useTrustRoomChat): die wievielte
   * Nachricht zum selben Thema die neueste Nutzer-Nachricht wäre, falls sie
   * das bisherige Thema fortsetzt. Grundlage für die Cliffhanger-Regel —
   * fehlt der Wert (z.B. erste Nachricht überhaupt), wird 1 angenommen.
   */
  topicTurnHint?: number
}

const MAX_MESSAGE_LENGTH = 2000
// Ab dieser Nachrichtenzahl zum selben Thema schliesst TEI® spätestens mit
// einem klaren Cliffhanger ab, siehe CHAT_SYSTEM_PROMPT.
const CLIFFHANGER_TOPIC_TURN_THRESHOLD = 5

export async function chat(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const access = checkAccessCode(req)
  if (access.denied) return access.denied

  if (isDemoExpired()) {
    return {
      status: 200,
      jsonBody: {
        status: 'demo_expired',
        demoExpiresAt: getDemoExpiresAt(),
        message: 'Diese Live-Demo-Phase ist abgeschlossen.',
      },
    }
  }

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const sessionId = (body.sessionId ?? '').trim()
  const messages = Array.isArray(body.messages) ? body.messages : []

  if (!sessionId) {
    return { status: 400, jsonBody: { status: 'error', message: 'sessionId fehlt.' } }
  }
  if (messages.length === 0) {
    return { status: 400, jsonBody: { status: 'error', message: 'Nachricht fehlt.' } }
  }

  // Keine künstliche Obergrenze für die Gesprächslänge mehr (bewusste
  // Entscheidung, siehe Diskussion) — Kostenschutz läuft stattdessen über
  // einen Azure-Budget-Alert statt einer technischen Bremse. Wird die
  // Konversation irgendwann so lang, dass sie das Kontextfenster des
  // Modells sprengt, liefert Azure OpenAI einen Fehler, den der catch-Block
  // unten ohnehin freundlich abfängt.
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user' || !lastMessage.content?.trim()) {
    return { status: 400, jsonBody: { status: 'error', message: 'Letzte Nachricht ist ungültig.' } }
  }
  if (lastMessage.content.length > MAX_MESSAGE_LENGTH) {
    return { status: 400, jsonBody: { status: 'error', message: 'Nachricht ist zu lang.' } }
  }

  const topicTurnHint =
    Number.isFinite(body.topicTurnHint) && (body.topicTurnHint as number) > 0
      ? (body.topicTurnHint as number)
      : 1

  // Das Wochenlimit gilt pro begonnenem Gespräch, nicht pro einzelner
  // Nachricht — ein echtes Gespräch besteht naturgemäss aus mehreren
  // Hin-und-her-Nachrichten, die nicht einzeln gegen das Kontingent zählen
  // dürfen. Geprüft und gezählt wird das Limit daher nur beim ersten Turn;
  // ein bereits laufendes Gespräch darf zu Ende geführt werden, selbst wenn
  // das Kontingent zwischenzeitlich durch andere Anfragen erreicht wird.
  // Nutzt denselben IP-Schlüssel/dieselbe Tabelle wie die Einmal-Analyse
  // (analyze.ts) — das Limit gilt für die Nutzung insgesamt, nicht separat
  // pro Feature.
  const isFirstTurn = messages.filter((m) => m.role === 'user').length <= 1
  const quotaKey = getClientIp(req)
  const limit = getWeeklyLimit()
  const exempt = isUnlimitedIp(quotaKey)

  if (isFirstTurn && !exempt) {
    const used = await getUsageCount(quotaKey)
    if (used >= limit) {
      return {
        status: 200,
        jsonBody: {
          status: 'limit_reached',
          sessionAnalysesUsed: used,
          sessionAnalysesLimit: limit,
          message: `Das Limit von ${limit} Gesprächen für diese IP-Adresse ist erreicht.`,
        },
      }
    }
  }

  try {
    const result = await requestChatReply(messages, topicTurnHint, (msg) => context.log(msg))
    const cliffhanger = topicTurnHint >= CLIFFHANGER_TOPIC_TURN_THRESHOLD || result.themenwechsel

    if (isFirstTurn && !exempt) {
      await recordUsage(quotaKey)
      await notify({
        kind: 'chat',
        sessionId,
        question: lastMessage.content,
        personName: access.ownerName ?? undefined,
      })
    }

    return {
      status: 200,
      jsonBody: { status: 'ok', reply: result.reply, cliffhanger },
    }
  } catch (err) {
    context.error('TEI chat failed', err)
    return {
      status: 502,
      jsonBody: {
        status: 'error',
        message: 'Die Antwort konnte gerade nicht erstellt werden. Bitte in Kürze erneut versuchen.',
      },
    }
  }
}

app.http('chat', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'chat',
  handler: chat,
})
