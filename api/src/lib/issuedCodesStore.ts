import { TableClient } from '@azure/data-tables'

/**
 * Automatische Zugangscode-Vergabe für Besucher ohne persönlichen Code von
 * Tam Nguyen (siehe PILOT_ACCESS_CODES/accessCodes.ts).
 *
 * Produktentscheidung (Version 2, siehe Git-Historie für die ursprüngliche
 * IP-basierte Variante): statt eines rein IP-basierten Sofort-Freischaltens
 * ist dies jetzt ein echtes Gate — eine Person gibt ihre E-Mail-Adresse ein
 * (siehe AccessGate.tsx), bekommt einen fortlaufend nummerierten Code
 * (z.B. "auto-014") per E-Mail zugeschickt (siehe emailSender.ts) und muss
 * ihn danach manuell im bestehenden Zugangscode-Feld eingeben. Grund für die
 * Umstellung: die reine IP-Variante schaltete sofort frei, ohne dass
 * irgendein Kontakt zur Person bestand — das war für eine "vertrauliche
 * Pilotphase auf ausgewählte Kontakte begrenzt" zu offen. Der Code bleibt
 * pro E-Mail-Adresse dauerhaft gültig — ein erneuter Aufruf mit derselben
 * Adresse verschickt denselben Code erneut, statt einen neuen zu erzeugen —
 * und zählt danach wie jeder andere Code ganz normal gegen
 * PILOT_WEEKLY_LIMIT (siehe chat.ts/analyze.ts, quotaStore.ts).
 *
 * Persistenz: dieselbe Azure-Table-Storage-Verbindung wie quotaStore.ts
 * (QUOTA_STORAGE_CONNECTION_STRING — bewusst NICHT AzureWebJobsStorage,
 * siehe dortiger Kommentar zur SWA-Restriktion), eigene Tabelle. Lokale
 * Entwicklung ohne Storage-Anbindung fällt auf In-Memory zurück, überlebt
 * dann keinen Neustart — für den Pilotbetrieb auf Azure wird automatisch die
 * persistente Variante genutzt, sobald die Variable gesetzt ist.
 *
 * Nebenläufigkeit: die Vergabe der nächsten Nummer liest den Zähler, erhöht
 * ihn lokal und schreibt zurück, ohne strikte Optimistic-Concurrency-Sperre.
 * Bei diesem Pilot-Traffic-Volumen ist eine seltene doppelte Nummer bei
 * exakt gleichzeitigen Erstanfragen zweier neuer Besucher tolerierbar (rein
 * kosmetisch — beide Codes bleiben trotzdem individuell gültig) — dasselbe
 * Pragmatismus-Niveau wie in quotaStore.ts.
 */

const TABLE_NAME = 'TeiIssuedCodes'
const EMAIL_PARTITION = 'by-email'
const CODE_PARTITION = 'by-code'
const COUNTER_PARTITION = 'counter'
const COUNTER_ROW = 'sequence'

let tableClientPromise: Promise<TableClient | null> | null = null
const memoryByEmail = new Map<string, { code: string; name: string }>()
const memoryByCode = new Map<string, string>() // code -> name
let memoryCounter = 0

function getConnectionString(): string | null {
  // Siehe Kommentar in quotaStore.ts: AzureWebJobsStorage ist für die von
  // Azure Static Web Apps verwalteten Functions reserviert und kann in
  // Produktion nicht gesetzt werden — QUOTA_STORAGE_CONNECTION_STRING ist
  // die eigene, freie Variable dafür. Lokal bleibt AzureWebJobsStorage als
  // Fallback nutzbar.
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

function formatCode(n: number): string {
  return `auto-${String(n).padStart(3, '0')}`
}

function formatName(n: number): string {
  return `Besucher ${String(n).padStart(3, '0')}`
}

/** Normalisiert eine E-Mail-Adresse als Tabellenschlüssel (Gross-/
 * Kleinschreibung soll nicht zu zwei verschiedenen Codes führen). Table
 * Storage RowKeys dürfen zudem u.a. kein "/" enthalten — bei E-Mail-Adressen
 * praktisch nie relevant, aber sicherheitshalber ersetzt. */
function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/\//g, '_')
}

/**
 * Liefert den bestehenden Auto-Code für diese E-Mail-Adresse zurück, oder
 * erzeugt einen neuen mit der nächsten fortlaufenden Nummer. isNew ist nur
 * beim allerersten Aufruf für diese Adresse true (relevant für die
 * Benachrichtigung an Tam, siehe autoAccess.ts).
 */
export async function getOrIssueCodeForEmail(
  email: string,
): Promise<{ code: string; name: string; isNew: boolean }> {
  const key = normalizeEmailKey(email)
  const client = await getTableClient()

  if (!client) {
    const existing = memoryByEmail.get(key)
    if (existing) return { ...existing, isNew: false }
    memoryCounter += 1
    const code = formatCode(memoryCounter)
    const name = formatName(memoryCounter)
    memoryByEmail.set(key, { code, name })
    memoryByCode.set(code, name)
    return { code, name, isNew: true }
  }

  try {
    const existing = await client.getEntity<Record<string, unknown>>(EMAIL_PARTITION, key)
    return { code: String(existing.code), name: String(existing.name), isNew: false }
  } catch {
    // noch kein Eintrag für diese Adresse — neuen Code vergeben, siehe unten
  }

  let nextN = 1
  try {
    const counterEntity = await client.getEntity<Record<string, unknown>>(COUNTER_PARTITION, COUNTER_ROW)
    nextN = Number(counterEntity.value ?? 0) + 1
  } catch {
    nextN = 1
  }
  await client.upsertEntity(
    { partitionKey: COUNTER_PARTITION, rowKey: COUNTER_ROW, value: nextN },
    'Replace',
  )

  const code = formatCode(nextN)
  const name = formatName(nextN)

  await client.upsertEntity({ partitionKey: EMAIL_PARTITION, rowKey: key, code, name }, 'Replace')
  await client.upsertEntity({ partitionKey: CODE_PARTITION, rowKey: code, name, email: key }, 'Replace')

  return { code, name, isNew: true }
}

/** Löst einen bereits automatisch vergebenen Code auf einen Namen auf — für
 * accessGate.ts, damit checkAccessCode() auch automatisch vergebene Codes
 * als gültig erkennt, nicht nur die statische PILOT_ACCESS_CODES-Liste. */
export async function resolveIssuedCode(code: string): Promise<string | null> {
  const client = await getTableClient()

  if (!client) {
    return memoryByCode.get(code) ?? null
  }

  try {
    const entity = await client.getEntity<Record<string, unknown>>(CODE_PARTITION, code)
    return String(entity.name)
  } catch {
    return null
  }
}
