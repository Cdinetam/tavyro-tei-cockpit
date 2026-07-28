import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { resolveAccessCode, isAccessControlEnabled } from './accessCodes.js'
import { resolveIssuedCode } from './issuedCodesStore.js'

export interface AccessCheckResult {
  denied: HttpResponseInit | null
  /** Name der Person laut PILOT_ACCESS_CODES ODER automatisch vergebener
   * Besucher-Name (siehe issuedCodesStore.ts), falls Zugangskontrolle aktiv
   * ist. */
  ownerName: string | null
  /** Der geprüfte Code selbst, als Schlüssel für das Nutzungslimit. */
  code: string
}

/**
 * Leichte, aber echte Zugangskontrolle für eine kontrollierte Pilotphase.
 * Kein vollwertiges Login, sondern entweder ein persönlicher Code pro
 * eingeladener Person (siehe accessCodes.ts, PILOT_ACCESS_CODES) ODER ein
 * automatisch vergebener Code pro IP-Adresse (siehe issuedCodesStore.ts,
 * AccessGate.tsx → "Direkt freischalten") für Besucher ohne persönlichen
 * Code — ersetzt den früheren manuellen "E-Mail an hello@tavyro.ch"-Umweg.
 * Statische Codes haben Vorrang, falls ein Code zufällig in beiden Listen
 * vorkäme.
 *
 * Ist PILOT_ACCESS_CODES nicht gesetzt, ist die gesamte Prüfung deaktiviert
 * — so bleibt lokale Entwicklung ohne Zusatzschritt möglich.
 */
export async function checkAccessCode(req: HttpRequest): Promise<AccessCheckResult> {
  const providedCode = req.headers.get('x-tei-access-code') ?? ''

  if (!isAccessControlEnabled()) {
    return { denied: null, ownerName: null, code: providedCode }
  }

  const staticOwnerName = resolveAccessCode(providedCode)
  const ownerName = staticOwnerName ?? (providedCode ? await resolveIssuedCode(providedCode) : null)

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
