import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { issuePasswordResetToken } from '../lib/liveUserStore.js'
import { sendLivePasswordResetEmail } from '../lib/emailSender.js'
import { getClientIp } from '../lib/clientIp.js'
import { checkLiveRateLimit } from '../lib/liveRateLimit.js'

interface RequestResetBody {
  email?: string
  lang?: string
}

/**
 * Fordert einen Passwort-Reset-Link an. Antwortet IMMER mit derselben
 * generischen Erfolgsmeldung, unabhängig davon, ob die E-Mail-Adresse
 * überhaupt registriert/verifiziert ist — verhindert, dass sich dieser
 * Endpoint zum Durchprobieren existierender Konten missbrauchen lässt
 * (User-Enumeration).
 */
export async function liveRequestPasswordReset(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  let body: RequestResetBody
  try {
    body = (await req.json()) as RequestResetBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const lang: 'de' | 'en' = body.lang === 'en' ? 'en' : 'de'
  const email = (body.email ?? '').trim()

  const genericOk = {
    status: 200,
    jsonBody: {
      status: 'ok',
      message:
        lang === 'en'
          ? 'If this email address has a registered account, a reset link has just been sent.'
          : 'Falls zu dieser E-Mail-Adresse ein Konto existiert, wurde soeben ein Reset-Link verschickt.',
    },
  }

  if (!email) return genericOk

  const clientIp = getClientIp(req)
  const allowed = await checkLiveRateLimit('password-reset', clientIp)
  if (!allowed) return genericOk // Fail-quiet statt 429, um nichts über die IP-Sperre zu verraten

  try {
    const resetToken = await issuePasswordResetToken(email)
    if (resetToken) {
      await sendLivePasswordResetEmail({ to: email, token: resetToken, lang })
    }
  } catch (err) {
    context.error('TEI live password reset request failed', err)
    // Bewusst weiterhin die generische Erfolgsmeldung — ein Fehlschlag beim
    // Versand darf nicht verraten, ob die Adresse existiert.
  }

  return genericOk
}

app.http('liveRequestPasswordReset', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'live/request-password-reset',
  handler: liveRequestPasswordReset,
})
