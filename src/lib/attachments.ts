import type { ChatContentPart, ChatMessage } from '../types'

/**
 * Anhänge im Chat (Demo UND Live, siehe TrustRoomChat.tsx/LiveChat.tsx) —
 * geteilte Konstanten/Helfer statt Duplikation, da hier keine Demo-/Live-
 * spezifische Logik drinsteckt (anders als z.B. die getrennten
 * Backend-Endpoints). Zwei grundverschiedene Anhang-Arten teilen sich
 * denselben 📎-Button:
 *
 * - Dokumente (PDF/Word/Text): serverseitige Textextraktion (siehe
 *   documentExtract.ts), der extrahierte Text wird als eingebetteter
 *   String-Marker in ChatMessage.content geschrieben (composeMessage-
 *   WithAttachment/parseMessageAttachment) — content bleibt dabei ein
 *   reiner String.
 * - Bilder (GPT-4o Vision, seit "upload lässt keine Bilder zu"-Feature):
 *   rein clientseitig als data:-URL gelesen (kein Server-Roundtrip nötig,
 *   anders als bei Dokumenten), composeMessageWithImage baut daraus ein
 *   ChatContentPart[]-Array (siehe types.ts/schema.ts) — content ist dann
 *   KEIN String mehr. parseMessageAttachment gibt für Array-Content daher
 *   bewusst null zurück (siehe typeof-Guard), die Bubble-Komponenten prüfen
 *   Bilder separat über chatMessageImageUrl aus types.ts.
 */

export const ACCEPTED_ATTACHMENT_EXTENSIONS = ['pdf', 'docx', 'txt']
export const ACCEPTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
export const ACCEPTED_ATTACHMENT_ACCEPT = '.pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.gif'
// Muss mit MAX_FILE_BYTES in api/src/lib/documentExtract.ts übereinstimmen —
// hier nur zur frühzeitigen Rückmeldung, die eigentliche Durchsetzung
// passiert serverseitig.
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024
// Bilder werden NICHT serverseitig geprüft (kein Roundtrip, siehe oben) —
// dieser Cap ist daher die einzige Durchsetzung. Kleiner als bei Dokumenten
// gewählt, da ein Bild zusätzlich als Base64 (~+33%) durch den Request und
// bei Live durch mind. einen Speicherzyklus läuft, bevor es dort wieder
// kollabiert wird (siehe liveConversationStore.ts → collapseImagesForStorage).
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

// Bewusst OHNE führende Newlines im Prefix selbst (nur als Trenner
// zwischen getippter Nachricht und Marker angehängt, siehe unten) — die
// send()-Hooks (useTrustRoomChat.ts/useLiveChat.ts) rufen .trim() auf der
// gesamten komponierten Nachricht auf, was einen führenden "\n\n" bei einer
// reinen Anhang-ohne-Text-Nachricht sonst stillschweigend verschluckt hätte
// und den Marker beim Parsen unauffindbar gemacht hätte.
const ATTACHMENT_MARKER_PREFIX = '[TEI-ATTACHMENT:'
const ATTACHMENT_MARKER_SUFFIX = ']\n'

export function composeMessageWithAttachment(userText: string, filename: string, documentText: string): string {
  const safeFilename = filename.replace(/[[\]]/g, '')
  const trimmedUser = userText.trim()
  const marker = `${ATTACHMENT_MARKER_PREFIX}${safeFilename}${ATTACHMENT_MARKER_SUFFIX}`
  return trimmedUser ? `${trimmedUser}\n\n${marker}${documentText}` : `${marker}${documentText}`
}

/**
 * Baut den ChatMessage.content-Wert für eine Nachricht mit Bild-Anhang —
 * anders als composeMessageWithAttachment oben liefert das hier KEINEN
 * String, sondern ein ChatContentPart[]-Array (siehe types.ts/schema.ts),
 * da Azure OpenAI (GPT-4o Vision) Bilder nur in dieser Form entgegennimmt.
 * dataUrl ist bereits eine vollständige `data:image/...;base64,...`-URL
 * (siehe fileToDataUrl in useDocumentAttachment.ts).
 */
export function composeMessageWithImage(userText: string, dataUrl: string): ChatContentPart[] {
  const parts: ChatContentPart[] = []
  const trimmed = userText.trim()
  if (trimmed) parts.push({ type: 'text', text: trimmed })
  parts.push({ type: 'image_url', image_url: { url: dataUrl } })
  return parts
}

export interface ParsedAttachment {
  userText: string
  filename: string
  documentText: string
}

/**
 * Liefert null für Bild-Nachrichten (content ist dann kein String, siehe
 * composeMessageWithImage oben) — die Bubble-Komponenten prüfen Bilder
 * separat über chatMessageImageUrl.
 */
export function parseMessageAttachment(content: ChatMessage['content']): ParsedAttachment | null {
  if (typeof content !== 'string') return null
  const idx = content.indexOf(ATTACHMENT_MARKER_PREFIX)
  if (idx === -1) return null

  // Der "\n\n"-Trenner vor dem Marker gehört nicht zur getippten Nachricht.
  const userText = content.slice(0, idx).replace(/\n\n$/, '')
  const afterPrefix = content.slice(idx + ATTACHMENT_MARKER_PREFIX.length)
  const endIdx = afterPrefix.indexOf(ATTACHMENT_MARKER_SUFFIX)
  if (endIdx === -1) return null

  const filename = afterPrefix.slice(0, endIdx)
  const documentText = afterPrefix.slice(endIdx + ATTACHMENT_MARKER_SUFFIX.length)
  return { userText, filename, documentText }
}
