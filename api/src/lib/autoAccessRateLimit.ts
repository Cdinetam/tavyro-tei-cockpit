import { TableClient } from '@azure/data-tables'

/**
 * Eigenständiges, kurzes Rate-Limit NUR für POST /api/auto-access — nicht zu
 * verwechseln mit PILOT_WEEKLY_LIMIT/quotaStore.ts, das die eigentlichen
 * Gespräche begrenzt. Verhindert, dass eine einzelne IP-Adresse den
 * E-Mail-Versand-Endpoint mit vielen verschiedenen Adressen flutet (Kosten +
 * Reputationsrisiko für die Absenderdomain). Bewusst grosszügig (5/Stunde) —
 * eine legitime Person braucht praktisch nie mehr als 1-2 Anfragen.
 *
 * Gleiches Persistenz-Muster wie quotaStore.ts/issuedCodesStore.ts: Azure
 * Table Storage über QUOTA_STORAGE_CONNECTION_STRING, In-Memory-Fallback
 * lokal ohne Storage-Anbindung.
 */

const TABLE_NAME = 'TeiAutoAccessRate'
const PARTITION = 'ip'
const WINDOW_MS = 60 * 60 * 1000 // 1 Stunde, gleitendes Fenster
const MAX_PER_WINDOW = 5

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
 * Prüft und verbucht in einem Schritt: liefert true, wenn die Anfrage erlaubt
 * ist (und zählt sie sofort mit) — false, wenn das Limit für diese IP in der
 * aktuellen Stunde bereits erreicht ist. Fällt bei Storage-Fehlern bewusst
 * "offen" fehl (siehe chat.ts/quotaStore.ts für dieselbe Begründung) — ein
 * seltener Infrastruktur-Hakler soll niemanden blockieren, das eigentliche
 * Risiko (Kosten pro E-Mail) bleibt durch den ACS-eigenen Spam-Schutz und die
 * geringe Pilot-Grössenordnung überschaubar.
 */
export async function allowAutoAccessRequest(ip: string): Promise<boolean> {
  const client = await getTableClient()

  if (!client) {
    const timestamps = pruneToWindow(memoryStore.get(ip) ?? [])
    if (timestamps.length >= MAX_PER_WINDOW) {
      memoryStore.set(ip, timestamps)
      return false
    }
    timestamps.push(Date.now())
    memoryStore.set(ip, timestamps)
    return true
  }

  try {
    let timestamps: number[] = []
    try {
      const entity = await client.getEntity<Record<string, unknown>>(PARTITION, ip)
      timestamps = pruneToWindow(JSON.parse(String(entity.timestampsJson ?? '[]')) as number[])
    } catch {
      timestamps = []
    }
    if (timestamps.length >= MAX_PER_WINDOW) {
      return false
    }
    timestamps.push(Date.now())
    await client.upsertEntity(
      { partitionKey: PARTITION, rowKey: ip, timestampsJson: JSON.stringify(timestamps) },
      'Replace',
    )
    return true
  } catch {
    return true // fail open, siehe Kommentar oben
  }
}
