import { app, HttpRequest, HttpResponseInit } from '@azure/functions'
import { checkAccessCode } from '../lib/accessGate.js'
import { upsertOutreachCode, listOutreachCodes } from '../lib/outreachCodeStore.js'
import { sendAccessCodeEmail } from '../lib/emailSender.js'
import { getUsageCount, getWeeklyLimit } from '../lib/quotaStore.js'
import { notify } from '../lib/notify.js'

/**
 * Outreach / Kaltakquise:
 *   POST /api/outreach-seed  — Code anlegen (+ optional E-Mail)
 *   GET  /api/outreach-debug — Liste inkl. Nutzung
 *
 * Auth wie campaign-seed / auto-access-debug (gültiger Zugangscode).
 */

interface OutreachSeedBody {
  name?: string
  email?: string
  company?: string
  code?: string
  /** Standard true — Code per E-Mail an die Person schicken. */
  sendEmail?: boolean
  lang?: 'de' | 'en'
}

export async function outreachSeed(req: HttpRequest): Promise<HttpResponseInit> {
  const access = await checkAccessCode(req)
  if (access.denied) return access.denied

  let body: OutreachSeedBody = {}
  try {
    body = (await req.json()) as OutreachSeedBody
  } catch {
    return {
      status: 400,
      jsonBody: { status: 'error', message: 'JSON-Body erwartet.' },
    }
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim()
  if (!name || !email) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: 'name und email sind Pflicht.' },
    }
  }

  const { record, isNew } = await upsertOutreachCode({
    name,
    email,
    company: body.company,
    code: body.code,
  })

  const shouldSend = body.sendEmail !== false
  let emailSent = false
  let emailError: string | null = null
  if (shouldSend) {
    try {
      await sendAccessCodeEmail({
        to: record.email,
        code: record.code,
        lang: body.lang === 'en' ? 'en' : 'de',
      })
      emailSent = true
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err)
    }
  }

  if (isNew) {
    void notify({
      kind: 'access',
      personName: record.name,
      question: `Outreach-Code ${record.code} an ${record.email}${record.company ? ` (${record.company})` : ''}`,
    }).catch(() => {
      // absichtlich leer
    })
  }

  return {
    status: 200,
    jsonBody: {
      status: 'ok',
      isNew,
      code: record.code,
      name: record.name,
      email: record.email,
      company: record.company,
      emailSent,
      emailError,
      gateUrl: 'https://tei.tavyro.ch',
    },
  }
}

export async function outreachDebug(req: HttpRequest): Promise<HttpResponseInit> {
  const queryCode = req.query.get('code') ?? undefined
  const access = await checkAccessCode(req, queryCode ? { code: queryCode } : undefined)
  if (access.denied) return access.denied

  const codes = await listOutreachCodes()
  const limit = getWeeklyLimit()
  const rows = await Promise.all(
    codes.map(async (c) => ({
      ...c,
      totalConversations: await getUsageCount(c.code),
      limit,
    })),
  )

  return {
    status: 200,
    jsonBody: {
      count: rows.length,
      used: rows.filter((r) => r.firstUsedAt || r.totalConversations > 0).length,
      codes: rows,
    },
  }
}

app.http('outreachSeed', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'outreach-seed',
  handler: outreachSeed,
})

app.http('outreachDebug', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'outreach-debug',
  handler: outreachDebug,
})
