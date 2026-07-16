import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { requestAiAnalysis } from '../lib/openaiClient.js'
import { clampAiAnalysis } from '../lib/schema.js'
import { getUsageCount, recordUsage, getWeeklyLimit } from '../lib/quotaStore.js'
import { isDemoExpired, getDemoExpiresAt } from '../lib/pilotWindow.js'
import { notify } from '../lib/notify.js'
import { checkAccessCode } from '../lib/accessGate.js'

interface AnalyzeRequestBody {
  question?: string
  sessionId?: string
}

const MIN_QUESTION_LENGTH = 8
const MAX_QUESTION_LENGTH = 800

export async function analyze(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

  let body: AnalyzeRequestBody
  try {
    body = (await req.json()) as AnalyzeRequestBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const question = (body.question ?? '').trim()
  const sessionId = (body.sessionId ?? '').trim()

  if (!sessionId) {
    return { status: 400, jsonBody: { status: 'error', message: 'sessionId fehlt.' } }
  }
  if (question.length < MIN_QUESTION_LENGTH) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: 'Bitte etwas ausführlicher beschreiben.' },
    }
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: 'Eingabe ist zu lang für die Demo-Analyse.' },
    }
  }

  // Limit gilt pro Person (Zugangscode), nicht pro Browser-Sitzung — ein
  // neuer Tab oder privates Fenster darf das Limit nicht umgehen können.
  // Ist die Zugangskontrolle deaktiviert (kein PILOT_ACCESS_CODES gesetzt),
  // greift der Fallback-Schlüssel "no-access-control", d.h. dann gilt das
  // Limit global über alle Besucher hinweg — das ist in dem Fall gewollt,
  // da ohne individuelle Codes keine sinnvollere Zuordnung möglich ist.
  const quotaKey = access.code || 'no-access-control'
  const limit = getWeeklyLimit()
  const used = await getUsageCount(quotaKey)

  if (used >= limit) {
    return {
      status: 200,
      jsonBody: {
        status: 'limit_reached',
        sessionAnalysesUsed: used,
        sessionAnalysesLimit: limit,
        message: `Das Limit von ${limit} Analysen für diesen Zugang ist erreicht.`,
      },
    }
  }

  try {
    const raw = await requestAiAnalysis(question)
    const result = clampAiAnalysis(raw, question)
    const newUsed = await recordUsage(quotaKey)

    // Bewusst nicht awaited-blockierend für die Antwortzeit relevant, aber
    // hier trotzdem awaited, da Azure Functions Consumption Plan Prozesse
    // nach Rückgabe der Response beenden kann, bevor Fire-and-forget-Calls
    // abgeschlossen sind.
    await notify({ kind: 'analyse', sessionId, question, personName: access.ownerName ?? undefined })

    return {
      status: 200,
      jsonBody: {
        status: 'ok',
        result,
        sessionAnalysesUsed: newUsed,
        sessionAnalysesLimit: limit,
      },
    }
  } catch (err) {
    context.error('TEI AI analyze failed', err)
    return {
      status: 502,
      jsonBody: {
        status: 'error',
        message: 'Die Analyse konnte gerade nicht erstellt werden. Bitte in Kürze erneut versuchen.',
      },
    }
  }
}

app.http('analyze', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'analyze',
  handler: analyze,
})
