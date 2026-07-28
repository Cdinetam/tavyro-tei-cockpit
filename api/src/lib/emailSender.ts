import { EmailClient } from '@azure/communication-email'

/**
 * Versand der Zugangscode-E-Mail über Azure Communication Services (ACS)
 * Email — bewusst diese Wahl statt eines externen Anbieters (Resend,
 * SendGrid), weil sie im bestehenden Azure-Konto bleibt und Azure sofort
 * eine funktionierende Absender-Domain bereitstellt (kein eigener DNS-
 * Eintrag nötig für den Pilotbetrieb).
 *
 * Voraussetzungen in Azure (einmalig, im Portal einzurichten):
 *  1. Ressource "E-Mail Communication Services" anlegen, dort eine kostenlose
 *     Azure-verwaltete Domain hinzufügen (liefert sofort eine Absenderadresse
 *     wie "DoNotReply@xxxxxxxx.azurecomm.net", keine DNS-Wartezeit).
 *  2. Ressource "Communication Services" anlegen (oder eine vorhandene
 *     nutzen), die Email-Domain aus Schritt 1 dort unter "E-Mail" verknüpfen.
 *  3. In der Communication-Services-Ressource unter "Schlüssel" die
 *     Verbindungszeichenfolge kopieren → als ACS_EMAIL_CONNECTION_STRING in
 *     den Umgebungsvariablen der Static Web App hinterlegen.
 *  4. Die Absenderadresse aus Schritt 1 als ACS_SENDER_ADDRESS hinterlegen.
 *
 * Ist eine der beiden Variablen nicht gesetzt, wirft sendAccessCodeEmail
 * einen Fehler — der Aufrufer (autoAccess.ts) fängt das ab und liefert eine
 * freundliche Fehlermeldung statt eines stillen Fehlschlags, damit ein
 * fehlendes Setup sofort aussagekräftig auffällt statt scheinbar zu
 * funktionieren, ohne dass je eine E-Mail ankommt.
 */

let cachedClient: EmailClient | null = null

function getClient(): EmailClient {
  if (cachedClient) return cachedClient

  const conn = process.env.ACS_EMAIL_CONNECTION_STRING
  if (!conn) {
    throw new Error(
      'ACS_EMAIL_CONNECTION_STRING ist nicht gesetzt — E-Mail-Versand für Zugangscodes ist nicht konfiguriert.',
    )
  }
  cachedClient = new EmailClient(conn)
  return cachedClient
}

function senderAddress(): string {
  const sender = process.env.ACS_SENDER_ADDRESS
  if (!sender) {
    throw new Error(
      'ACS_SENDER_ADDRESS ist nicht gesetzt — E-Mail-Versand für Zugangscodes ist nicht konfiguriert.',
    )
  }
  return sender
}

interface SendAccessCodeEmailArgs {
  to: string
  code: string
  lang: 'de' | 'en'
}

/**
 * Verschickt den automatisch vergebenen Zugangscode an die angegebene
 * E-Mail-Adresse. Wartet auf den Abschluss des Versands (poller), damit der
 * Aufrufer einen echten Erfolg/Misserfolg zurückmelden kann, statt die
 * Person im Ungewissen zu lassen, ob die E-Mail unterwegs ist.
 */
export async function sendAccessCodeEmail({ to, code, lang }: SendAccessCodeEmailArgs): Promise<void> {
  const client = getClient()

  const subject =
    lang === 'en' ? 'Your TEI® Trust Room access code' : 'Ihr TEI® Trust Room Zugangscode'

  const plainText =
    lang === 'en'
      ? `Your access code for the TEI® Trust Room: ${code}\n\nEnter this code on the access page to unlock the conversation. This code remains valid for your future visits.`
      : `Ihr Zugangscode für den TEI® Trust Room: ${code}\n\nGeben Sie diesen Code auf der Zugangsseite ein, um das Gespräch freizuschalten. Der Code bleibt für künftige Besuche gültig.`

  const html =
    lang === 'en'
      ? `<p>Your access code for the TEI® Trust Room:</p><p style="font-size:20px;font-weight:600;letter-spacing:0.05em;">${code}</p><p>Enter this code on the access page to unlock the conversation. This code remains valid for your future visits.</p>`
      : `<p>Ihr Zugangscode für den TEI® Trust Room:</p><p style="font-size:20px;font-weight:600;letter-spacing:0.05em;">${code}</p><p>Geben Sie diesen Code auf der Zugangsseite ein, um das Gespräch freizuschalten. Der Code bleibt für künftige Besuche gültig.</p>`

  const poller = await client.beginSend({
    senderAddress: senderAddress(),
    content: { subject, plainText, html },
    recipients: { to: [{ address: to }] },
  })

  const result = await poller.pollUntilDone()
  if (result.status !== 'Succeeded') {
    throw new Error(`ACS Email Versand fehlgeschlagen (Status: ${result.status}).`)
  }
}
