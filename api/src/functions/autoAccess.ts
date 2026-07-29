import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getOrIssueCodeForEmail } from '../lib/issuedCodesStore.js'
import { getClientIp } from '../lib/clientIp.js'
import { notify } from '../lib/notify.js'
import { isAccessControlEnabled } from '../lib/accessCodes.js'
import { sendAccessCodeEmail } from '../lib/emailSender.js'
import { allowAutoAccessRequest } from '../lib/autoAccessRateLimit.js'

interface AutoAccessRequestBody {
  email?: string
  /** 'de' | 'en' — steuert nur den Text der Zugangscode-E-Mail selbst, siehe
   * emailSender.ts. Kommt vom Client anhand der Route, wie bei chat.ts. */
  lang?: string
}

// Bewusst simpel statt eines vollständigen RFC-5322-Regex — reicht, um
// offensichtlichen Unsinn abzufangen, ohne legitime Adressen abzulehnen.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Echtes Zugangscode-Gate per E-Mail — ersetzt die frühere Version, die pro
 * IP-Adresse sofort und ohne jeden Kontakt zur Person freischaltete (siehe
 * Git-Historie). Ablauf: Person gibt ihre E-Mail-Adresse ein (AccessGate.tsx
 * → "Code per E-Mail anfordern"), bekommt einen fortlaufend nummerierten
 * Code (z.B. "auto-014", siehe issuedCodesStore.ts) per E-Mail zugeschickt
 * und gibt ihn danach manuell im bestehenden Zugangscode-Feld ein — der
 * Code selbst wird NIE direkt in der HTTP-Antwort zurückgegeben, sonst wäre
 * das Gate wirkungslos.
 */
export async function autoAccess(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (!isAccessControlEnabled()) {
    // Ohne aktivierte Zugangskontrolle (PILOT_ACCESS_CODES leer) ist die App
    // ohnehin frei zugänglich — nichts zu automatisieren.
    return { status: 200, jsonBody: { status: 'ok' } }
  }

  let body: AutoAccessRequestBody
  try {
    body = (await req.json()) as AutoAccessRequestBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const lang: 'de' | 'en' = body.lang === 'en' ? 'en' : 'de'
  const email = (body.email ?? '').trim()

  if (!EMAIL_PATTERN.test(email)) {
    return {
      status: 400,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? 'Please enter a valid email address.'
            : 'Bitte eine gültige E-Mail-Adresse eingeben.',
      },
    }
  }

  const clientIp = getClientIp(req)

  // IP-Rate-Limit VOR jeder Storage-/E-Mail-Aktion prüfen — verhindert, dass
  // eine einzelne IP diesen Endpoint mit vielen verschiedenen Adressen
  // flutet (siehe autoAccessRateLimit.ts).
  const allowed = await allowAutoAccessRequest(clientIp)
  if (!allowed) {
    return {
      status: 429,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? 'Too many requests. Please try again later.'
            : 'Zu viele Anfragen. Bitte später erneut versuchen.',
      },
    }
  }

  const { code, name, isNew, canSend } = await getOrIssueCodeForEmail(email)

  if (canSend) {
    try {
      await sendAccessCodeEmail({ to: email, code, lang })
    } catch (err) {
      // Fehlerdetails bewusst nur ins Server-Log, nicht in die Antwort —
      // dieser Endpoint ist ohne Zugangscode erreichbar (er IST der Weg zum
      // ersten Code), Interna zur E-Mail-Konfiguration sollen daher nicht
      // für jeden Anfragenden sichtbar sein.
      context.error('TEI autoAccess: E-Mail-Versand fehlgeschlagen', err)
      return {
        status: 502,
        jsonBody: {
          status: 'error',
          message:
            lang === 'en'
              ? 'The code could not be sent right now. Please try again shortly.'
              : 'Der Code konnte gerade nicht verschickt werden. Bitte in Kürze erneut versuchen.',
        },
      }
    }
  }
  // canSend === false: kürzlich bereits verschickt (Cooldown, siehe
  // issuedCodesStore.ts) — kein erneuter Versand, aber die Person bekommt
  // trotzdem eine normale Erfolgsmeldung ("prüfen Sie Ihr Postfach"), da der
  // Code ja bereits unterwegs bzw. angekommen ist.

  if (isNew) {
    await notify({
      kind: 'access',
      sessionId: 'auto-access',
      question: `Code per E-Mail an ${email} verschickt (IP: ${clientIp})`,
      personName: name,
      email,
    })
  }

  return { status: 200, jsonBody: { status: 'ok' } }
}

app.http('autoAccess', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auto-access',
  handler: autoAccess,
})
