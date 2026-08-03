import { TableClient } from '@azure/data-tables'
import crypto from 'node:crypto'

/**
 * Sitzungs-Tokens für die Live-Version. Bewusst ein einfacher, opaker
 * Bearer-Token statt JWT: kein Signier-Schlüssel zu verwalten/rotieren, die
 * Gültigkeitsprüfung ist ein einziger Tabellen-Lookup (gleiches Muster wie
 * der bestehende Zugangscode-Header `x-tei-access-code`, hier als
 * `x-tei-live-token`). Sitzungen laufen bewusst NICHT automatisch ab
 * (Produktentscheidung: "unbegrenzt bis Logout") — sie werden aber aktiv
 * invalidiert, wenn die Person ihr Passwort zurücksetzt (siehe
 * invalidateAllSessionsForEmail, aufgerufen von liveResetPassword.ts), damit
 * ein z.B. auf einem verlorenen Gerät gespeicherter Token nach einem
 * Passwort-Reset nicht auf ewig gültig bleibt.
 */

const TABLE_NAME = 'TeiLiveSessions'
const PARTITION = 'session'

interface SessionEntity {
  email: string
  createdAt: number
}

let tableClientPromise: Promise<TableClient | null> | null = null
const memoryStore = new Map<string, SessionEntity>()

function getConnectionString(): string | null {
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

export async function createSession(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const client = await getTableClient()
  const entity: SessionEntity = { email, createdAt: Date.now() }

  if (!client) {
    memoryStore.set(token, entity)
    return token
  }

  await client.upsertEntity(
    { partitionKey: PARTITION, rowKey: token, email: entity.email, createdAt: entity.createdAt },
    'Replace',
  )
  return token
}

/** Löst einen Sitzungs-Token auf die zugehörige E-Mail-Adresse auf, oder
 * null bei einem unbekannten/ungültigen Token. */
export async function resolveSession(token: string): Promise<string | null> {
  if (!token) return null
  const client = await getTableClient()

  if (!client) {
    return memoryStore.get(token)?.email ?? null
  }

  try {
    const entity = await client.getEntity<Record<string, unknown>>(PARTITION, token)
    return String(entity.email ?? '') || null
  } catch {
    return null
  }
}

export async function deleteSession(token: string): Promise<void> {
  const client = await getTableClient()

  if (!client) {
    memoryStore.delete(token)
    return
  }

  try {
    await client.deleteEntity(PARTITION, token)
  } catch {
    // Bereits gelöscht/nie vorhanden — kein Problem, Logout soll trotzdem
    // als Erfolg gelten.
  }
}

/**
 * Beendet ALLE Sitzungen einer Person (z.B. nach Passwort-Reset). Sitzungen
 * sind über den Token (RowKey) indiziert, nicht über die E-Mail — bei
 * diesem erwarteten Traffic-Volumen (wenige aktive Live-Sitzungen pro
 * Person) ist ein serverseitig gefilterter Scan der 'session'-Partition
 * vertretbar, statt eine zusätzliche Sekundär-Indextabelle nur für diesen
 * seltenen Fall zu pflegen.
 */
export async function invalidateAllSessionsForEmail(email: string): Promise<void> {
  const client = await getTableClient()

  if (!client) {
    for (const [token, entity] of memoryStore.entries()) {
      if (entity.email === email) memoryStore.delete(token)
    }
    return
  }

  try {
    // OData-Filter: einfache Anführungszeichen in der E-Mail (z.B.
    // "o'brien@...") müssen laut OData-Konvention verdoppelt werden, sonst
    // bricht die Filter-Syntax bzw. liefert stillschweigend keine Treffer.
    const escapedEmail = email.replace(/'/g, "''")
    const entities = client.listEntities<Record<string, unknown>>({
      queryOptions: { filter: `PartitionKey eq '${PARTITION}' and email eq '${escapedEmail}'` },
    })
    for await (const entity of entities) {
      await client.deleteEntity(PARTITION, String(entity.rowKey))
    }
  } catch {
    // Fail-open: ein Storage-Aussetzer beim Aufräumen alter Sitzungen darf
    // den eigentlichen Passwort-Reset (bereits erfolgreich) nicht als
    // Fehler erscheinen lassen.
  }
}
