import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { accessCodeCookieHeader, checkAccessCode } from '../lib/accessGate.js'
import {
  lookupCampaignCode,
  recordCampaignScan,
  recordCampaignFirstUse,
  upsertCampaignCodes,
  listCampaignCodes,
  type CampaignCodeInput,
} from '../lib/campaignCodeStore.js'
import { normalizeAccessCode } from '../lib/accessCodes.js'

/**
 * Gate-API für die physische Karte-Kampagne (Track 3).
 *
 * GET  /api/campaign-access?code=…  — Lookup + Scan-Tracking (kein Unlock)
 * POST /api/campaign-access         — Freischaltung wie verify-access
 * POST /api/campaign-seed           — Import Name/Firma/Code (Zugangscode-Auth)
 * GET  /api/campaign-debug          — Tracking-Übersicht (Zugangscode-Auth)
 */

function readCodeFromRequest(req: HttpRequest, bodyCode?: string): string {
  return normalizeAccessCode(bodyCode || req.query.get('code') || '')
}

export async function campaignAccess(req: HttpRequest): Promise<HttpResponseInit> {
  if (req.method === 'GET') {
    const code = readCodeFromRequest(req)
    if (!code) {
      return {
        status: 400,
        jsonBody: { status: 'error', message: 'Code fehlt.' },
      }
    }

    const record = await recordCampaignScan(code)
    if (!record) {
      return {
        status: 401,
        jsonBody: { status: 'invalid', message: 'Zugangscode fehlt oder ist ungültig.' },
      }
    }

    return {
      status: 200,
      jsonBody: {
        status: 'ok',
        code: record.code,
        name: record.name,
        company: record.company,
      },
    }
  }

  // POST — Freischaltung
  let bodyCode = ''
  try {
    const body = (await req.json()) as { code?: string }
    bodyCode = body.code ?? ''
  } catch {
    // Body optional — Query reicht
  }

  const code = readCodeFromRequest(req, bodyCode)
  if (!code) {
    return {
      status: 401,
      jsonBody: { status: 'error', message: 'Zugangscode fehlt oder ist ungültig.' },
    }
  }

  const record = await lookupCampaignCode(code)
  if (!record) {
    return {
      status: 401,
      jsonBody: { status: 'error', message: 'Zugangscode fehlt oder ist ungültig.' },
    }
  }

  await recordCampaignScan(code)
  await recordCampaignFirstUse(code)

  // checkAccessCode bestätigt nochmals (inkl. Cookie-Pfad) und setzt den
  // Quota-Schlüssel konsistent mit chat.ts.
  const access = await checkAccessCode(req, { code })
  if (access.denied) return access.denied

  return {
    status: 200,
    jsonBody: { status: 'ok', name: record.name, company: record.company },
    headers: { 'Set-Cookie': accessCodeCookieHeader(access.code) },
  }
}

export async function campaignSeed(req: HttpRequest): Promise<HttpResponseInit> {
  const access = await checkAccessCode(req)
  if (access.denied) return access.denied

  let codes: CampaignCodeInput[] = []
  try {
    const body = (await req.json()) as { codes?: CampaignCodeInput[] }
    if (Array.isArray(body.codes)) codes = body.codes
  } catch {
    return {
      status: 400,
      jsonBody: { status: 'error', message: 'JSON-Body mit { codes: [...] } erwartet.' },
    }
  }

  if (codes.length === 0) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: 'codes-Array ist leer.' },
    }
  }

  const result = await upsertCampaignCodes(codes)
  return {
    status: 200,
    jsonBody: { status: 'ok', ...result, total: codes.length },
  }
}

export async function campaignDebug(req: HttpRequest): Promise<HttpResponseInit> {
  // Wie auto-access-debug: Header oder ?code= für Browser-Aufruf
  const queryCode = req.query.get('code') ?? undefined
  const access = await checkAccessCode(req, queryCode ? { code: queryCode } : undefined)
  if (access.denied) return access.denied

  const codes = await listCampaignCodes()
  return {
    status: 200,
    jsonBody: {
      count: codes.length,
      scanned: codes.filter((c) => c.scannedAt).length,
      used: codes.filter((c) => c.firstUsedAt).length,
      codes,
    },
  }
}

app.http('campaignAccess', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'campaign-access',
  handler: campaignAccess,
})

app.http('campaignSeed', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'campaign-seed',
  handler: campaignSeed,
})

app.http('campaignDebug', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'campaign-debug',
  handler: campaignDebug,
})
