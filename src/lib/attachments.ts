/**
 * Dokument-Anhänge im Chat (Demo UND Live, siehe TrustRoomChat.tsx/
 * LiveChat.tsx) — geteilte Konstanten/Helfer statt Duplikation, da hier
 * keine Demo-/Live-spezifische Logik drinsteckt (anders als z.B. die
 * getrennten Backend-Endpoints).
 *
 * Der extrahierte Dokumenttext wird NICHT als separates Datenfeld
 * mitgeschickt, sondern direkt in den normalen ChatMessage.content-String
 * eingebettet (composeMessageWithAttachment) — beide Chat-Flows behandeln
 * eine Nachricht sonst als reinen String (siehe types.ts/schema.ts), und
 * der Dokumenttext muss für Folge-Nachrichten im selben Gespräch als
 * Kontext erhalten bleiben (Demo schickt bei jeder Anfrage den ganzen
 * Verlauf erneut, Live speichert ihn serverseitig). parseMessageAttachment
 * macht diese Einbettung für die reine Anzeige (Bubble-Komponenten) wieder
 * rückgängig, damit der Chatverlauf nicht mit vollem Dokumenttext zugemüllt
 * wird.
 */

export const ACCEPTED_ATTACHMENT_EXTENSIONS = ['pdf', 'docx', 'txt']
export const ACCEPTED_ATTACHMENT_ACCEPT = '.pdf,.docx,.txt'
// Muss mit MAX_FILE_BYTES in api/src/lib/documentExtract.ts übereinstimmen —
// hier nur zur frühzeitigen Rückmeldung, die eigentliche Durchsetzung
// passiert serverseitig.
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024

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

export interface ParsedAttachment {
  userText: string
  filename: string
  documentText: string
}

export function parseMessageAttachment(content: string): ParsedAttachment | null {
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
