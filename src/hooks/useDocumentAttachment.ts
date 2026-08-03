import { useRef, useState } from 'react'
import type { Lang } from '../lib/i18n'
import { ACCEPTED_ATTACHMENT_EXTENSIONS, MAX_ATTACHMENT_BYTES } from '../lib/attachments'

export type AttachmentStatus = 'idle' | 'uploading' | 'ready' | 'error'

export interface AttachedDocument {
  filename: string
  text: string
  truncated: boolean
}

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

/**
 * Datei auswählen → Base64 → Textextraktion beim Backend (extractFn, siehe
 * aiClient.ts/liveClient.ts → extractDocument) — geteilt zwischen
 * TrustRoomChat.tsx (Demo) und LiveChat.tsx (Live), da die reine
 * UI-/Dateihandling-Logik identisch ist und sich nur die Auth-Header hinter
 * extractFn unterscheiden.
 */
export function useDocumentAttachment(extractFn: ExtractFn, lang: Lang) {
  const [attachment, setAttachment] = useState<AttachedDocument | null>(null)
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
    if (!ACCEPTED_ATTACHMENT_EXTENSIONS.includes(ext)) {
      setAttachment(null)
      setStatus('error')
      setErrorMessage(
        lang === 'en'
          ? 'Unsupported file type. Allowed: PDF, Word (.docx), text (.txt).'
          : 'Dateityp nicht unterstützt. Erlaubt: PDF, Word (.docx), Text (.txt).',
      )
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
        setAttachment({ filename: file.name, text: result.text, truncated: result.truncated })
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
