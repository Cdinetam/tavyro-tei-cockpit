import { TableClient } from '@azure/data-tables'

/**
 * IP-Rate-Limit für /api/extract-document (PDF/Word/Text-Textextraktion für
 * Chat-Anhänge, siehe extractDocument.ts) — eigenständige Tabelle statt
 * Wiederverwendung von liveRateLimit.ts, da dieser Endpoint sowohl vom
 * Demo- als auch vom Live-Flow genutzt wird und keinem der beiden
 * Auth-Systeme allein zugeordnet ist. Gleiches Muster (gleitendes
 * 1-Stunden-Fenster, fail-open) wie liveRateLimit.ts/autoAccessRateLimit.ts.
 */

const TABLE_NAME = 'TeiExtractRateLimit'
const WINDOW_MS = 60 * 60 * 1000
const LIMIT = 20
const PARTITION = 'extract'

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

/** true = Anfrage darf durch. Fail-open bei Storage-Fehlern, siehe
 * liveRateLimit.ts für dieselbe Begründung. */
export async function checkExtractRateLimit(ip: string): Promise<boolean> {
  try {
    const client = await getTableClient()
    const now = Date.now()

    if (!client) {
      const timestamps = pruneToWindow(memoryStore.get(ip) ?? [])
      if (timestamps.length >= LIMIT) return false
      timestamps.push(now)
      memoryStore.set(ip, timestamps)
      return true
    }

    let timestamps: number[] = []
    try {
      const entity = await client.getEntity<Record<string, unknown>>(PARTITION, ip)
      timestamps = pruneToWindow(JSON.parse(String(entity.timestampsJson ?? '[]')) as number[])
    } catch {
      timestamps = []
    }

    if (timestamps.length >= LIMIT) return false

    timestamps.push(now)
    await client.upsertEntity(
      { partitionKey: PARTITION, rowKey: ip, timestampsJson: JSON.stringify(timestamps) },
      'Replace',
    )
    return true
  } catch {
    return true
  }
}
