import { TableClient } from '@azure/data-tables'
import crypto from 'node:crypto'
import type { ChatMessage } from './schema.js'
import { normalizeEmailKey } from './liveUserStore.js'

/**
 * Serverseitige Speicherung der Live-Gespräche — anders als der Demo-Flow
 * (bewusst zustandslos, siehe chat.ts) sollen Live-Gespräche automatisch
 * nach JEDER Nachricht gesichert und geräteübergreifend abrufbar sein
 * (Produktentscheidung, siehe Diskussion). Partition = normalisierte
 * E-Mail-Adresse, RowKey = Gespräch-ID — ein einfacher, direkter Aufbau,
 * kein zusätzlicher Index nötig, da Live-Gespräche immer nur über die
 * eingeloggte Person (liveAuth.ts) gelistet/geladen werden.
 */

const TABLE_NAME = 'TeiLiveConversations'
const TITLE_MAX_LENGTH = 80

export interface LiveConversationSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface LiveConversation extends LiveConversationSummary {
  messages: ChatMessage[]
}

let tableClientPromise: Promise<TableClient | null> | null = null
// email -> (conversationId -> conversation)
const memoryStore = new Map<string, Map<string, LiveConversation>>()

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

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return ''
  const text = firstUser.content.trim()
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH)}…` : text
}

/**
 * Speichert den vollständigen, aktuellen Nachrichtenverlauf unter der
 * angegebenen Gespräch-ID (neu, falls conversationId leer ist — die neu
 * erzeugte ID wird zurückgegeben). Wird nach JEDER Chat-Antwort aufgerufen
 * (siehe liveChat.ts), überschreibt also bewusst den kompletten bisherigen
 * Stand statt nur die neueste Nachricht anzuhängen — einfacher und
 * konsistent mit dem "Client schickt immer den vollen Verlauf"-Muster, das
 * der Demo-Flow schon nutzt.
 */
export async function saveConversation(
  email: string,
  conversationId: string | null,
  messages: ChatMessage[],
): Promise<string> {
  const key = normalizeEmailKey(email)
  const id = conversationId || crypto.randomUUID()
  const now = Date.now()
  const title = deriveTitle(messages)

  const client = await getTableClient()

  if (!client) {
    const userMap = memoryStore.get(key) ?? new Map<string, LiveConversation>()
    const existing = userMap.get(id)
    userMap.set(id, {
      id,
      title,
      messages,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    memoryStore.set(key, userMap)
    return id
  }

  let createdAt = now
  try {
    const existing = await client.getEntity<Record<string, unknown>>(key, id)
    createdAt = Number(existing.createdAt ?? now)
  } catch {
    createdAt = now
  }

  await client.upsertEntity(
    {
      partitionKey: key,
      rowKey: id,
      title,
      messagesJson: JSON.stringify(messages),
      createdAt,
      updatedAt: now,
    },
    'Replace',
  )

  return id
}

export async function listConversations(email: string): Promise<LiveConversationSummary[]> {
  const key = normalizeEmailKey(email)
  const client = await getTableClient()

  if (!client) {
    const userMap = memoryStore.get(key)
    if (!userMap) return []
    return [...userMap.values()]
      .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  const summaries: LiveConversationSummary[] = []
  try {
    const entities = client.listEntities<Record<string, unknown>>({
      queryOptions: { filter: `PartitionKey eq '${key}'` },
    })
    for await (const entity of entities) {
      summaries.push({
        id: String(entity.rowKey),
        title: String(entity.title ?? ''),
        createdAt: Number(entity.createdAt ?? 0),
        updatedAt: Number(entity.updatedAt ?? 0),
      })
    }
  } catch {
    return []
  }
  return summaries.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getConversation(email: string, conversationId: string): Promise<LiveConversation | null> {
  const key = normalizeEmailKey(email)
  const client = await getTableClient()

  if (!client) {
    return memoryStore.get(key)?.get(conversationId) ?? null
  }

  try {
    const entity = await client.getEntity<Record<string, unknown>>(key, conversationId)
    return {
      id: conversationId,
      title: String(entity.title ?? ''),
      messages: JSON.parse(String(entity.messagesJson ?? '[]')) as ChatMessage[],
      createdAt: Number(entity.createdAt ?? 0),
      updatedAt: Number(entity.updatedAt ?? 0),
    }
  } catch {
    return null
  }
}

export async function deleteConversation(email: string, conversationId: string): Promise<void> {
  const key = normalizeEmailKey(email)
  const client = await getTableClient()

  if (!client) {
    memoryStore.get(key)?.delete(conversationId)
    return
  }

  try {
    await client.deleteEntity(key, conversationId)
  } catch {
    // Bereits gelöscht/nie vorhanden — kein Problem.
  }
}
