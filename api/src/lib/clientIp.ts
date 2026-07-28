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
/**
 * Entfernt einen angehängten Portanteil von einer IP-Adresse, z.B.
 * "83.78.242.147:50290" -> "83.78.242.147". Live über /api/quota-debug
 * beobachtet: der x-forwarded-for-Header hinter Azure Static Web Apps
 * enthält offenbar IP:Port statt nur der IP — ohne diese Bereinigung würde
 * praktisch jede Anfrage desselben Besuchers als "neue" IP gezählt (der
 * Port wechselt pro Verbindung), das Wochenlimit hätte dadurch nie
 * zuverlässig greifen können. IPv6-Adressen (mit mehreren Doppelpunkten,
 * ggf. in eckigen Klammern samt Port) werden bewusst nicht angefasst, ausser
 * sie liegen explizit in der Klammer-Notation "[...]:port" vor.
 */
function stripPort(ip: string): string {
  const bracketed = ip.match(/^\[(.+)\]:\d+$/)
  if (bracketed) return bracketed[1]

  const colonCount = (ip.match(/:/g) ?? []).length
  if (colonCount === 1 && ip.includes('.')) {
    return ip.split(':')[0]
  }
  return ip
}

export function getClientIp(req: HttpRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return stripPort(first)
  }

  const alt = req.headers.get('x-client-ip') ?? req.headers.get('x-real-ip')
  if (alt) return stripPort(alt.trim())

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
