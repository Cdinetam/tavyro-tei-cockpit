import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { normalizeAccessCode, resolveAccessCode, isAccessControlEnabled } from './accessCodes.js'
import { resolveIssuedCode, verifyIssuedCodeForEmail } from './issuedCodesStore.js'
import { resolveCampaignCode, recordCampaignFirstUse } from './campaignCodeStore.js'

export interface AccessCheckResult {
  denied: HttpResponseInit | null
  /** Name der Person laut PILOT_ACCESS_CODES ODER automatisch vergebener
   * Besucher-Name (siehe issuedCodesStore.ts), falls Zugangskontrolle aktiv
   * ist. */
  ownerName: string | null
  /** Der geprüfte Code selbst, als Schlüssel für das Nutzungslimit. */
  code: string
}

const ACCESS_COOKIE_NAME = 'tei-access-code'

function readCookie(req: HttpRequest, name: string): string {
  const raw = req.headers.get('cookie') ?? ''
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('=') || '')
  }
  return ''
}

/** Set-Cookie für erfolgreiche verify-access-Antworten — damit Folge-Requests
 * (Chat etc.) auch ohne Custom-Header funktionieren (manche Mobile-WebViews
 * strippen x-tei-access-code). */
export function accessCodeCookieHeader(code: string): string {
  const normalized = normalizeAccessCode(code)
  // 7 Tage — Demo-Sitzung, Secure+SameSite=Lax+HttpOnly: First-Party auf
  // tei.tavyro.ch, vom Frontend nicht per JS lesbar (Zugangscode liegt
  // parallel in sessionStorage für den Header-Fallback).
  return `${ACCESS_COOKIE_NAME}=${encodeURIComponent(normalized)}; Path=/; Max-Age=${7 * 24 * 60 * 60}; Secure; HttpOnly; SameSite=Lax`
}

/**
 * Leichte, aber echte Zugangskontrolle für eine kontrollierte Pilotphase.
 * Kein vollwertiges Login, sondern entweder ein persönlicher Code pro
 * eingeladener Person (siehe accessCodes.ts, PILOT_ACCESS_CODES) ODER ein
 * automatisch vergebener Code (siehe issuedCodesStore.ts) für Besucher ohne
 * persönlichen Code.
 *
 * Code-Quellen (in dieser Reihenfolge): explizite options.code (Body/Query),
 * Header x-tei-access-code, Cookie tei-access-code. Cookie/Body sind nötig,
 * weil manche Browser/WebViews Custom-Header blockieren und dann fälschlich
 * "Netzwerkfehler" melden (live beobachtet).
 *
 * Auflösung: PILOT_ACCESS_CODES → Auto-Codes (issuedCodesStore) →
 * Karte-Kampagne (campaignCodeStore). Kampagnen-Codes landen danach im
 * normalen Demo-Chat inkl. Quota/Cliffhanger — ohne E-Mail-Gate.
 *
 * Ist PILOT_ACCESS_CODES nicht gesetzt, ist die gesamte Prüfung deaktiviert
 * — so bleibt lokale Entwicklung ohne Zusatzschritt möglich.
 */
export async function checkAccessCode(
  req: HttpRequest,
  options?: { email?: string; code?: string },
): Promise<AccessCheckResult> {
  const providedCode = normalizeAccessCode(
    options?.code ||
      req.headers.get('x-tei-access-code') ||
      readCookie(req, ACCESS_COOKIE_NAME) ||
      '',
  )
  const email = (options?.email ?? '').trim()

  if (!isAccessControlEnabled()) {
    return { denied: null, ownerName: null, code: providedCode }
  }

  if (!providedCode) {
    return {
      denied: {
        status: 401,
        jsonBody: { status: 'error', message: 'Zugangscode fehlt oder ist ungültig.' },
      },
      ownerName: null,
      code: providedCode,
    }
  }

  const staticOwnerName = resolveAccessCode(providedCode)
  if (staticOwnerName) {
    return { denied: null, ownerName: staticOwnerName, code: providedCode }
  }

  const issuedOwnerName = await resolveIssuedCode(providedCode)
  if (issuedOwnerName) {
    return { denied: null, ownerName: issuedOwnerName, code: providedCode }
  }

  const campaignOwnerName = await resolveCampaignCode(providedCode)
  if (campaignOwnerName) {
    void recordCampaignFirstUse(providedCode).catch(() => {
      // absichtlich leer
    })
    return { denied: null, ownerName: campaignOwnerName, code: providedCode }
  }

  if (email) {
    const emailOwnerName = await verifyIssuedCodeForEmail(email, providedCode)
    if (emailOwnerName) {
      return { denied: null, ownerName: emailOwnerName, code: providedCode }
    }
  }

  return {
    denied: {
      status: 401,
      jsonBody: { status: 'error', message: 'Zugangscode fehlt oder ist ungültig.' },
    },
    ownerName: null,
    code: providedCode,
  }
}
