import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { getOrIssueCodeForIp } from '../lib/issuedCodesStore.js'
import { getClientIp } from '../lib/clientIp.js'
import { notify } from '../lib/notify.js'
import { isAccessControlEnabled } from '../lib/accessCodes.js'

/**
 * Automatische Zugangscode-Vergabe für Besucher ohne persönlichen Code —
 * ersetzt den früheren manuellen "E-Mail an hello@tavyro.ch"-Umweg auf der
 * Zugangscode-Gate-Seite (siehe AccessGate.tsx → "Direkt freischalten").
 * Vergibt pro IP-Adresse automatisch einen fortlaufend nummerierten Code
 * (z.B. "auto-014", siehe issuedCodesStore.ts), der danach wie jeder andere
 * Code funktioniert (inkl. PILOT_WEEKLY_LIMIT, Benachrichtigung bei echter
 * Nutzung). Kein Ratelimit auf diesen Endpoint selbst nötig — ein Besucher
 * bekommt pro IP immer denselben Code zurück statt fortlaufend neue.
 */
export async function autoAccess(req: HttpRequest): Promise<HttpResponseInit> {
  if (!isAccessControlEnabled()) {
    // Ohne aktivierte Zugangskontrolle (PILOT_ACCESS_CODES leer) ist die App
    // ohnehin frei zugänglich — nichts zu automatisieren.
    return { status: 200, jsonBody: { status: 'ok', code: '', name: '' } }
  }

  const ip = getClientIp(req)
  const { code, name, isNew } = await getOrIssueCodeForIp(ip)

  if (isNew) {
    await notify({
      kind: 'access',
      sessionId: 'auto-access',
      question: 'automatisch freigeschaltet (IP-basiert, kein persönlicher Code)',
      personName: name,
    })
  }

  return { status: 200, jsonBody: { status: 'ok', code, name } }
}

app.http('autoAccess', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auto-access',
  handler: autoAccess,
})
