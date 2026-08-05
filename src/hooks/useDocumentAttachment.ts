import { useRef, useState } from 'react'
import type { Lang } from '../lib/i18n'
import {
  ACCEPTED_ATTACHMENT_EXTENSIONS,
  ACCEPTED_IMAGE_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_COUNT,
  MAX_IMAGE_BYTES,
  type AttachedItem,
} from '../lib/attachments'

export type { AttachedItem }
export type AttachmentStatus = 'idle' | 'uploading' | 'ready' | 'error'

type ExtractResult = { status: 'ok'; text: string; truncated: boolean } | { status: 'error'; message: string }
type ExtractFn = (filename: string, contentBase64: string, lang: Lang) => Promise<ExtractResult>

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('READ_FAILED'))
        return
      }
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('READ_FAILED'))
    reader.readAsDataURL(file)
  })
}

// Anders als fileToBase64 oben wird hier die VOLLSTÄNDIGE data:-URL
// (inkl. "data:image/png;base64,"-Präfix) behalten statt abgeschnitten —
// genau diese Form erwartet Azure OpenAI in image_url.url (siehe
// composeMessageWithAttachments in attachments.ts) und genau diese Form kann ein
// <img src>  direkt darstellen, ohne den MIME-Typ separat mitführen zu
// müssen.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('READ_FAILED'))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('READ_FAILED'))
    reader.readAsDataURL(file)
  })
}

/**
 * Datei auswählen → Base64 → Textextraktion beim Backend (extractFn, siehe
 * aiClient.ts/liveClient.ts → extractDocument) — geteilt zwischen
 * TrustRoomChat.tsx (Demo) und LiveChat.tsx (Live), da die reine
 * UI-/Dateihandling-Logik identisch ist und sich nur die Auth-Header hinter
 * extractFn unterscheiden.
 */
export function useDocumentAttachment(extractFn: ExtractFn, lang: Lang) {
  const [attachments, setAttachments] = useState<AttachedItem[]>([])
  const [status, setStatus] = useState<AttachmentStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    inputRef.current?.click()
  }

  function clear() {
    setAttachments([])
    setStatus('idle')
    setErrorMessage('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeAt(index: number) {
    setAttachments((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) {
        setStatus('idle')
        setErrorMessage('')
      }
      return next
    })
  }

  /**
   * Verarbeitet EINE Datei (Bild → clientseitig, Dokument → Server-
   * Extraktion) und liefert entweder den fertigen Anhang oder eine
   * dateispezifische Fehlermeldung — wird unten in handleFilesSelected pro
   * ausgewählter Datei aufgerufen, damit ein Fehschlag bei einer Datei die
   * übrigen erfolgreichen Dateien im selben Auswahlvorgang nicht blockiert.
   */
  async function processFile(file: File): Promise<{ item: AttachedItem } | { error: string }> {
    const ext = file.name.toLowerCase().split('.').pop() ?? ''
    const isImage = ACCEPTED_IMAGE_EXTENSIONS.includes(ext)
    const isDocument = ACCEPTED_ATTACHMENT_EXTENSIONS.includes(ext)

    if (!isImage && !isDocument) {
      return {
        error:
          lang === 'en'
            ? `${file.name}: unsupported file type (allowed: PDF, Word, text, JPG/PNG/WebP/GIF).`
            : `${file.name}: Dateityp nicht unterstützt (erlaubt: PDF, Word, Text, JPG/PNG/WebP/GIF).`,
      }
    }

    // Bilder: rein clientseitig, kein Server-Roundtrip nötig (siehe
    // attachments.ts) — läuft daher als eigener, kürzerer Zweig statt durch
    // extractFn.
    if (isImage) {
      if (file.size > MAX_IMAGE_BYTES) {
        return {
          error: lang === 'en' ? `${file.name}: image is too large (max. 4 MB).` : `${file.name}: Bild ist zu gross (max. 4 MB).`,
        }
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        return { item: { kind: 'image', filename: file.name, dataUrl } }
      } catch {
        return {
          error: lang === 'en' ? `${file.name}: could not be read.` : `${file.name}: konnte nicht gelesen werden.`,
        }
      }
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return {
        error: lang === 'en' ? `${file.name}: file is too large (max. 8 MB).` : `${file.name}: Datei ist zu gross (max. 8 MB).`,
      }
    }
    try {
      const contentBase64 = await fileToBase64(file)
      const result = await extractFn(file.name, contentBase64, lang)
      if (result.status === 'ok') {
        return { item: { kind: 'document', filename: file.name, text: result.text, truncated: result.truncated } }
      }
      return { error: `${file.name}: ${result.message}` }
    } catch {
      return {
        error: lang === 'en' ? `${file.name}: could not be read.` : `${file.name}: konnte nicht gelesen werden.`,
      }
    }
  }

  /**
   * Nimmt eine ODER mehrere gleichzeitig ausgewählte Dateien entgegen
   * (File-Input mit multiple, siehe AttachButton in TrustRoomChat.tsx/
   * LiveChat.tsx) — verarbeitet sie nacheinander und sammelt erfolgreiche
   * Anhänge in einem Array statt wie zuvor nur einen einzelnen zu halten.
   * Deckelt die Gesamtzahl auf MAX_ATTACHMENTS_COUNT; überzählige Dateien
   * werden übersprungen und als Hinweis gemeldet statt die Auswahl
   * komplett abzulehnen.
   */
  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    const room = MAX_ATTACHMENTS_COUNT - attachments.length
    if (room <= 0) {
      setStatus('error')
      setErrorMessage(
        lang === 'en'
          ? `Maximum of ${MAX_ATTACHMENTS_COUNT} attachments per message reached.`
          : `Maximal ${MAX_ATTACHMENTS_COUNT} Anhänge pro Nachricht erreicht.`,
      )
      return
    }

    const toProcess = files.slice(0, room)
    const skippedCount = files.length - toProcess.length

    setStatus('uploading')
    setErrorMessage('')

    const newItems: AttachedItem[] = []
    const errors: string[] = []
    for (const file of toProcess) {
      const result = await processFile(file)
      if ('item' in result) {
        newItems.push(result.item)
      } else {
        errors.push(result.error)
      }
    }
    if (skippedCount > 0) {
      errors.push(
        lang === 'en'
          ? `${skippedCount} file(s) skipped (max. ${MAX_ATTACHMENTS_COUNT} attachments per message).`
          : `${skippedCount} Datei(en) übersprungen (max. ${MAX_ATTACHMENTS_COUNT} Anhänge pro Nachricht).`,
      )
    }

    if (newItems.length > 0) setAttachments((prev) => [...prev, ...newItems])
    setErrorMessage(errors.join(' '))
    // attachments (Closure) spiegelt noch den Stand VOR diesem Durchlauf —
    // reicht hier aber aus, da wir nur wissen müssen, ob am Ende irgendetwas
    // im Array steht (vorher vorhanden ODER gerade neu hinzugekommen).
    setStatus(newItems.length > 0 || attachments.length > 0 ? 'ready' : 'error')
  }

  return { attachments, status, errorMessage, inputRef, openPicker, clear, removeAt, handleFilesSelected }
}
