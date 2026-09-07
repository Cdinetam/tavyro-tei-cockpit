import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { requestChatReply } from '../lib/openaiClient.js'
import { chatMessageHasContent, chatMessageText, type ChatMessage } from '../lib/schema.js'
import { getUsageCount, recordUsage, getWeeklyLimit } from '../lib/quotaStore.js'
import { isDemoExpired, getDemoExpiresAt } from '../lib/pilotWindow.js'
import { notify } from '../lib/notify.js'
import { checkAccessCode } from '../lib/accessGate.js'
import { getClientIp, isUnlimitedIp } from '../lib/clientIp.js'
import { detectReplyLang } from '../lib/replyLang.js'

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
  /**
   * Sprache der Konversation ('de' | 'en'), vom Client anhand der Route
   * (/gespraech vs. /en/gespraech) mitgeschickt — steuert sowohl den
   * System-Prompt (siehe prompt.ts → getChatSystemPrompt) als auch das
   * adviceGuard-Regelwerk (siehe adviceGuard.ts). Fehlt der Wert oder ist er
   * ungültig, wird 'de' angenommen.
   */
  lang?: string
}

// Angehoben von ursprünglich 2000: eine Nachricht kann jetzt einen
// beigefügten Dokumentanhang enthalten (siehe extractDocument.ts,
// MAX_EXTRACTED_CHARS=12000 in documentExtract.ts), der clientseitig in
// denselben content-String eingebettet wird (src/lib/attachments.ts) —
// dieser Cap muss also Platz für getippten Text + eingebetteten
// Dokumenttext bieten.
const MAX_MESSAGE_LENGTH = 16000
// Ab dieser Nachrichtenzahl zum selben Thema schliesst TEI® spätestens mit
// einem klaren Cliffhanger ab, siehe CHAT_SYSTEM_PROMPT.
const CLIFFHANGER_TOPIC_TURN_THRESHOLD = 5
// Harte Obergrenze für Nutzer-Nachrichten INNERHALB EINES einzelnen Gesprächs
// (zusätzlich zum Lifetime-Kontingent PILOT_WEEKLY_LIMIT, das jetzt JEDE
// Chat-Anfrage zählt). Beide Caps liegen standardmässig bei 7 — wer das
// Gesprächs-Cap erreicht, hat das Demo-Kontingent ohnehin aufgebraucht;
// die Antwort ist deshalb dieselbe Upgrade-Meldung (limit_reached), nicht
// mehr ein "Neues Gespräch starten"-Ausweg.
const MAX_MESSAGES_PER_CONVERSATION = Number(process.env.MAX_MESSAGES_PER_CONVERSATION ?? '7')

export async function chat(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const access = await checkAccessCode(req)
  if (access.denied) return access.denied

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const lang: 'de' | 'en' = body.lang === 'en' ? 'en' : 'de'

  if (isDemoExpired()) {
    return {
      status: 200,
      jsonBody: {
        status: 'demo_expired',
        demoExpiresAt: getDemoExpiresAt(),
        message:
          lang === 'en'
            ? 'This live demo phase has ended.'
            : 'Diese Live-Demo-Phase ist abgeschlossen.',
      },
    }
  }

  const sessionId = (body.sessionId ?? '').trim()
  const messages = Array.isArray(body.messages) ? body.messages : []

  if (!sessionId) {
    return { status: 400, jsonBody: { status: 'error', message: 'sessionId fehlt.' } }
  }
  if (messages.length === 0) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: lang === 'en' ? 'Message is missing.' : 'Nachricht fehlt.' },
    }
  }

  // Keine künstliche Obergrenze für die Gesprächslänge mehr (bewusste
  // Entscheidung, siehe Diskussion) — Kostenschutz läuft stattdessen über
  // einen Azure-Budget-Alert statt einer technischen Bremse. Wird die
  // Konversation irgendwann so lang, dass sie das Kontextfenster des
  // Modells sprengt, liefert Azure OpenAI einen Fehler, den der catch-Block
  // unten ohnehin freundlich abfängt.
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user' || !chatMessageHasContent(lastMessage.content)) {
    return {
      status: 400,
      jsonBody: {
        status: 'error',
        message: lang === 'en' ? 'The last message is invalid.' : 'Letzte Nachricht ist ungültig.',
      },
    }
  }
  // Zählt nur den Text-Anteil — ein Bild-Teil (siehe ChatContentPart) hat
  // keine sinnvolle "Zeichenlänge" und wird hier bewusst nicht mitgezählt.
  if (chatMessageText(lastMessage.content).length > MAX_MESSAGE_LENGTH) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: lang === 'en' ? 'Message is too long.' : 'Nachricht ist zu lang.' },
    }
  }

  const replyLang = detectReplyLang(messages, lang)

  const topicTurnHint =
    Number.isFinite(body.topicTurnHint) && (body.topicTurnHint as number) > 0
      ? (body.topicTurnHint as number)
      : 1

  // Demo-Kontingent: Lifetime von PILOT_WEEKLY_LIMIT Chat-Anfragen (Default 7)
  // pro Zugangscode — JEDE Nutzer-Nachricht, die eine KI-Antwort auslöst,
  // zählt, nicht nur der Gesprächsstart. Sonst konnte man nach dem
  // Nachrichten-Cap pro Gespräch (oder per erneutem Einloggen) beliebig oft
  // neu starten und das Limit faktisch umgehen. Schlüssel bleibt der
  // Zugangscode (access.code); IP nur als Fallback, wenn keine Codes gesetzt
  // sind. PILOT_UNLIMITED_IPS bleibt an die Netzwerkverbindung gebunden.
  const totalUserMessages = messages.filter((m) => m.role === 'user').length
  const isFirstTurn = totalUserMessages <= 1
  const clientIp = getClientIp(req)
  const quotaKey = access.code || clientIp
  const limit = getWeeklyLimit()
  const exempt = isUnlimitedIp(clientIp)

  // Letzte noch erlaubte Nachricht innerhalb des Demo-Kontingents bzw. des
  // Gesprächs-Caps — Antwort soll als Cliffhanger sauber abschliessen.
  const isFinalAllowedMessage =
    !exempt &&
    (totalUserMessages === MAX_MESSAGES_PER_CONVERSATION || totalUserMessages === limit)

  if (!exempt) {
    // Kontingent-Check in eigenem try/catch: Storage-Aussetzer dürfen die
    // Anfrage nicht mit nacktem 500 killen. Bei Check-Fehler bewusst "offen"
    // (durchlassen) — Person nicht wegen Infrastruktur blockieren.
    let used = 0
    try {
      used = await getUsageCount(quotaKey)
    } catch (err) {
      context.error('TEI chat: Kontingent-Prüfung fehlgeschlagen, lasse Anfrage durch', err)
    }
    if (used >= limit || totalUserMessages > MAX_MESSAGES_PER_CONVERSATION) {
      return {
        status: 200,
        jsonBody: {
          status: 'limit_reached',
          sessionAnalysesUsed: Math.max(used, totalUserMessages - 1),
          sessionAnalysesLimit: limit,
          message:
            lang === 'en'
              ? 'The free demo session has been used up.'
              : 'Die kostenlose Demo-Sitzung ist aufgebraucht.',
        },
      }
    }
  }

  // Bei der letzten erlaubten Nachricht wird der Turn-Hinweis an das Modell
  // künstlich auf die Cliffhanger-Schwelle angehoben (unabhängig vom
  // tatsächlichen Themen-Streak) — dieselbe Prompt-Regel, die sonst bei
  // Themenerschöpfung greift (siehe CHAT_SYSTEM_PROMPT), sorgt so dafür, dass
  // diese Antwort bewusst und sauber abschliesst statt mitten im Gedanken
  // abzubrechen, weil danach ohnehin keine weitere Antwort mehr folgt.
  const effectiveTopicTurnHint = isFinalAllowedMessage
    ? Math.max(topicTurnHint, CLIFFHANGER_TOPIC_TURN_THRESHOLD)
    : topicTurnHint

  try {
    const result = await requestChatReply(messages, effectiveTopicTurnHint, replyLang, (msg) => context.log(msg))
    const cliffhanger =
      isFinalAllowedMessage || effectiveTopicTurnHint >= CLIFFHANGER_TOPIC_TURN_THRESHOLD || result.themenwechsel

    if (!exempt) {
      // Jede erfolgreiche Antwort verbuchen — sonst lässt sich das Limit durch
      // neue Gespräche / erneutes Einloggen umgehen. Eigens abgefangen: eine
      // bereits erzeugte (kostenpflichtige) Antwort darf nicht verloren gehen,
      // nur weil die Verbuchung danach scheitert.
      try {
        await recordUsage(quotaKey)
      } catch (err) {
        context.error('TEI chat: Kontingent-Verbuchung fehlgeschlagen (Zählung evtl. ungenau)', err)
      }
    }

    if (isFirstTurn && !exempt) {
      try {
        await notify({
          kind: 'chat',
          sessionId,
          // notify() erwartet einen reinen String — bei einer Bild-Nachricht
          // ohne getippten Text liefert chatMessageText('') einen leeren
          // String, daher der Fallback.
          question: chatMessageText(lastMessage.content) || (lang === 'en' ? '[Image]' : '[Bild]'),
          personName: access.ownerName ?? undefined,
        })
      } catch (err) {
        context.error('TEI chat: Benachrichtigung fehlgeschlagen', err)
      }
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
        message:
          lang === 'en'
            ? 'The reply could not be generated right now. Please try again shortly.'
            : 'Die Antwort konnte gerade nicht erstellt werden. Bitte in Kürze erneut versuchen.',
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
