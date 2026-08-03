import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getUserByEmail, verifyPassword } from '../lib/liveUserStore.js'
import { createSession } from '../lib/liveSessionStore.js'
import { getClientIp } from '../lib/clientIp.js'
import { checkLiveRateLimit } from '../lib/liveRateLimit.js'

interface LoginBody {
  email?: string
  password?: string
  lang?: string
}

export async function liveLogin(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: LoginBody
  try {
    body = (await req.json()) as LoginBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const lang: 'de' | 'en' = body.lang === 'en' ? 'en' : 'de'
  const email = (body.email ?? '').trim()
  const password = body.password ?? ''

  const genericError =
    lang === 'en' ? 'Email or password incorrect.' : 'E-Mail oder Passwort falsch.'

  if (!email || !password) {
    return { status: 400, jsonBody: { status: 'error', message: genericError } }
  }

  const clientIp = getClientIp(req)
  const allowed = await checkLiveRateLimit('login', clientIp)
  if (!allowed) {
    return {
      status: 429,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? 'Too many login attempts. Please try again later.'
            : 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.',
      },
    }
  }

  try {
    const user = await getUserByEmail(email)
    if (user && !user.emailVerified) {
      return {
        status: 403,
        jsonBody: {
          status: 'error',
          message:
            lang === 'en'
              ? 'Please confirm your email address first (see the link in your registration email).'
              : 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse (Link in der Registrierungs-E-Mail).',
        },
      }
    }

    const verified = await verifyPassword(email, password)
    if (!verified) {
      return { status: 401, jsonBody: { status: 'error', message: genericError } }
    }

    const token = await createSession(verified.email)
    return { status: 200, jsonBody: { status: 'ok', token } }
  } catch (err) {
    context.error('TEI live login failed', err)
    return {
      status: 500,
      jsonBody: {
        status: 'error',
        message: lang === 'en' ? 'Login failed. Please try again.' : 'Login fehlgeschlagen. Bitte erneut versuchen.',
      },
    }
  }
}

app.http('liveLogin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'live/login',
  handler: liveLogin,
})
