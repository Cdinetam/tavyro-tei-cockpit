import { TableClient } from '@azure/data-tables'
import { normalizeAccessCode } from './accessCodes.js'

/**
 * Outreach / Kaltakquise-Codes: von Tam vorab vergebene persönliche Codes
 * (z.B. trust-001). Einstieg über dieselbe AccessGate-Seite wie die
 * Homepage-Demo — bewusst getrennt von Auto-Codes (issuedCodesStore) und
 * Karte-Kampagne (campaignCodeStore).
 *
 * Verhalten: Demo-Chat (/gespraech), 7 Anfragen + Cliffhanger, Quota-Key =
 * Code. E-Mail ist Zuordnung/Tracking, kein Login-Abgleich.
 */

const TABLE_NAME = 'TeiOutreachCodes'
const CODE_PARTITION = 'by-code'
const EMAIL_PARTITION = 'by-email'
const COUNTER_PARTITION = 'counter'
const COUNTER_ROW = 'sequence'

export interface OutreachCodeRecord {
  code: string
  name: string
  email: string
  company: string
  firstUsedAt: string | null
  createdAt: string
}

export interface OutreachCodeInput {
  code?: string
  name: string
  email: string
  company?: string
  /** Bestehenden Code für diese E-Mail ersetzen (z.B. Prefix-Wechsel). */
  replace?: boolean
}

let tableClientPromise: Promise<TableClient | null> | null = null
const memoryByCode = new Map<string, OutreachCodeRecord>()
const memoryByEmail = new Map<string, string>() // email -> code
let memoryCounter = 0

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

function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/\//g, '_')
}

function formatOutreachCode(n: number): string {
  // Neutraler Prefix — bewusst nicht "akquise" (wirkt abschreckend beim Kunden).
  return `trust-${String(n).padStart(3, '0')}`
}

function displayName(record: OutreachCodeRecord): string {
  if (record.name && record.company) return `${record.name} (${record.company})`
  return record.name || record.email || record.code
}

function entityToRecord(entity: Record<string, unknown>): OutreachCodeRecord {
  return {
    code: normalizeAccessCode(String(entity.rowKey ?? entity.code ?? '')),
    name: String(entity.name ?? ''),
    email: String(entity.email ?? ''),
    company: String(entity.company ?? ''),
    firstUsedAt: entity.firstUsedAt ? String(entity.firstUsedAt) : null,
    createdAt: String(entity.createdAt ?? ''),
  }
}

async function getRecord(code: string): Promise<OutreachCodeRecord | null> {
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

async function persistRecord(record: OutreachCodeRecord): Promise<void> {
  const client = await getTableClient()
  const emailKey = normalizeEmailKey(record.email)

  if (!client) {
    memoryByCode.set(record.code, record)
    if (emailKey) memoryByEmail.set(emailKey, record.code)
    return
  }

  await client.upsertEntity(
    {
      partitionKey: CODE_PARTITION,
      rowKey: record.code,
      name: record.name,
      email: record.email,
      company: record.company,
      firstUsedAt: record.firstUsedAt ?? '',
      createdAt: record.createdAt,
    },
    'Replace',
  )

  if (emailKey) {
    await client.upsertEntity(
      {
        partitionKey: EMAIL_PARTITION,
        rowKey: emailKey,
        code: record.code,
        name: record.name,
      },
      'Replace',
    )
  }
}

async function nextSequence(): Promise<number> {
  const client = await getTableClient()
  if (!client) {
    memoryCounter += 1
    return memoryCounter
  }

  try {
    const entity = await client.getEntity<Record<string, unknown>>(COUNTER_PARTITION, COUNTER_ROW)
    const current = Number(entity.value ?? 0)
    const next = current + 1
    await client.upsertEntity(
      { partitionKey: COUNTER_PARTITION, rowKey: COUNTER_ROW, value: next },
      'Replace',
    )
    return next
  } catch {
    await client.upsertEntity(
      { partitionKey: COUNTER_PARTITION, rowKey: COUNTER_ROW, value: 1 },
      'Replace',
    )
    return 1
  }
}

/** Für accessGate.ts — Outreach-Codes als gültige Demo-Zugangscodes. */
export async function resolveOutreachCode(code: string): Promise<string | null> {
  const record = await getRecord(code)
  return record ? displayName(record) : null
}

export async function recordOutreachFirstUse(code: string): Promise<void> {
  const record = await getRecord(code)
  if (!record || record.firstUsedAt) return
  await persistRecord({ ...record, firstUsedAt: new Date().toISOString() })
}

async function deleteCodeIndex(code: string): Promise<void> {
  const normalized = normalizeAccessCode(code)
  if (!normalized) return
  const client = await getTableClient()
  if (!client) {
    memoryByCode.delete(normalized)
    return
  }
  try {
    await client.deleteEntity(CODE_PARTITION, normalized)
  } catch {
    // bereits weg
  }
}

/**
 * Legt einen Outreach-Code an. Existiert bereits ein Code für diese E-Mail,
 * wird derselbe zurückgegeben — ausser `replace: true` oder ein explizit
 * anderes `code` wird übergeben (dann wird der alte Code-Index entfernt).
 * Sonst nächste fortlaufende Nummer trust-NNN.
 */
export async function upsertOutreachCode(
  input: OutreachCodeInput,
): Promise<{ record: OutreachCodeRecord; isNew: boolean; previousCode: string | null }> {
  const email = input.email.trim().toLowerCase()
  const emailKey = normalizeEmailKey(email)
  const name = input.name.trim()
  const company = (input.company ?? '').trim()
  const now = new Date().toISOString()
  const explicitCode = normalizeAccessCode(input.code ?? '')
  const shouldReplace = Boolean(input.replace || explicitCode)

  let existing: OutreachCodeRecord | null = null
  const client = await getTableClient()
  if (emailKey) {
    if (!client) {
      const existingCode = memoryByEmail.get(emailKey)
      if (existingCode) existing = memoryByCode.get(existingCode) ?? null
    } else {
      try {
        const pointer = await client.getEntity<Record<string, unknown>>(EMAIL_PARTITION, emailKey)
        const existingCode = normalizeAccessCode(String(pointer.code ?? ''))
        existing = existingCode ? await getRecord(existingCode) : null
      } catch {
        existing = null
      }
    }
  }

  if (existing && !shouldReplace) {
    return { record: existing, isNew: false, previousCode: null }
  }

  let code = explicitCode
  if (!code) {
    if (existing && shouldReplace) {
      // Prefix-Wechsel: gleiche laufende Nummer behalten, wenn möglich
      const m = existing.code.match(/(\d+)$/)
      code = m ? formatOutreachCode(Number(m[1])) : formatOutreachCode(await nextSequence())
    } else {
      code = formatOutreachCode(await nextSequence())
    }
  }

  const previousCode = existing && existing.code !== code ? existing.code : null
  if (previousCode) {
    await deleteCodeIndex(previousCode)
    if (!client) {
      // memoryByEmail wird in persistRecord neu gesetzt
    }
  }

  const record: OutreachCodeRecord = {
    code,
    name: name || existing?.name || '',
    email: email || existing?.email || '',
    company: company || existing?.company || '',
    firstUsedAt: existing?.firstUsedAt ?? null,
    createdAt: existing?.createdAt || now,
  }
  await persistRecord(record)
  return { record, isNew: !existing, previousCode }
}

export async function listOutreachCodes(): Promise<OutreachCodeRecord[]> {
  const client = await getTableClient()
  if (!client) {
    return Array.from(memoryByCode.values()).sort((a, b) => a.code.localeCompare(b.code))
  }

  const results: OutreachCodeRecord[] = []
  for await (const entity of client.listEntities({
    queryOptions: { filter: `PartitionKey eq '${CODE_PARTITION}'` },
  })) {
    results.push(entityToRecord(entity as Record<string, unknown>))
  }
  results.sort((a, b) => a.code.localeCompare(b.code))
  return results
}
