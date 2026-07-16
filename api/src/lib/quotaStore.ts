import { TableClient } from '@azure/data-tables'

/**
 * Zählt Nutzung pro Zugangscode (= pro Person) über ein gleitendes
 * 7-Tage-Fenster hinweg — nicht pro Browser-Sitzung, denn ein neuer
 * Inkognito-Tab darf das Limit nicht zurücksetzen können.
 *
 * Produktion: Azure Table Storage. Die Function App braucht ohnehin ein
 * Storage-Konto (AzureWebJobsStorage), sobald sie auf Azure läuft — das
 * hier nutzt genau diese Verbindung mit, kein zusätzlicher Dienst nötig.
 *
 * Lokale Entwicklung: Wenn AzureWebJobsStorage auf "UseDevelopmentStorage=true"
 * steht (Standard in local.settings.json) und kein Azurite-Emulator läuft,
 * fällt dies automatisch auf eine In-Memory-Zählung zurück. Das reicht für
 * lokales Testen, überlebt aber keinen Neustart — für den echten
 * Pilotbetrieb auf Azure wird automatisch die persistente Variante genutzt.
 */

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000 // 7 Tage, gleitendes Fenster
const TABLE_NAME = 'TeiAccessQuota'

let tableClientPromise: Promise<TableClient | null> | null = null
const memoryStore = new Map<string, number[]>()

function getConnectionString(): string | null {
  const conn = process.env.AzureWebJobsStorage
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

export function getWeeklyLimit(): number {
  return Number(process.env.PILOT_WEEKLY_LIMIT ?? '5')
}

export async function getUsageCount(accessCode: string): Promise<number> {
  const client = await getTableClient()

  if (!client) {
    const timestamps = pruneToWindow(memoryStore.get(accessCode) ?? [])
    memoryStore.set(accessCode, timestamps)
    return timestamps.length
  }

  try {
    const entity = await client.getEntity<Record<string, unknown>>('quota', accessCode)
    const timestamps = pruneToWindow(JSON.parse(String(entity.timestampsJson ?? '[]')) as number[])
    return timestamps.length
  } catch {
    return 0 // noch kein Eintrag für diesen Code
  }
}

export async function recordUsage(accessCode: string): Promise<number> {
  const client = await getTableClient()
  const now = Date.now()

  if (!client) {
    const timestamps = pruneToWindow(memoryStore.get(accessCode) ?? [])
    timestamps.push(now)
    memoryStore.set(accessCode, timestamps)
    return timestamps.length
  }

  let timestamps: number[] = []
  try {
    const entity = await client.getEntity<Record<string, unknown>>('quota', accessCode)
    timestamps = pruneToWindow(JSON.parse(String(entity.timestampsJson ?? '[]')) as number[])
  } catch {
    timestamps = []
  }
  timestamps.push(now)

  await client.upsertEntity(
    { partitionKey: 'quota', rowKey: accessCode, timestampsJson: JSON.stringify(timestamps) },
    'Replace',
  )
  return timestamps.length
}
