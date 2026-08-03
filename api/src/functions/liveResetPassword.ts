import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { resetPasswordWithToken } from '../lib/liveUserStore.js'
import { invalidateAllSessionsForEmail } from '../lib/liveSessionStore.js'

const MIN_PASSWORD_LENGTH = 8

interface ResetBody {
  token?: string
  newPassword?: string
  lang?: string
}

export async function liveResetPassword(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: ResetBody
  try {
    body = (await req.json()) as ResetBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const lang: 'de' | 'en' = body.lang === 'en' ? 'en' : 'de'
  const token = (body.token ?? '').trim()
  const newPassword = body.newPassword ?? ''

  if (!token) {
    return { status: 400, jsonBody: { status: 'error', message: 'Token fehlt.' } }
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
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

  try {
    const email = await resetPasswordWithToken(token, newPassword)
    if (!email) {
      return {
        status: 400,
        jsonBody: {
          status: 'error',
          message:
            lang === 'en'
              ? 'This reset link is invalid or expired.'
              : 'Dieser Reset-Link ist ungültig oder abgelaufen.',
        },
      }
    }

    // Alle bestehenden Sitzungen dieser Person beenden — siehe
    // liveSessionStore.ts: Sitzungen laufen sonst nie automatisch ab, ein
    // vor dem Reset gestohlener Token darf danach nicht weiter gültig
    // bleiben.
    try {
      await invalidateAllSessionsForEmail(email)
    } catch (err) {
      context.error('TEI live reset password: Sitzungen konnten nicht invalidiert werden', err)
    }

    return { status: 200, jsonBody: { status: 'ok' } }
  } catch (err) {
    context.error('TEI live reset password failed', err)
    return {
      status: 500,
      jsonBody: {
        status: 'error',
        message: lang === 'en' ? 'Something went wrong. Please try again.' : 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
      },
    }
  }
}

app.http('liveResetPassword', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'live/reset-password',
  handler: liveResetPassword,
})
