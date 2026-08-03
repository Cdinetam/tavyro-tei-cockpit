import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { activateWithCode } from '../lib/liveUserStore.js'
import { getClientIp } from '../lib/clientIp.js'
import { checkLiveRateLimit } from '../lib/liveRateLimit.js'

interface ActivateBody {
  email?: string
  code?: string
  lang?: string
}

/**
 * Letzter Schritt der manuellen Freigabe (siehe liveUserStore.ts →
 * activateWithCode): Person gibt E-Mail-Adresse und den per E-Mail
 * erhaltenen Zugangscode auf /live/activate ein, danach ist `approved` true
 * und der normale Login (liveLogin.ts) funktioniert.
 */
export async function liveActivate(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: ActivateBody
  try {
    body = (await req.json()) as ActivateBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const lang: 'de' | 'en' = body.lang === 'en' ? 'en' : 'de'
  const email = (body.email ?? '').trim()
  const code = (body.code ?? '').trim()

  const genericError =
    lang === 'en'
      ? 'Email or code incorrect, or the code has expired.'
      : 'E-Mail oder Code falsch, oder der Code ist abgelaufen.'

  if (!email || !code) {
    return { status: 400, jsonBody: { status: 'error', message: genericError } }
  }

  const clientIp = getClientIp(req)
  const allowed = await checkLiveRateLimit('activate', clientIp)
  if (!allowed) {
    return {
      status: 429,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? 'Too many attempts. Please try again later.'
            : 'Zu viele Versuche. Bitte später erneut versuchen.',
      },
    }
  }

  try {
    const ok = await activateWithCode(email, code)
    if (!ok) {
      return { status: 400, jsonBody: { status: 'error', message: genericError } }
    }
    return { status: 200, jsonBody: { status: 'ok' } }
  } catch (err) {
    context.error('TEI live activate failed', err)
    return {
      status: 500,
      jsonBody: {
        status: 'error',
        message: lang === 'en' ? 'Activation failed. Please try again.' : 'Aktivierung fehlgeschlagen. Bitte erneut versuchen.',
      },
    }
  }
}

app.http('liveActivate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'live/activate',
  handler: liveActivate,
})
