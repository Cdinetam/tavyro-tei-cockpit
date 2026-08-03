import { useRef, useState } from 'react'
import type { Lang } from '../lib/i18n'
import {
  ACCEPTED_ATTACHMENT_EXTENSIONS,
  ACCEPTED_IMAGE_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  MAX_IMAGE_BYTES,
} from '../lib/attachments'

export type AttachmentStatus = 'idle' | 'uploading' | 'ready' | 'error'

/**
 * Zwei grundverschiedene Anhang-Arten hinter demselben 📎-Button — siehe
 * attachments.ts für die Begründung, warum Bilder rein clientseitig
 * (kind: 'image') statt per Server-Extraktion (kind: 'document') laufen.
 */
export type AttachedItem =
  | { kind: 'document'; filename: string; text: string; truncated: boolean }
  | { kind: 'image'; filename: string; dataUrl: string }

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
// composeMessageWithImage in attachments.ts) und genau diese Form kann ein
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
  const [attachment, setAttachment] = useState<AttachedItem | null>(null)
  const [status, setStatus] = useState<AttachmentStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    inputRef.current?.click()
  }

  function clear() {
    setAttachment(null)
    setStatus('idle')
    setErrorMessage('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const ext = file.name.toLowerCase().split('.').pop() ?? ''
    const isImage = ACCEPTED_IMAGE_EXTENSIONS.includes(ext)
    const isDocument = ACCEPTED_ATTACHMENT_EXTENSIONS.includes(ext)
    if (!isImage && !isDocument) {
      setAttachment(null)
      setStatus('error')
      setErrorMessage(
        lang === 'en'
          ? 'Unsupported file type. Allowed: PDF, Word (.docx), text (.txt), images (JPG, PNG, WebP, GIF).'
          : 'Dateityp nicht unterstützt. Erlaubt: PDF, Word (.docx), Text (.txt), Bilder (JPG, PNG, WebP, GIF).',
      )
      return
    }

    // Bilder: rein clientseitig, kein Server-Roundtrip nötig (siehe
    // attachments.ts) — läuft daher als eigener, kürzerer Zweig statt durch
    // extractFn.
    if (isImage) {
      if (file.size > MAX_IMAGE_BYTES) {
        setAttachment(null)
        setStatus('error')
        setErrorMessage(lang === 'en' ? 'Image is too large (max. 4 MB).' : 'Bild ist zu gross (max. 4 MB).')
        return
      }
      setStatus('uploading')
      setErrorMessage('')
      try {
        const dataUrl = await fileToDataUrl(file)
        setAttachment({ kind: 'image', filename: file.name, dataUrl })
        setStatus('ready')
      } catch {
        setAttachment(null)
        setStatus('error')
        setErrorMessage(lang === 'en' ? 'The image could not be read.' : 'Das Bild konnte nicht gelesen werden.')
      }
      return
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachment(null)
      setStatus('error')
      setErrorMessage(lang === 'en' ? 'File is too large (max. 8 MB).' : 'Datei ist zu gross (max. 8 MB).')
      return
    }

    setStatus('uploading')
    setErrorMessage('')
    try {
      const contentBase64 = await fileToBase64(file)
      const result = await extractFn(file.name, contentBase64, lang)
      if (result.status === 'ok') {
        setAttachment({ kind: 'document', filename: file.name, text: result.text, truncated: result.truncated })
        setStatus('ready')
      } else {
        setAttachment(null)
        setStatus('error')
        setErrorMessage(result.message)
      }
    } catch {
      setAttachment(null)
      setStatus('error')
      setErrorMessage(lang === 'en' ? 'The file could not be read.' : 'Die Datei konnte nicht gelesen werden.')
    }
  }

  return { attachment, status, errorMessage, inputRef, openPicker, clear, handleFileSelected }
}
