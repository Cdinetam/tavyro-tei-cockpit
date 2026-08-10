import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { checkAccessCode } from '../lib/accessGate.js'
import { isAccessControlEnabled, listPilotAccessCodes, resolveAccessCode } from '../lib/accessCodes.js'
import { formatCode, getIssuedCodeCount, listIssuedCodes, resolveIssuedCode } from '../lib/issuedCodesStore.js'
import { getUsageCount, getWeeklyLimit } from '../lib/quotaStore.js'

interface CodeUsageRow {
  code: string
  name: string
  source: 'auto' | 'pilot'
  conversationsLast7Days: number
}

async function buildCodeUsageRows(
  entries: Array<{ code: string; name: string }>,
  source: 'auto' | 'pilot',
): Promise<CodeUsageRow[]> {
  return Promise.all(
    entries.map(async (entry) => ({
      code: entry.code,
      name: entry.name,
      source,
      conversationsLast7Days: await getUsageCount(entry.code),
    })),
  )
}

/**
 * Rein diagnostischer, lesender Endpoint (kein Nutzungslimit, keine
 * Schreiboperation): zeigt, wie viele automatisch vergebene Zugangscodes
 * (auto-001, auto-002, ...) insgesamt bisher ausgegeben wurden — also wie
 * viele Personen den "Code per E-Mail anfordern"-Weg (AccessGate.tsx)
 * genutzt haben, plus einen vollständigen Report über alle Auto- und
 * Pilot-Codes inkl. begonnener Gespräche im gleitenden 7-Tage-Fenster
 * (siehe quotaStore.ts / chat.ts recordUsage).
 *
 * Auth: akzeptiert den Zugangscode entweder wie gewohnt per Header
 * (x-tei-access-code, siehe checkAccessCode) ODER — nur für DIESEN
 * Endpoint zusätzlich — als ?code=... Query-Parameter, damit er sich ohne
 * Zusatz-Tool direkt per Browser-URL aufrufen lässt (ein Custom-Header
 * lässt sich bei normaler Navigation nicht setzen). Der geteilte
 * checkAccessCode() bleibt für den echten Chat-/Analyse-Traffic bewusst
 * unverändert Header-only, damit sich an dessen Sicherheitsverhalten
 * nichts ändert.
 */
export async function autoAccessDebug(req: HttpRequest): Promise<HttpResponseInit> {
  const headerAccess = await checkAccessCode(req)
  let ownerName = headerAccess.ownerName

  if (headerAccess.denied) {
    const queryCode = req.query.get('code') ?? ''
    if (!isAccessControlEnabled()) {
      ownerName = null
    } else {
      ownerName = resolveAccessCode(queryCode) ?? (queryCode ? await resolveIssuedCode(queryCode) : null)
    }

    if (isAccessControlEnabled() && !ownerName) {
      return {
        status: 401,
        jsonBody: {
          status: 'error',
          message: 'Zugangscode fehlt oder ist ungültig (Header x-tei-access-code oder ?code=... in der URL).',
        },
      }
    }
  }

  const [issuedCodeCount, autoCodes, pilotCodes] = await Promise.all([
    getIssuedCodeCount(),
    listIssuedCodes(),
    Promise.resolve(listPilotAccessCodes()),
  ])

  const [autoRows, pilotRows] = await Promise.all([
    buildCodeUsageRows(autoCodes, 'auto'),
    buildCodeUsageRows(pilotCodes, 'pilot'),
  ])

  const allRows = [...autoRows, ...pilotRows]
  const totalConversationsLast7Days = allRows.reduce((sum, row) => sum + row.conversationsLast7Days, 0)
  const codesWithUsageLast7Days = allRows.filter((row) => row.conversationsLast7Days > 0).length

  return {
    status: 200,
    jsonBody: {
      issuedCodeCount,
      latestCode: issuedCodeCount > 0 ? formatCode(issuedCodeCount) : null,
      ownerName,
      weeklyLimit: getWeeklyLimit(),
      report: {
        totalConversationsLast7Days,
        codesWithUsageLast7Days,
        autoAccessCodes: autoRows,
        pilotCodes: pilotRows,
      },
    },
  }
}

app.http('autoAccessDebug', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auto-access-debug',
  handler: autoAccessDebug,
})
