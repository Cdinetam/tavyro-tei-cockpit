import { TableClient } from '@azure/data-tables'
import { normalizeAccessCode } from './accessCodes.js'

/**
 * Karte-Kampagne (Track 3): vorab erzeugte Einzelcodes für physische
 * CEO-Karten (QR → /live/zugang?code=…). Unabhängig von Demo-Auto-Codes
 * (issuedCodesStore) und Live-Konten (liveUserStore).
 *
 * Verhalten nach erfolgreicher Freischaltung: derselbe Demo-Chat-Flow
 * (/gespraech + chat.ts) inkl. 7er-Limit und Cliffhanger — Quota-Key ist
 * der Kampagnen-Code. Codes bleiben gültig, bis das Kontingent aufgebraucht
 * ist (erneutes Öffnen des Gates mit demselben Code ist erlaubt).
 *
 * Persistenz: QUOTA_STORAGE_CONNECTION_STRING, Tabelle TeiCampaignCodes.
 */

const TABLE_NAME = 'TeiCampaignCodes'
const CODE_PARTITION = 'by-code'

export interface CampaignCodeRecord {
  code: string
  name: string
  company: string
  scannedAt: string | null
  firstUsedAt: string | null
  createdAt: string
}

export interface CampaignCodeInput {
  code: string
  name: string
  company: string
}

let tableClientPromise: Promise<TableClient | null> | null = null
const memoryByCode = new Map<string, CampaignCodeRecord>()

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
      // Tabelle existiert bereits
    }
    return client
  })()

  return tableClientPromise
}

function entityToRecord(entity: Record<string, unknown>): CampaignCodeRecord {
  return {
    code: normalizeAccessCode(String(entity.rowKey ?? entity.code ?? '')),
    name: String(entity.name ?? ''),
    company: String(entity.company ?? ''),
    scannedAt: entity.scannedAt ? String(entity.scannedAt) : null,
    firstUsedAt: entity.firstUsedAt ? String(entity.firstUsedAt) : null,
    createdAt: String(entity.createdAt ?? ''),
  }
}

function displayName(record: CampaignCodeRecord): string {
  if (record.name && record.company) return `${record.name} (${record.company})`
  return record.name || record.company || record.code
}

async function getRecord(code: string): Promise<CampaignCodeRecord | null> {
  const normalizedCode = normalizeAccessCode(code)
  if (!normalizedCode) return null

  const client = await getTableClient()
  if (!client) {
    return memoryByCode.get(normalizedCode) ?? null
  }

  try {
    const entity = await client.getEntity<Record<string, unknown>>(CODE_PARTITION, normalizedCode)
    return entityToRecord(entity)
  } catch {
    return null
  }
}

/** Für accessGate.ts — Kampagnen-Codes als gültige Demo-Zugangscodes. */
export async function resolveCampaignCode(code: string): Promise<string | null> {
  const record = await lookupCampaignCode(code)
  return record ? displayName(record) : null
}

/** Erster QR-/Seitenaufruf mit diesem Code (idempotent). */
export async function recordCampaignScan(code: string): Promise<CampaignCodeRecord | null> {
  const record = await getRecord(code)
  if (!record) return null
  if (record.scannedAt) return record

  const scannedAt = new Date().toISOString()
  const updated: CampaignCodeRecord = { ...record, scannedAt }
  await persistRecord(updated)
  return updated
}

/** Erste erfolgreiche Freischaltung (idempotent). */
export async function recordCampaignFirstUse(code: string): Promise<CampaignCodeRecord | null> {
  const record = await getRecord(code)
  if (!record) return null
  if (record.firstUsedAt) return record

  const firstUsedAt = new Date().toISOString()
  const scannedAt = record.scannedAt ?? firstUsedAt
  const updated: CampaignCodeRecord = { ...record, scannedAt, firstUsedAt }
  await persistRecord(updated)
  return updated
}

async function persistRecord(record: CampaignCodeRecord): Promise<void> {
  const client = await getTableClient()
  if (!client) {
    memoryByCode.set(record.code, record)
    return
  }

  await client.upsertEntity(
    {
      partitionKey: CODE_PARTITION,
      rowKey: record.code,
      name: record.name,
      company: record.company,
      scannedAt: record.scannedAt ?? '',
      firstUsedAt: record.firstUsedAt ?? '',
      createdAt: record.createdAt,
    },
    'Replace',
  )
}

/** Import/Upsert aus der CEO-Liste (CSV/XLS → JSON). Bestehende Tracking-
 * Felder (scannedAt/firstUsedAt) bleiben erhalten, wenn der Code schon
 * existiert — nur Name/Firma werden aktualisiert. */
export async function upsertCampaignCodes(
  inputs: CampaignCodeInput[],
): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0
  let skipped = 0
  const now = new Date().toISOString()

  for (const input of inputs) {
    const code = normalizeAccessCode(input.code)
    if (!code) {
      skipped += 1
      continue
    }

    const existing = await getRecord(code)
    const record: CampaignCodeRecord = {
      code,
      name: input.name.trim(),
      company: input.company.trim(),
      scannedAt: existing?.scannedAt ?? null,
      firstUsedAt: existing?.firstUsedAt ?? null,
      createdAt: existing?.createdAt || now,
    }
    await persistRecord(record)
    upserted += 1
  }

  return { upserted, skipped }
}

export async function listCampaignCodes(): Promise<CampaignCodeRecord[]> {
  const client = await getTableClient()

  if (!client) {
    return Array.from(memoryByCode.values()).sort((a, b) => a.code.localeCompare(b.code))
  }

  const results: CampaignCodeRecord[] = []
  for await (const entity of client.listEntities({
    queryOptions: { filter: `PartitionKey eq '${CODE_PARTITION}'` },
  })) {
    results.push(entityToRecord(entity as Record<string, unknown>))
  }
  results.sort((a, b) => a.code.localeCompare(b.code))
  return results
}

/**
 * Eingebauter Testcode für die Karte-Kampagne — wird beim ersten Lookup
 * automatisch angelegt, damit man ohne manuellen campaign-seed-Aufruf
 * testen kann. Spätere echte CEO-Codes kommen weiterhin nur über
 * upsertCampaignCodes / campaign-seed.
 */
const BUILTIN_TEST_CODE = 'karte-test'

async function ensureBuiltinTestCode(): Promise<void> {
  const existing = await getRecord(BUILTIN_TEST_CODE)
  if (existing) return
  await upsertCampaignCodes([
    { code: BUILTIN_TEST_CODE, name: 'Test CEO', company: 'TaVyro Test' },
  ])
}

export async function lookupCampaignCode(code: string): Promise<CampaignCodeRecord | null> {
  const normalized = normalizeAccessCode(code)
  if (normalized === BUILTIN_TEST_CODE) {
    await ensureBuiltinTestCode()
  }
  return getRecord(code)
}
