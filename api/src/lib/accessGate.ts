import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { resolveAccessCode, isAccessControlEnabled } from './accessCodes.js'

export interface AccessCheckResult {
  denied: HttpResponseInit | null
  /** Name der Person laut PILOT_ACCESS_CODES, falls Zugangskontrolle aktiv ist. */
  ownerName: string | null
  /** Der geprüfte Code selbst, als Schlüssel für das Nutzungslimit. */
  code: string
}

/**
 * Leichte, aber echte Zugangskontrolle für eine kontrollierte Pilotphase
 * mit individuell eingeladenen Personen. Kein vollwertiges Login, sondern
 * ein persönlicher Code pro Person (siehe accessCodes.ts) — passt zur
 * "persönliche Ansprache statt Funnel"-Philosophie des Produkts.
 *
 * Ist PILOT_ACCESS_CODES nicht gesetzt, ist die Prüfung deaktiviert — so
 * bleibt lokale Entwicklung ohne Zusatzschritt möglich.
 */
export function checkAccessCode(req: HttpRequest): AccessCheckResult {
  const providedCode = req.headers.get('x-tei-access-code') ?? ''

  if (!isAccessControlEnabled()) {
    return { denied: null, ownerName: null, code: providedCode }
  }

  const ownerName = resolveAccessCode(providedCode)
  if (!ownerName) {
    return {
      denied: {
        status: 401,
        jsonBody: { status: 'error', message: 'Zugangscode fehlt oder ist ungültig.' },
      },
      ownerName: null,
      code: providedCode,
    }
  }

  return { denied: null, ownerName, code: providedCode }
}
