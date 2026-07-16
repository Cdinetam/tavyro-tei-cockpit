/**
 * Persönliche Benachrichtigung statt automatisierter Lead-Sequenz.
 *
 * Absicht (siehe Gespräch zur Produktphilosophie): Nach einer ernsthaften
 * KI-Sparring-Session soll sich Tam persönlich melden können — nicht ein
 * System. Diese Funktion feuert daher pro abgeschlossener Analyse einen
 * einzigen Webhook-Call, kein Funnel, keine Sequenz.
 *
 * NOTIFY_WEBHOOK_URL kann auf einen Slack Incoming Webhook, Microsoft
 * Teams Connector, oder einen einfachen Zapier/Make-Webhook zeigen, der
 * z.B. eine E-Mail oder Slack-Nachricht an Tam auslöst. Ist die Variable
 * nicht gesetzt, wird die Benachrichtigung übersprungen (kein Fehler) —
 * so bleibt die Funktion in der lokalen Entwicklung ohne Zusatzdienst
 * lauffähig.
 */

interface NotifyPayload {
  kind: 'analyse' | 'lead'
  sessionId: string
  question: string
  /** Name laut PILOT_ACCESS_CODES, falls Zugangskontrolle aktiv ist. */
  personName?: string
  email?: string
  note?: string
}

export async function notify(payload: NotifyPayload): Promise<void> {
  const webhookUrl = process.env.NOTIFY_WEBHOOK_URL
  if (!webhookUrl) return

  const who = payload.personName ? payload.personName : 'unbekannte Person (kein Zugangscode-Name)'

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text:
          payload.kind === 'analyse'
            ? `TEI®-Sparring-Session · ${who} · Frage: "${payload.question}"`
            : `TEI®-Kontaktanfrage · ${who} · ${payload.email} · Frage: "${payload.question}"${
                payload.note ? ` · Notiz: ${payload.note}` : ''
              }`,
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // Benachrichtigung ist ein Nice-to-have, darf die eigentliche Antwort
    // an den CEO nicht blockieren oder zum Fehlschlagen bringen.
  }
}
