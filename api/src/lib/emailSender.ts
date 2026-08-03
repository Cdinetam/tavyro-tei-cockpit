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

/** Basis-URL des Frontends für Links in E-Mails (Verifikation, Passwort-
 * Reset) — env-konfigurierbar, damit lokale Entwicklung/ein Staging-Deploy
 * nicht versehentlich Links auf die Produktions-URL verschickt. Fällt ohne
 * Konfiguration auf die bekannte Produktions-Domain zurück. */
function appBaseUrl(): string {
  return (process.env.APP_BASE_URL ?? 'https://tei.tavyro.ch').replace(/\/$/, '')
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

interface SendLiveEmailArgs {
  to: string
  token: string
  lang: 'de' | 'en'
}

/**
 * Verifikations-E-Mail für die Live-Version-Selbstregistrierung (siehe
 * liveUserStore.ts/liveRegister.ts) — enthält bewusst einen Link auf die
 * SPA (nicht direkt auf einen API-Endpoint), damit die Person nach dem Klick
 * eine ordentliche Bestätigungsseite mit direktem Login-Einstieg sieht statt
 * einer nackten JSON-Antwort.
 */
export async function sendLiveVerificationEmail({ to, token, lang }: SendLiveEmailArgs): Promise<void> {
  const client = getClient()
  const link = `${appBaseUrl()}/live/verify?token=${encodeURIComponent(token)}`

  const subject = lang === 'en' ? 'Confirm your TEI® Trust Room account' : 'Bestätigen Sie Ihr TEI® Trust Room Konto'

  const plainText =
    lang === 'en'
      ? `Please confirm your email address to activate your TEI® Trust Room account:\n\n${link}\n\nThis link remains valid for 24 hours. If you didn't request this, you can ignore this email.`
      : `Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr TEI® Trust Room Konto zu aktivieren:\n\n${link}\n\nDieser Link ist 24 Stunden gültig. Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren.`

  const html =
    lang === 'en'
      ? `<p>Please confirm your email address to activate your TEI® Trust Room account:</p><p><a href="${link}">${link}</a></p><p>This link remains valid for 24 hours. If you didn't request this, you can ignore this email.</p>`
      : `<p>Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr TEI® Trust Room Konto zu aktivieren:</p><p><a href="${link}">${link}</a></p><p>Dieser Link ist 24 Stunden gültig. Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren.</p>`

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

/** Passwort-Reset-E-Mail für die Live-Version (siehe liveUserStore.ts/
 * liveRequestPasswordReset.ts) — Link führt auf die SPA-Seite zum Setzen
 * eines neuen Passworts, nicht direkt auf die API. */
export async function sendLivePasswordResetEmail({ to, token, lang }: SendLiveEmailArgs): Promise<void> {
  const client = getClient()
  const link = `${appBaseUrl()}/live/reset-password?token=${encodeURIComponent(token)}`

  const subject = lang === 'en' ? 'Reset your TEI® Trust Room password' : 'Passwort für Ihr TEI® Trust Room Konto zurücksetzen'

  const plainText =
    lang === 'en'
      ? `Click the link below to set a new password for your TEI® Trust Room account:\n\n${link}\n\nThis link remains valid for 1 hour. If you didn't request this, you can ignore this email — your password stays unchanged.`
      : `Klicken Sie auf den folgenden Link, um ein neues Passwort für Ihr TEI® Trust Room Konto zu setzen:\n\n${link}\n\nDieser Link ist 1 Stunde gültig. Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren — Ihr Passwort bleibt unverändert.`

  const html =
    lang === 'en'
      ? `<p>Click the link below to set a new password for your TEI® Trust Room account:</p><p><a href="${link}">${link}</a></p><p>This link remains valid for 1 hour. If you didn't request this, you can ignore this email — your password stays unchanged.</p>`
      : `<p>Klicken Sie auf den folgenden Link, um ein neues Passwort für Ihr TEI® Trust Room Konto zu setzen:</p><p><a href="${link}">${link}</a></p><p>Dieser Link ist 1 Stunde gültig. Falls Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren — Ihr Passwort bleibt unverändert.</p>`

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
