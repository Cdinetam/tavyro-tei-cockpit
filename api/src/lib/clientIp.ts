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

/**
 * IP-Adressen, die vom Wochenlimit ausgenommen sind (z.B. für internes
 * Testen). Kommagetrennte Liste in der Umgebungsvariable
 * PILOT_UNLIMITED_IPS, z.B. "203.0.113.5,203.0.113.6". Ist die Variable
 * nicht gesetzt, ist niemand ausgenommen.
 */
export function isUnlimitedIp(ip: string): boolean {
  const raw = process.env.PILOT_UNLIMITED_IPS ?? ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(ip)
}
