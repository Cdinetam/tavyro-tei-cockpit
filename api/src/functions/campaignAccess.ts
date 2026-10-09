import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { accessCodeCookieHeader, checkAccessCode } from '../lib/accessGate.js'
import {
  lookupCampaignCode,
  recordCampaignScan,
  recordCampaignFirstUse,
  upsertCampaignCodes,
  listCampaignCodes,
  resetCampaignCodes,
  deleteCampaignCodes,
  type CampaignCodeInput,
} from '../lib/campaignCodeStore.js'
import { normalizeAccessCode, resolveAccessCode } from '../lib/accessCodes.js'

/**
 * Gate-API für die physische Karte-Kampagne (Track 3).
 *
 * GET  /api/campaign-access?code=…  — Lookup + Scan-Tracking (kein Unlock)
 * POST /api/campaign-access         — Freischaltung wie verify-access
 * POST /api/campaign-seed           — Import Name/Firma/Code (Zugangscode-Auth)
 * GET  /api/campaign-debug          — Tracking-Übersicht (Zugangscode-Auth)
 * POST /api/campaign-admin          — { action: 'reset'|'delete', codes } (Zugangscode-Auth)
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

    // lookupCampaignCode legt den eingebauten Testcode bei Bedarf an
    const existing = await lookupCampaignCode(code)
    if (!existing) {
      return {
        status: 401,
        jsonBody: { status: 'invalid', message: 'Zugangscode fehlt oder ist ungültig.' },
      }
    }

    const record = (await recordCampaignScan(code)) ?? existing
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

export async function campaignAdmin(req: HttpRequest): Promise<HttpResponseInit> {
  // Nur statische Pilot-Codes — Karten-/Demo-/Outreach-Codes dürfen keine Codes löschen.
  const headerCode = req.headers.get('x-tei-access-code') ?? ''
  if (!resolveAccessCode(headerCode)) {
    return { status: 401, jsonBody: { status: 'error', message: 'Nicht berechtigt.' } }
  }

  let action = ''
  let codes: string[] = []
  try {
    const body = (await req.json()) as { action?: string; codes?: unknown }
    action = body.action ?? ''
    if (Array.isArray(body.codes)) codes = body.codes.map((c) => String(c))
  } catch {
    return {
      status: 400,
      jsonBody: { status: 'error', message: "JSON-Body mit { action: 'reset'|'delete', codes: [...] } erwartet." },
    }
  }

  if (codes.length === 0) {
    return { status: 400, jsonBody: { status: 'error', message: 'codes-Array ist leer.' } }
  }

  if (action === 'reset') {
    return { status: 200, jsonBody: { status: 'ok', action, ...(await resetCampaignCodes(codes)) } }
  }
  if (action === 'delete') {
    return { status: 200, jsonBody: { status: 'ok', action, ...(await deleteCampaignCodes(codes)) } }
  }
  return { status: 400, jsonBody: { status: 'error', message: "action muss 'reset' oder 'delete' sein." } }
}

app.http('campaignAdmin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'campaign-admin',
  handler: campaignAdmin,
})

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
