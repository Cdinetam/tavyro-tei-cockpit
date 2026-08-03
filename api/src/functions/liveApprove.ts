import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { issueActivationCode } from '../lib/liveUserStore.js'
import { sendLiveActivationCodeEmail } from '../lib/emailSender.js'

/**
 * Freigabe-Link für Tam (siehe liveUserStore.ts → issueActivationCode,
 * Kopfkommentar dort für den vollen Ablauf). Bewusst ein simpler, direkt
 * klickbarer GET-Endpoint statt eines POST über die SPA — der Link steht in
 * der Registrierungs-Benachrichtigung (notify.ts) und soll mit einem
 * einzigen Klick funktionieren, ohne dass Tam durch eine eigene Oberfläche
 * navigieren muss. Liefert direkt eine kleine HTML-Bestätigungsseite statt
 * JSON, da der Aufruf typischerweise aus einem E-Mail-Client/Browser-Tab
 * heraus passiert.
 */

function page(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#1a1a1a;line-height:1.5;"><h2 style="margin-bottom:12px;">${title}</h2><p>${body}</p></body></html>`
}

export async function liveApprove(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const token = (req.query.get('token') ?? '').trim()

  if (!token) {
    return {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: page('Ungültiger Link', 'Es fehlt ein Freigabe-Token.'),
    }
  }

  const result = await issueActivationCode(token)

  if (result === null) {
    return {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: page('Ungültiger oder abgelaufener Link', 'Zu diesem Freigabe-Link konnte kein Konto gefunden werden.'),
    }
  }

  if (result === 'already_approved') {
    return {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: page('Bereits freigegeben', 'Dieses Konto ist bereits aktiv.'),
    }
  }

  try {
    await sendLiveActivationCodeEmail({ to: result.email, code: result.code, lang: result.lang })
  } catch (err) {
    context.error('TEI live approve: Zugangscode-E-Mail-Versand fehlgeschlagen', err)
    return {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: page(
        'Fehler beim E-Mail-Versand',
        'Das Konto wurde freigegeben, aber der Zugangscode konnte gerade nicht verschickt werden. Bitte diesen Link in Kürze erneut anklicken.',
      ),
    }
  }

  return {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: page(
      'Konto freigegeben',
      `${result.email} wurde freigegeben und hat soeben einen Zugangscode per E-Mail erhalten.`,
    ),
  }
}

app.http('liveApprove', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'live/approve',
  handler: liveApprove,
})
