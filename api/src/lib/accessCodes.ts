/**
 * Individuelle Zugangscodes pro eingeladener Person, statt eines einzigen
 * geteilten Codes. Das ist Voraussetzung dafür, dass ein Nutzungslimit
 * ("3 Analysen pro Person pro Woche") überhaupt einer Person statt einer
 * beliebigen Browser-Sitzung zugeordnet werden kann.
 *
 * Konfiguriert über die Umgebungsvariable PILOT_ACCESS_CODES als JSON-Array,
 * z.B.:
 *   [{"name":"Peter Müller","code":"tavyro-mueller-482"},
 *    {"name":"Sandra Keller","code":"tavyro-keller-917"}]
 *
 * Ist die Variable nicht gesetzt oder leer, ist die Zugangskontrolle
 * deaktiviert (praktisch für lokale Entwicklung).
 */

interface AccessCodeEntry {
  name: string
  code: string
}

let cached: AccessCodeEntry[] | null = null

function loadCodes(): AccessCodeEntry[] {
  if (cached) return cached

  const raw = process.env.PILOT_ACCESS_CODES
  if (!raw || raw.trim().length === 0) {
    cached = []
    return cached
  }

  try {
    const parsed = JSON.parse(raw) as AccessCodeEntry[]
    cached = Array.isArray(parsed) ? parsed : []
  } catch {
    cached = []
  }
  return cached
}

export function isAccessControlEnabled(): boolean {
  return loadCodes().length > 0
}

/** Gibt den Namen der Person zurück, falls der Code gültig ist, sonst null. */
export function resolveAccessCode(code: string): string | null {
  if (!code) return null
  const entry = loadCodes().find((c) => c.code === code)
  return entry ? entry.name : null
}
