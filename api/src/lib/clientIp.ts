import type { HttpRequest } from '@azure/functions'

/**
 * Ermittelt die Besucher-IP hinter Azure Static Web Apps / Azure Functions.
 * Anfragen laufen über eine Proxy-Schicht, die die echte Client-IP im
 * Standard-Header "x-forwarded-for" mitgibt — ggf. als kommagetrennte
 * Liste, falls mehrere Proxies dazwischenliegen; die erste Adresse ist die
 * des ursprünglichen Besuchers. Fällt beides aus (z.B. lokale Entwicklung),
 * wird ein fester Platzhalter genutzt, der dann wie ein einzelner
 * gemeinsamer Zähler wirkt.
 */
export function getClientIp(req: HttpRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  const alt = req.headers.get('x-client-ip') ?? req.headers.get('x-real-ip')
  if (alt) return alt.trim()

  return 'unknown-ip'
}
