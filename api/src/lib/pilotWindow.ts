/**
 * Gesamtdauer der Pilotphase — unabhängig vom Nutzungslimit pro Person
 * (siehe quotaStore.ts). Gesteuert über DEMO_EXPIRES_AT, z.B.
 * "2026-09-30T23:59:59Z". Ist die Variable nicht gesetzt, gilt die
 * Pilotphase als zeitlich unbegrenzt.
 */

export function isDemoExpired(): boolean {
  const expiresAt = process.env.DEMO_EXPIRES_AT
  if (!expiresAt) return false
  return Date.now() > new Date(expiresAt).getTime()
}

export function getDemoExpiresAt(): string | undefined {
  return process.env.DEMO_EXPIRES_AT
}
