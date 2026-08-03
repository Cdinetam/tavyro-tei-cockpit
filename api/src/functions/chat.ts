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
  /**
   * Sprache der Konversation ('de' | 'en'), vom Client anhand der Route
   * (/gespraech vs. /en/gespraech) mitgeschickt — steuert sowohl den
   * System-Prompt (siehe prompt.ts → getChatSystemPrompt) als auch das
   * adviceGuard-Regelwerk (siehe adviceGuard.ts). Fehlt der Wert oder ist er
   * ungültig, wird 'de' angenommen.
   */
  lang?: string
}

const MAX_MESSAGE_LENGTH = 2000
// Ab dieser Nachrichtenzahl zum selben Thema schliesst TEI® spätestens mit
// einem klaren Cliffhanger ab, siehe CHAT_SYSTEM_PROMPT.
const CLIFFHANGER_TOPIC_TURN_THRESHOLD = 5
// Harte, rein technische Obergrenze für Nutzer-Nachrichten INNERHALB EINES
// einzelnen Gesprächs — unabhängig vom PILOT_WEEKLY_LIMIT weiter unten, das
// nur zählt, wie viele Gespräche begonnen wurden, nicht wie viele Nachrichten
// ein einzelnes Gespräch enthält (bewusste frühere Design-Entscheidung, siehe
// CLAUDE.md: "kein Nachrichtenlimit, Kostenschutz über Azure-Budget-Alert").
// Live-Beobachtung: dadurch konnte eine einzelne, dauerhaft offene Konversation
// beliebig viele kostenpflichtige Azure-OpenAI-Aufrufe auslösen, ohne je
// gegen das Wochenlimit zu zählen. Dieser Wert ist bewusst als zusätzliche,
// unabhängige Bremse gedacht, nicht als Ersatz für PILOT_WEEKLY_LIMIT.
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
  //
  // Schlüssel für die Zählung ist der Zugangscode selbst (access.code), NICHT
  // mehr die IP-Adresse — live festgestellt, dass eine reine IP-Bindung
  // trivial umgehbar ist (z.B. per Handy-Hotspot mit neuer IP, aber
  // demselben, dauerhaft gültigen Code). Ist Zugangskontrolle deaktiviert
  // (kein PILOT_ACCESS_CODES gesetzt, access.code dann leer), bleibt die
  // IP-Adresse als einzig sinnvoller Ersatzschlüssel. Nutzt denselben
  // Schlüssel/dieselbe Tabelle wie die Einmal-Analyse (analyze.ts) — das
  // Limit gilt für die Nutzung insgesamt, nicht separat pro Feature.
  const totalUserMessages = messages.filter((m) => m.role === 'user').length
  const isFirstTurn = totalUserMessages <= 1
  const clientIp = getClientIp(req)
  const quotaKey = access.code || clientIp
  const limit = getWeeklyLimit()
  // Die Ausnahme für interne Test-IPs (PILOT_UNLIMITED_IPS) bleibt bewusst an
  // die tatsächliche Netzwerkverbindung gebunden, nicht an den Code — so
  // bleibt z.B. Tams eigenes Testen unlimitiert, unabhängig davon, welchen
  // Code er gerade benutzt.
  const exempt = isUnlimitedIp(clientIp)

  // Genau die letzte noch erlaubte Nachricht dieses Gesprächs (z.B. die 7.
  // von 7) — ab hier gibt es keine weitere Antwort mehr, siehe Block direkt
  // darunter. Diese eine Antwort soll deshalb bewusst nicht einfach mitten im
  // Thema abbrechen, sondern wie ein regulärer Cliffhanger (siehe
  // CLIFFHANGER_TOPIC_TURN_THRESHOLD) sauber Richtung echtes Gespräch
  // abschliessen.
  const isFinalAllowedMessage = totalUserMessages === MAX_MESSAGES_PER_CONVERSATION && !exempt

  // Nachrichten-Cap pro Gespräch — siehe MAX_MESSAGES_PER_CONVERSATION oben.
  // Bewusst VOR dem Wochenlimit geprüft und unabhängig von isFirstTurn (greift
  // ja gerade bei späteren Nachrichten desselben Gesprächs), aber genau wie
  // das Wochenlimit für als unlimitiert markierte Test-IPs ausgenommen.
  if (totalUserMessages > MAX_MESSAGES_PER_CONVERSATION && !exempt) {
    return {
      status: 200,
      jsonBody: {
        status: 'conversation_limit_reached',
        message:
          lang === 'en'
            ? `This conversation has reached its maximum length (${MAX_MESSAGES_PER_CONVERSATION} messages). Please start a new conversation, or continue in a real conversation with Tam Nguyen.`
            : `Dieses Gespräch hat seine maximale Länge erreicht (${MAX_MESSAGES_PER_CONVERSATION} Nachrichten). Bitte starten Sie ein neues Gespräch, oder führen Sie es in einem echten Gespräch mit Tam Nguyen weiter.`,
      },
    }
  }

  if (isFirstTurn && !exempt) {
    // Der Kontingent-Check läuft bewusst in einem eigenen try/catch statt
    // ungeschützt: ein Aussetzer in der Table-Storage-Anbindung (Netzwerk,
    // Drosselung o.ä.) darf nicht die gesamte Anfrage mit einem nackten,
    // nicht abgefangenen 500 ohne jede Nachricht zum Absturz bringen — live
    // beobachtet. Fällt der Check aus, wird bewusst "offen" fehlgeschlagen
    // (Anfrage durchgelassen): eine echte Person nicht wegen eines
    // Infrastruktur-Hakelers zu blockieren wiegt schwerer als ein einzelnes,
    // eventuell nicht gezähltes Gespräch.
    let used = 0
    try {
      used = await getUsageCount(quotaKey)
    } catch (err) {
      context.error('TEI chat: Kontingent-Prüfung fehlgeschlagen, lasse Anfrage durch', err)
    }
    if (used >= limit) {
      return {
        status: 200,
        jsonBody: {
          status: 'limit_reached',
          sessionAnalysesUsed: used,
          sessionAnalysesLimit: limit,
          message:
            lang === 'en'
              ? `The limit of ${limit} conversations for this ${access.code ? 'access code' : 'IP address'} has been reached.`
              : `Das Limit von ${limit} Gesprächen für ${access.code ? 'diesen Zugangscode' : 'diese IP-Adresse'} ist erreicht.`,
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
    const result = await requestChatReply(messages, effectiveTopicTurnHint, lang, (msg) => context.log(msg))
    const cliffhanger =
      isFinalAllowedMessage || effectiveTopicTurnHint >= CLIFFHANGER_TOPIC_TURN_THRESHOLD || result.themenwechsel

    if (isFirstTurn && !exempt) {
      // Ebenfalls eigens abgefangen: eine bereits erfolgreich erzeugte,
      // reale (kostenpflichtige) Antwort darf nicht an den Absender
      // verlorengehen, nur weil das Verbuchen des Kontingents danach
      // fehlschlägt — das würde die Person doppelt bestrafen (Antwort weg
      // UND Kontingent evtl. trotzdem verbraucht).
      try {
        await recordUsage(quotaKey)
      } catch (err) {
        context.error('TEI chat: Kontingent-Verbuchung fehlgeschlagen (Zählung evtl. ungenau)', err)
      }
      try {
        await notify({
          kind: 'chat',
          sessionId,
          question: lastMessage.content,
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
