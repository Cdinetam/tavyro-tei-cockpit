import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { createOrRefreshUnverifiedUser } from '../lib/liveUserStore.js'
import { sendLiveVerificationEmail } from '../lib/emailSender.js'
import { getClientIp } from '../lib/clientIp.js'
import { checkLiveRateLimit } from '../lib/liveRateLimit.js'
import { notify } from '../lib/notify.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

interface RegisterBody {
  email?: string
  password?: string
  lang?: string
}

/**
 * Selbstregistrierung für die Live-Version — bewusst offen (jede E-Mail-
 * Adresse kann sich anmelden, keine Einladung durch Tam nötig, anders als
 * beim Demo-Zugangscode-System), deshalb mit zwei unabhängigen
 * Kostenschutz-Massnahmen: IP-Rate-Limit (liveRateLimit.ts) UND
 * Pflicht-E-Mail-Bestätigung vor dem ersten Login (das Konto existiert zwar
 * sofort, ist aber erst nach Klick auf den Verifikations-Link
 * einsatzfähig, siehe liveUserStore.ts/liveLogin.ts).
 */
export async function liveRegister(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: RegisterBody
  try {
    body = (await req.json()) as RegisterBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const lang: 'de' | 'en' = body.lang === 'en' ? 'en' : 'de'
  const email = (body.email ?? '').trim()
  const password = body.password ?? ''

  if (!EMAIL_PATTERN.test(email)) {
    return {
      status: 400,
      jsonBody: {
        status: 'error',
        message: lang === 'en' ? 'Please enter a valid email address.' : 'Bitte eine gültige E-Mail-Adresse eingeben.',
      },
    }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: 400,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
            : `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
      },
    }
  }

  const clientIp = getClientIp(req)
  const allowed = await checkLiveRateLimit('register', clientIp)
  if (!allowed) {
    return {
      status: 429,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? 'Too many registration attempts. Please try again later.'
            : 'Zu viele Registrierungsversuche. Bitte später erneut versuchen.',
      },
    }
  }

  try {
    const { verifyToken, canSendEmail, isNew } = await createOrRefreshUnverifiedUser(email, password)

    if (canSendEmail) {
      try {
        await sendLiveVerificationEmail({ to: email, token: verifyToken, lang })
      } catch (err) {
        context.error('TEI live register: Verifikations-E-Mail-Versand fehlgeschlagen', err)
        return {
          status: 502,
          jsonBody: {
            status: 'error',
            message:
              lang === 'en'
                ? 'The confirmation email could not be sent right now. Please try again shortly.'
                : 'Die Bestätigungs-E-Mail konnte gerade nicht verschickt werden. Bitte in Kürze erneut versuchen.',
          },
        }
      }
    }

    if (isNew) {
      try {
        await notify({ kind: 'live_register', sessionId: 'live-register', question: '', email })
      } catch (err) {
        context.error('TEI live register: Benachrichtigung fehlgeschlagen', err)
      }
    }

    return { status: 200, jsonBody: { status: 'ok' } }
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_VERIFIED') {
      return {
        status: 409,
        jsonBody: {
          status: 'error',
          message:
            lang === 'en'
              ? 'This email address is already registered. Please log in or reset your password.'
              : 'Diese E-Mail-Adresse ist bereits registriert. Bitte einloggen oder Passwort zurücksetzen.',
        },
      }
    }
    context.error('TEI live register failed', err)
    return {
      status: 500,
      jsonBody: {
        status: 'error',
        message: lang === 'en' ? 'Registration failed. Please try again.' : 'Registrierung fehlgeschlagen. Bitte erneut versuchen.',
      },
    }
  }
}

app.http('liveRegister', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'live/register',
  handler: liveRegister,
})
