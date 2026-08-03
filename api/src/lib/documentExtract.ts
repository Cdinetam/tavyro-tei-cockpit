import { createRequire } from 'node:module'
import mammoth from 'mammoth'

/**
 * Textextraktion für hochgeladene Dokumente (siehe extractDocument.ts) —
 * geteilt zwischen Demo- und Live-Chat, da die Extraktion selbst keine
 * Konto-/Limit-Logik enthält. Bewusst pdf-parse@1.x statt der neueren
 * 2.x-Reihe: 2.x zieht @napi-rs/canvas als harte, plattformspezifische
 * native Abhängigkeit (~50 MB Binärdateien) nach — genau die Art Build-
 * Risiko für Azure Functions/Linux, wegen der schon bcryptjs statt des
 * nativen bcrypt gewählt wurde (siehe liveUserStore.ts). 1.x ist reines
 * JavaScript auf Basis von pdfjs-dist.
 *
 * pdf-parse@1.x hat einen bekannten Stolperstein: sein Haupt-Entry-Point
 * (index.js) enthält oben ein "isDebugMode = !module.parent"-Konstrukt, das
 * unter ESM-Interop (kein klassisches CJS require) fälschlich true ergibt
 * und beim blossen Importieren versucht, eine hartcodierte Test-Fixture-PDF
 * zu lesen — Absturz schon beim Laden des Moduls (live in diesem Repo
 * reproduziert). Umgangen durch direkten Require des inneren
 * Implementierungs-Moduls (lib/pdf-parse.js), das diesen Seiteneffekt nicht
 * hat; dafür per createRequire statt normalem ESM-Import, da für diesen
 * Unterpfad keine Typdeklarationen existieren.
 *
 * Nur Text-Extraktion, keine Layout-/Tabellenerkennung — für den Zweck hier
 * (TEI liest den Inhalt eines beigefügten Dokuments mit) ausreichend.
 */

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buffer: Buffer) => Promise<{ text: string }>

export const MAX_FILE_BYTES = 8 * 1024 * 1024 // 8 MB
// Begrenzung des extrahierten Texts gegen exzessive Token-Kosten pro
// Nachricht — grosszügig genug für mehrseitige Berichte/Protokolle, aber
// klein genug, um innerhalb von MAX_MESSAGE_LENGTH (chat.ts/liveChat.ts) zu
// bleiben.
export const MAX_EXTRACTED_CHARS = 12000

export const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt'] as const

export interface ExtractResult {
  text: string
  truncated: boolean
}

function truncate(rawText: string): ExtractResult {
  const trimmed = rawText.trim()
  if (trimmed.length <= MAX_EXTRACTED_CHARS) {
    return { text: trimmed, truncated: false }
  }
  return { text: trimmed.slice(0, MAX_EXTRACTED_CHARS), truncated: true }
}

export function fileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() ?? ''
}

export function isSupportedExtension(ext: string): ext is (typeof ACCEPTED_EXTENSIONS)[number] {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)
}

/** Wirft bei nicht unterstütztem Dateityp oder leerem Ergebnis — der
 * Aufrufer (extractDocument.ts) fängt das für eine freundliche
 * Fehlermeldung ab. */
export async function extractTextFromFile(filename: string, buffer: Buffer): Promise<ExtractResult> {
  const ext = fileExtension(filename)

  if (ext === 'pdf') {
    const result = await pdfParse(buffer)
    return truncate(result.text)
  }

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return truncate(result.value)
  }

  if (ext === 'txt') {
    return truncate(buffer.toString('utf-8'))
  }

  throw new Error('UNSUPPORTED_FILE_TYPE')
}
