import { TableClient } from '@azure/data-tables'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

/**
 * Nutzerkonten für die Live-Version (echtes E-Mail+Passwort-Login, offene
 * Selbstregistrierung mit Pflicht-E-Mail-Bestätigung vor dem ersten Login —
 * bewusst komplett getrennt vom Demo-Zugangscode-System (accessGate.ts/
 * issuedCodesStore.ts): die Live-Version hat weder Wochenlimit noch
 * Nachrichten-Cap noch Cliffhanger, deshalb ein eigenständiges Auth-Modell
 * statt das bestehende zu überladen.
 *
 * Tabellenstruktur (eine Tabelle, vier Partitionen als Indizes — gleiches
 * Muster wie issuedCodesStore.ts):
 *  - 'by-email'         RowKey = normalisierte E-Mail  → volles Nutzerkonto
 *  - 'by-verify-token'  RowKey = Verifikations-Token    → { email } Pointer
 *  - 'by-reset-token'   RowKey = Passwort-Reset-Token   → { email } Pointer
 *  - 'by-approve-token' RowKey = Freigabe-Token (Tam)   → { email } Pointer
 * Die Token-Partitionen erlauben einen O(1)-Lookup beim Klick auf den
 * E-Mail-Link, ohne die E-Mail-Adresse selbst in der URL mitschicken zu
 * müssen. Abgelaufene/verbrauchte Pointer werden nicht aktiv gelöscht (bei
 * diesem Traffic-Volumen kosmetisch vernachlässigbar, siehe gleiches
 * Pragmatismus-Niveau in issuedCodesStore.ts) — ein Lookup über einen
 * solchen Pointer schlägt beim Ablaufzeit-Check ohnehin fehl.
 *
 * Passwort-Hashing: bcryptjs (reine JS-Implementierung, keine native
 * Kompilierung nötig — wichtig für Azure Functions/Linux-Build-Umgebungen).
 *
 * Zusätzliche manuelle Freigabe (Tam-Approval, siehe liveApprove.ts/
 * liveActivate.ts): offene Selbstregistrierung bleibt (E-Mail+Passwort
 * sofort wählbar), aber ein Konto kann sich trotz bestätigter E-Mail-Adresse
 * erst einloggen, wenn zusätzlich `approved` true ist. Ablauf: Tam klickt
 * den Freigabe-Link aus der Registrierungs-Benachrichtigung
 * (`approveToken`, /api/live/approve) → System generiert einen kurzen
 * Zugangscode (`activationCode`) und schickt ihn per E-Mail an die Person →
 * Person gibt E-Mail + Code auf /live/activate ein → `approved` wird true.
 * Bereits VOR dieser Änderung bestehende Konten (ohne das `approved`-Feld in
 * der Tabelle) gelten als automatisch freigegeben (siehe entityToRecord) —
 * betrifft insbesondere Tams eigenes Testkonto, das nicht rückwirkend
 * gesperrt werden soll.
 */

const TABLE_NAME = 'TeiLiveUsers'
const EMAIL_PARTITION = 'by-email'
const VERIFY_TOKEN_PARTITION = 'by-verify-token'
const RESET_TOKEN_PARTITION = 'by-reset-token'
const APPROVE_TOKEN_PARTITION = 'by-approve-token'

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 Stunden
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 Stunde
const ACTIVATION_CODE_TTL_MS = 24 * 60 * 60 * 1000 // 24 Stunden
// Mindestabstand zwischen zwei tatsächlichen Versänden derselben Verifikations-
// /Reset-E-Mail — gleiches Prinzip wie RESEND_COOLDOWN_MS in
// issuedCodesStore.ts, verhindert E-Mail-Flut durch wiederholtes Absenden.
const RESEND_COOLDOWN_MS = 10 * 60 * 1000
const BCRYPT_ROUNDS = 12

export interface LiveUserRecord {
  email: string
  passwordHash: string
  emailVerified: boolean
  verifyToken: string | null
  verifyTokenExpiresAt: number | null
  lastVerifyEmailSentAt: number
  resetToken: string | null
  resetTokenExpiresAt: number | null
  lastResetEmailSentAt: number
  /** Sprache bei der Registrierung (für die Zugangscode-E-Mail nach der
   * Freigabe, die zeitlich unabhängig vom ursprünglichen Request passiert). */
  lang: 'de' | 'en'
  /** Manuelle Freigabe durch Tam — siehe Kopfkommentar. */
  approved: boolean
  approveToken: string | null
  activationCode: string | null
  activationCodeExpiresAt: number | null
  createdAt: number
}

let tableClientPromise: Promise<TableClient | null> | null = null
const memoryByEmail = new Map<string, LiveUserRecord>()
const memoryByVerifyToken = new Map<string, string>() // token -> email
const memoryByResetToken = new Map<string, string>() // token -> email
const memoryByApproveToken = new Map<string, string>() // token -> email

function getConnectionString(): string | null {
  // Siehe quotaStore.ts: AzureWebJobsStorage ist für die von Azure Static Web
  // Apps verwalteten Functions reserviert und kann in Produktion nicht
  // gesetzt werden — QUOTA_STORAGE_CONNECTION_STRING ist die eigene, freie
  // Variable dafür (derselbe Storage-Account wie die übrigen TEI-Tabellen).
  const conn = process.env.QUOTA_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
  if (!conn || conn === 'UseDevelopmentStorage=true') return null
  return conn
}

async function getTableClient(): Promise<TableClient | null> {
  if (tableClientPromise) return tableClientPromise

  tableClientPromise = (async () => {
    const conn = getConnectionString()
    if (!conn) return null

    const client = TableClient.fromConnectionString(conn, TABLE_NAME)
    try {
      await client.createTable()
    } catch {
      // Tabelle existiert bereits — kein Problem
    }
    return client
  })()

  return tableClientPromise
}

/** Normalisiert eine E-Mail-Adresse als Tabellenschlüssel — siehe
 * normalizeEmailKey in issuedCodesStore.ts, gleiche Begründung. */
export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/\//g, '_')
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function entityToRecord(entity: Record<string, unknown>): LiveUserRecord {
  return {
    email: String(entity.email ?? entity.rowKey ?? ''),
    passwordHash: String(entity.passwordHash ?? ''),
    emailVerified: Boolean(entity.emailVerified),
    verifyToken: entity.verifyToken ? String(entity.verifyToken) : null,
    verifyTokenExpiresAt: entity.verifyTokenExpiresAt ? Number(entity.verifyTokenExpiresAt) : null,
    lastVerifyEmailSentAt: Number(entity.lastVerifyEmailSentAt ?? 0),
    resetToken: entity.resetToken ? String(entity.resetToken) : null,
    resetTokenExpiresAt: entity.resetTokenExpiresAt ? Number(entity.resetTokenExpiresAt) : null,
    lastResetEmailSentAt: Number(entity.lastResetEmailSentAt ?? 0),
    lang: entity.lang === 'en' ? 'en' : 'de',
    // Konten aus der Zeit VOR der Freigabe-Pflicht haben kein `approved`-Feld
    // in der Tabelle (Azure Table Storage ist schemalos) — entity.approved
    // ist dann `undefined`, nicht `false`. Solche Bestandskonten gelten als
    // automatisch freigegeben statt rückwirkend gesperrt zu werden.
    approved: entity.approved === undefined ? true : Boolean(entity.approved),
    approveToken: entity.approveToken ? String(entity.approveToken) : null,
    activationCode: entity.activationCode ? String(entity.activationCode) : null,
    activationCodeExpiresAt: entity.activationCodeExpiresAt ? Number(entity.activationCodeExpiresAt) : null,
    createdAt: Number(entity.createdAt ?? Date.now()),
  }
}

export async function getUserByEmail(email: string): Promise<LiveUserRecord | null> {
  const key = normalizeEmailKey(email)
  const client = await getTableClient()

  if (!client) {
    return memoryByEmail.get(key) ?? null
  }

  try {
    const entity = await client.getEntity<Record<string, unknown>>(EMAIL_PARTITION, key)
    return entityToRecord(entity)
  } catch {
    return null
  }
}

async function saveUser(record: LiveUserRecord): Promise<void> {
  const key = normalizeEmailKey(record.email)
  const client = await getTableClient()

  if (!client) {
    memoryByEmail.set(key, record)
    return
  }

  await client.upsertEntity(
    {
      partitionKey: EMAIL_PARTITION,
      rowKey: key,
      email: record.email,
      passwordHash: record.passwordHash,
      emailVerified: record.emailVerified,
      verifyToken: record.verifyToken ?? '',
      verifyTokenExpiresAt: record.verifyTokenExpiresAt ?? 0,
      lastVerifyEmailSentAt: record.lastVerifyEmailSentAt,
      resetToken: record.resetToken ?? '',
      resetTokenExpiresAt: record.resetTokenExpiresAt ?? 0,
      lastResetEmailSentAt: record.lastResetEmailSentAt,
      lang: record.lang,
      approved: record.approved,
      approveToken: record.approveToken ?? '',
      activationCode: record.activationCode ?? '',
      activationCodeExpiresAt: record.activationCodeExpiresAt ?? 0,
      createdAt: record.createdAt,
    },
    'Replace',
  )
}

function memoryMapFor(partition: string): Map<string, string> {
  if (partition === VERIFY_TOKEN_PARTITION) return memoryByVerifyToken
  if (partition === RESET_TOKEN_PARTITION) return memoryByResetToken
  return memoryByApproveToken
}

async function pointToken(partition: string, token: string, email: string): Promise<void> {
  const client = await getTableClient()
  if (!client) {
    memoryMapFor(partition).set(token, email)
    return
  }
  await client.upsertEntity({ partitionKey: partition, rowKey: token, email }, 'Replace')
}

async function resolveTokenPointer(partition: string, token: string): Promise<string | null> {
  const client = await getTableClient()
  if (!client) {
    return memoryMapFor(partition).get(token) ?? null
  }
  try {
    const entity = await client.getEntity<Record<string, unknown>>(partition, token)
    return String(entity.email ?? '') || null
  } catch {
    return null
  }
}

/**
 * Legt ein neues, unverifiziertes Konto an ODER aktualisiert ein bestehendes
 * unverifiziertes Konto (z.B. Tippfehler im Passwort bei einer erneuten
 * Registrierung, bevor die erste Verifikations-E-Mail überhaupt bestätigt
 * wurde). Ein bereits VERIFIZIERTES Konto mit derselben E-Mail wird NICHT
 * überschrieben — der Aufrufer (liveRegister.ts) muss das vorher separat
 * prüfen und stattdessen auf "bereits registriert, bitte einloggen"
 * hinweisen. canSendEmail ist false, wenn erst kürzlich (< RESEND_COOLDOWN_MS)
 * bereits eine Verifikations-E-Mail an diese Adresse verschickt wurde.
 */
export async function createOrRefreshUnverifiedUser(
  email: string,
  password: string,
  lang: 'de' | 'en',
): Promise<{ verifyToken: string; approveToken: string; canSendEmail: boolean; isNew: boolean }> {
  const existing = await getUserByEmail(email)
  const now = Date.now()

  if (existing && existing.emailVerified) {
    throw new Error('ALREADY_VERIFIED')
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const canSendEmail = !existing || now - existing.lastVerifyEmailSentAt >= RESEND_COOLDOWN_MS
  // Token wird nur bei tatsächlichem Versand neu erzeugt — sonst bliebe ein
  // bereits verschickter, noch gültiger Link sonst durch einen neuen,
  // niemals verschickten Token entwertet (Person klickt alten Link, der
  // dann fälschlich als ungültig gilt).
  const verifyToken = canSendEmail || !existing?.verifyToken ? generateToken() : existing.verifyToken
  // Freigabe-Token bleibt über die gesamte Kontolebensdauer stabil (einmal
  // erzeugt, nie erneuert) — der Link in Tams Benachrichtigungs-E-Mail zu
  // einer bestimmten Registrierung soll auch dann noch funktionieren, wenn
  // die Person zwischenzeitlich ihre Verifikations-E-Mail erneut anfordert.
  const approveToken = existing?.approveToken ?? generateToken()

  const record: LiveUserRecord = {
    email: normalizeEmailKey(email),
    passwordHash,
    emailVerified: false,
    verifyToken,
    verifyTokenExpiresAt: now + VERIFY_TOKEN_TTL_MS,
    lastVerifyEmailSentAt: canSendEmail ? now : (existing?.lastVerifyEmailSentAt ?? 0),
    resetToken: existing?.resetToken ?? null,
    resetTokenExpiresAt: existing?.resetTokenExpiresAt ?? null,
    lastResetEmailSentAt: existing?.lastResetEmailSentAt ?? 0,
    lang: existing?.lang ?? lang,
    approved: existing?.approved ?? false,
    approveToken,
    activationCode: existing?.activationCode ?? null,
    activationCodeExpiresAt: existing?.activationCodeExpiresAt ?? null,
    createdAt: existing?.createdAt ?? now,
  }

  await saveUser(record)
  if (canSendEmail) await pointToken(VERIFY_TOKEN_PARTITION, verifyToken, record.email)
  if (!existing?.approveToken) await pointToken(APPROVE_TOKEN_PARTITION, approveToken, record.email)

  return { verifyToken, approveToken, canSendEmail, isNew: !existing }
}

/** Bestätigt eine E-Mail-Adresse anhand des Verifikations-Tokens aus dem
 * E-Mail-Link. Gibt false zurück bei ungültigem/abgelaufenem Token, statt
 * einen Fehler zu werfen — der Aufrufer zeigt dafür eine freundliche
 * Fehlermeldung statt eines technischen Fehlers. */
export async function verifyEmailToken(token: string): Promise<boolean> {
  const email = await resolveTokenPointer(VERIFY_TOKEN_PARTITION, token)
  if (!email) return false

  const user = await getUserByEmail(email)
  if (!user || user.verifyToken !== token) return false
  if (!user.verifyTokenExpiresAt || user.verifyTokenExpiresAt < Date.now()) return false

  user.emailVerified = true
  user.verifyToken = null
  user.verifyTokenExpiresAt = null
  await saveUser(user)
  return true
}

export async function verifyPassword(email: string, password: string): Promise<LiveUserRecord | null> {
  const user = await getUserByEmail(email)
  if (!user) return null
  const matches = await bcrypt.compare(password, user.passwordHash)
  return matches ? user : null
}

/** Erzeugt (bzw. erneuert) einen Passwort-Reset-Token für ein bestehendes,
 * verifiziertes Konto. Gibt null zurück, wenn kein solches Konto existiert
 * ODER kürzlich (< RESEND_COOLDOWN_MS) bereits ein Reset angefordert wurde —
 * der Aufrufer (liveRequestPasswordReset.ts) antwortet in JEDEM Fall mit
 * derselben generischen Erfolgsmeldung, um nicht zu verraten, ob eine
 * E-Mail-Adresse überhaupt registriert ist. */
export async function issuePasswordResetToken(email: string): Promise<string | null> {
  const user = await getUserByEmail(email)
  if (!user || !user.emailVerified) return null

  const now = Date.now()
  if (now - user.lastResetEmailSentAt < RESEND_COOLDOWN_MS) return null

  const resetToken = generateToken()
  user.resetToken = resetToken
  user.resetTokenExpiresAt = now + RESET_TOKEN_TTL_MS
  user.lastResetEmailSentAt = now
  await saveUser(user)
  await pointToken(RESET_TOKEN_PARTITION, resetToken, user.email)
  return resetToken
}

/** Setzt ein neues Passwort anhand des Reset-Tokens. Gibt bei Erfolg die
 * (normalisierte) E-Mail-Adresse zurück — der Aufrufer nutzt das, um alle
 * bestehenden Sitzungen dieser Person zu beenden (siehe liveSessionStore.ts,
 * invalidateAllSessionsForEmail): ein gestohlener, nie ablaufender
 * Sitzungs-Token darf nach einem Passwort-Reset nicht weiter gültig
 * bleiben. */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<string | null> {
  const email = await resolveTokenPointer(RESET_TOKEN_PARTITION, token)
  if (!email) return null

  const user = await getUserByEmail(email)
  if (!user || user.resetToken !== token) return null
  if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < Date.now()) return null

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  user.resetToken = null
  user.resetTokenExpiresAt = null
  await saveUser(user)
  return user.email
}

/**
 * Löst Tams Freigabe-Link ein (siehe liveApprove.ts): erzeugt einen kurzen,
 * an die Person zu verschickenden Zugangscode. Gibt 'already_approved'
 * zurück statt erneut einen Code zu erzeugen, wenn das Konto bereits
 * freigegeben ist (z.B. Doppelklick auf den Link) — vermeidet verwirrende
 * zweite Codes, die den ersten stillschweigend entwerten würden.
 */
export async function issueActivationCode(
  approveToken: string,
): Promise<{ email: string; code: string; lang: 'de' | 'en' } | 'already_approved' | null> {
  const email = await resolveTokenPointer(APPROVE_TOKEN_PARTITION, approveToken)
  if (!email) return null

  const user = await getUserByEmail(email)
  if (!user) return null
  if (user.approved) return 'already_approved'

  const code = crypto.randomBytes(4).toString('hex').toUpperCase()
  user.activationCode = code
  user.activationCodeExpiresAt = Date.now() + ACTIVATION_CODE_TTL_MS
  await saveUser(user)

  return { email: user.email, code, lang: user.lang }
}

/** Schaltet ein Konto anhand von E-Mail + Zugangscode frei (Person gibt
 * beides auf /live/activate ein, siehe liveActivate.ts). Gibt false zurück
 * bei falschem/abgelaufenem Code statt zu werfen — der Aufrufer zeigt dafür
 * eine generische Fehlermeldung. */
export async function activateWithCode(email: string, code: string): Promise<boolean> {
  const user = await getUserByEmail(email)
  if (!user || !user.activationCode) return false
  if (user.activationCode !== code.trim().toUpperCase()) return false
  if (!user.activationCodeExpiresAt || user.activationCodeExpiresAt < Date.now()) return false

  user.approved = true
  user.activationCode = null
  user.activationCodeExpiresAt = null
  await saveUser(user)
  return true
}
