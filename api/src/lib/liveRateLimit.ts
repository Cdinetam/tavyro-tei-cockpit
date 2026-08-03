import { TableClient } from '@azure/data-tables'

/**
 * IP-Rate-Limit für die Live-Registrierung/-Anmeldung — gleiches Muster wie
 * autoAccessRateLimit.ts, aber eigenständig (statt geteilt), um das
 * bestehende, bereits produktiv laufende Demo-System nicht anzufassen.
 * Registrierung ist offen/selbstbedienend (keine Einladung nötig), deshalb
 * hier besonders wichtig als Bremse gegen automatisierte Massen-Registrierung
 * (jedes Konto könnte sonst unbegrenzt kostenpflichtige Azure-OpenAI-Anfragen
 * auslösen). Login bekommt ein grosszügigeres Limit — echte Personen loggen
 * sich legitim öfter ein als sie sich registrieren, aber ein Limit bremst
 * trotzdem automatisiertes Passwort-Raten (Credential Stuffing).
 */

const TABLE_NAME = 'TeiLiveRateLimit'
const WINDOW_MS = 60 * 60 * 1000 // 1 Stunde, gleitendes Fenster

const LIMITS: Record<'register' | 'login' | 'password-reset', number> = {
  register: 5,
  login: 20,
  'password-reset': 5,
}

let tableClientPromise: Promise<TableClient | null> | null = null
const memoryStore = new Map<string, number[]>()

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

function pruneToWindow(timestamps: number[]): number[] {
  const cutoff = Date.now() - WINDOW_MS
  return timestamps.filter((t) => t > cutoff)
}

/**
 * true = Anfrage darf durch. Fail-open bei Storage-Fehlern (siehe
 * autoAccessRateLimit.ts für dieselbe Begründung: ein Infrastruktur-Aussetzer
 * darf eine echte Person nicht blockieren) — die eigentliche Kostenbremse für
 * die Live-Version bleibt in erster Linie die Pflicht-E-Mail-Bestätigung.
 */
export async function checkLiveRateLimit(kind: keyof typeof LIMITS, ip: string): Promise<boolean> {
  const limit = LIMITS[kind]
  const key = `${kind}:${ip}`

  try {
    const client = await getTableClient()
    const now = Date.now()

    if (!client) {
      const timestamps = pruneToWindow(memoryStore.get(key) ?? [])
      if (timestamps.length >= limit) return false
      timestamps.push(now)
      memoryStore.set(key, timestamps)
      return true
    }

    let timestamps: number[] = []
    try {
      const entity = await client.getEntity<Record<string, unknown>>(kind, ip)
      timestamps = pruneToWindow(JSON.parse(String(entity.timestampsJson ?? '[]')) as number[])
    } catch {
      timestamps = []
    }

    if (timestamps.length >= limit) return false

    timestamps.push(now)
    await client.upsertEntity(
      { partitionKey: kind, rowKey: ip, timestampsJson: JSON.stringify(timestamps) },
      'Replace',
    )
    return true
  } catch {
    return true
  }
}
