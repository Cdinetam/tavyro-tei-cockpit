import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { TableClient } from '@azure/data-tables'
import { checkAccessCode } from '../lib/accessGate.js'
import { getClientIp, isUnlimitedIp } from '../lib/clientIp.js'
import { getUsageCount, getWeeklyLimit } from '../lib/quotaStore.js'

/**
 * Rein diagnostischer Endpoint (kein Nutzungslimit, keine Schreiboperation
 * ausser dem Anlegen der Tabelle falls sie fehlt) — Grund: der "fail open"-
 * Fix in chat.ts fängt Storage-Fehler bewusst ab und lässt Anfragen trotzdem
 * durch, was bedeutet, dass ein kaputter Storage-Zugriff von aussen nicht
 * mehr als Fehler sichtbar wird, sondern nur noch als "Limit greift nie".
 * Dieser Endpoint macht genau das nachprüfbar, ohne Azure-Portal-Log-Zugriff
 * zu benötigen. Durch checkAccessCode geschützt, damit er nicht offen
 * öffentlich ist. Kandidat zum Wieder-Entfernen, sobald das Quota-Problem
 * geklärt ist.
 */
export async function quotaDebug(req: HttpRequest): Promise<HttpResponseInit> {
  const access = await checkAccessCode(req)
  if (access.denied) return access.denied

  // Muss exakt dieselbe Schlüssel-Logik wie chat.ts/analyze.ts verwenden,
  // sonst zeigt dieser Endpoint einen anderen Stand als die echte Zählung —
  // genau das war zwischenzeitlich der Fall, nachdem der Schlüssel dort von
  // IP auf Zugangscode umgestellt wurde, ohne diesen Endpoint anzupassen.
  const clientIp = getClientIp(req)
  const quotaKey = access.code || clientIp
  const limit = getWeeklyLimit()
  const exempt = isUnlimitedIp(clientIp)
  const rawUnlimitedIps = process.env.PILOT_UNLIMITED_IPS ?? null
  const hasConnectionStringEnv = Boolean(
    process.env.QUOTA_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage,
  )

  let tableClientOk = false
  let storageError: string | null = null
  try {
    const conn = process.env.QUOTA_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage
    if (conn && conn !== 'UseDevelopmentStorage=true') {
      const client = TableClient.fromConnectionString(conn, 'TeiAccessQuota')
      await client.createTable().catch(() => {
        // Tabelle existiert bereits — kein Problem, zählt trotzdem als "ok".
      })
      tableClientOk = true
    }
  } catch (err) {
    storageError = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  }

  let currentUsage: number | null = null
  let usageError: string | null = null
  try {
    currentUsage = await getUsageCount(quotaKey)
  } catch (err) {
    usageError = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  }

  return {
    status: 200,
    jsonBody: {
      quotaKey,
      clientIp,
      accessCode: access.code || null,
      ownerName: access.ownerName,
      limit,
      exempt,
      rawUnlimitedIps,
      hasConnectionStringEnv,
      tableClientOk,
      storageError,
      currentUsage,
      usageError,
    },
  }
}

app.http('quotaDebug', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'quota-debug',
  handler: quotaDebug,
})
