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
 *   WithAttachments/parseMessageAttachments) — mehrere Dokumente hängen
 *   dabei einfach mehrere Marker hintereinander an, content bleibt ein
 *   reiner String, solange kein Bild dabei ist.
 * - Bilder (GPT-4o Vision, seit "upload lässt keine Bilder zu"-Feature):
 *   rein clientseitig als data:-URL gelesen (kein Server-Roundtrip nötig,
 *   anders als bei Dokumenten), composeMessageWithAttachments baut daraus
 *   ein ChatContentPart[]-Array (siehe types.ts/schema.ts) — content ist
 *   dann KEIN String mehr. Die Bubble-Komponenten prüfen Bilder separat
 *   über chatMessageImageUrls aus types.ts.
 *
 * Eine Nachricht kann beliebig viele Dokumente UND/ODER Bilder gemischt
 * enthalten (bis MAX_ATTACHMENTS_COUNT), siehe useDocumentAttachment.ts.
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
// Obergrenze für Anhänge PRO NACHRICHT (Dokumente + Bilder zusammengezählt,
// beliebig gemischt) — verhindert, dass ein einzelner Request durch viele
// gleichzeitig gewählte Dateien unangemessen gross wird. Rein clientseitig
// durchgesetzt (useDocumentAttachment.ts), da es keine serverseitige
// Entsprechung dafür gibt.
export const MAX_ATTACHMENTS_COUNT = 5

/**
 * Ein einzelner, bereits verarbeiteter Anhang — entweder ein Dokument
 * (Text bereits serverseitig extrahiert) oder ein Bild (bereits als
 * data:-URL im Browser gelesen). Lebt hier statt in
 * useDocumentAttachment.ts, damit composeMessageWithAttachments unten den
 * Typ ohne Zirkel-Import verwenden kann.
 */
export type AttachedItem =
  | { kind: 'document'; filename: string; text: string; truncated: boolean }
  | { kind: 'image'; filename: string; dataUrl: string }

// Bewusst OHNE führende Newlines im Prefix selbst (nur als Trenner
// zwischen getippter Nachricht und Marker angehängt, siehe unten) — die
// send()-Hooks (useTrustRoomChat.ts/useLiveChat.ts) rufen .trim() auf der
// gesamten komponierten Nachricht auf, was einen führenden "\n\n" bei einer
// reinen Anhang-ohne-Text-Nachricht sonst stillschweigend verschluckt hätte
// und den Marker beim Parsen unauffindbar gemacht hätte.
const ATTACHMENT_MARKER_PREFIX = '[TEI-ATTACHMENT:'
const ATTACHMENT_MARKER_SUFFIX = ']\n'

/**
 * Baut den ChatMessage.content-Wert für eine Nachricht mit beliebig vielen
 * gemischten Anhängen (Dokumente UND/ODER Bilder, siehe AttachedItem oben).
 * Jedes Dokument wird als eigener [TEI-ATTACHMENT:...]-Marker an den
 * getippten Text angehängt (mehrere Marker hintereinander, siehe
 * parseMessageAttachments unten für die Gegenrichtung). Enthält die
 * Nachricht KEIN Bild, bleibt content weiterhin ein reiner String
 * (rückwärtskompatibel) — erst ein Bild zwingt zum ChatContentPart[]-Array,
 * da Azure OpenAI (GPT-4o Vision) Bilder nur so entgegennimmt.
 */
export function composeMessageWithAttachments(userText: string, attachments: AttachedItem[]): ChatMessage['content'] {
  const documents = attachments.filter((a): a is Extract<AttachedItem, { kind: 'document' }> => a.kind === 'document')
  const images = attachments.filter((a): a is Extract<AttachedItem, { kind: 'image' }> => a.kind === 'image')

  let text = userText.trim()
  for (const doc of documents) {
    const safeFilename = doc.filename.replace(/[[\]]/g, '')
    const marker = `${ATTACHMENT_MARKER_PREFIX}${safeFilename}${ATTACHMENT_MARKER_SUFFIX}${doc.text}`
    text = text ? `${text}\n\n${marker}` : marker
  }

  if (images.length === 0) return text

  const parts: ChatContentPart[] = []
  if (text) parts.push({ type: 'text', text })
  for (const img of images) parts.push({ type: 'image_url', image_url: { url: img.dataUrl } })
  return parts
}

export interface ParsedAttachments {
  userText: string
  documents: { filename: string; documentText: string }[]
}

/**
 * Liefert die getippte Nachricht plus ALLE eingebetteten Dokument-Anhänge
 * (0 bis n) — funktioniert sowohl bei reinem String-Content als auch beim
 * Text-Teil eines ChatContentPart[]-Arrays (Mischnachricht aus Bild(ern) +
 * Dokument(en)). Bilder selbst werden hier bewusst NICHT geliefert — dafür
 * prüfen die Bubble-Komponenten separat chatMessageImageUrls aus types.ts.
 * Liefert null, wenn gar kein Dokument-Marker gefunden wurde.
 */
export function parseMessageAttachments(content: ChatMessage['content']): ParsedAttachments | null {
  const text =
    typeof content === 'string'
      ? content
      : (content.find((p) => p.type === 'text') as { type: 'text'; text: string } | undefined)?.text ?? ''

  const idx = text.indexOf(ATTACHMENT_MARKER_PREFIX)
  if (idx === -1) return null

  // Der "\n\n"-Trenner vor dem ersten Marker gehört nicht zur getippten Nachricht.
  const userText = text.slice(0, idx).replace(/\n\n$/, '')
  const documents: { filename: string; documentText: string }[] = []
  let rest = text.slice(idx)

  while (rest.startsWith(ATTACHMENT_MARKER_PREFIX)) {
    const afterPrefix = rest.slice(ATTACHMENT_MARKER_PREFIX.length)
    const endIdx = afterPrefix.indexOf(ATTACHMENT_MARKER_SUFFIX)
    if (endIdx === -1) break
    const filename = afterPrefix.slice(0, endIdx)
    const afterSuffix = afterPrefix.slice(endIdx + ATTACHMENT_MARKER_SUFFIX.length)
    // Ein Dokumenttext endet dort, wo der nächste Marker beginnt (falls
    // vorhanden), sonst am Ende des Strings.
    const nextIdx = afterSuffix.indexOf(ATTACHMENT_MARKER_PREFIX)
    const documentText = (nextIdx === -1 ? afterSuffix : afterSuffix.slice(0, nextIdx)).replace(/\n\n$/, '')
    documents.push({ filename, documentText })
    rest = nextIdx === -1 ? '' : afterSuffix.slice(nextIdx)
  }

  return documents.length > 0 ? { userText, documents } : null
}
