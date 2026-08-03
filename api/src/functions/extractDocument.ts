import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { checkAccessCode } from '../lib/accessGate.js'
import { checkLiveSession } from '../lib/liveAuth.js'
import { getClientIp } from '../lib/clientIp.js'
import { checkExtractRateLimit } from '../lib/extractRateLimit.js'
import { extractTextFromFile, isSupportedExtension, fileExtension, MAX_FILE_BYTES } from '../lib/documentExtract.js'

interface ExtractRequestBody {
  filename?: string
  contentBase64?: string
  lang?: string
}

/**
 * Textextraktion für Dokument-Anhänge im Chat (PDF/Word/Text) — geteilt
 * zwischen Demo- (chat.ts) und Live-Flow (liveChat.ts): akzeptiert ENTWEDER
 * einen gültigen Demo-Zugangscode (x-tei-access-code) ODER eine gültige
 * Live-Sitzung (x-tei-live-token), da beide Chat-Oberflächen denselben
 * Anhang-Button bekommen. Liefert nur den extrahierten Text zurück — die
 * Datei selbst wird nirgends gespeichert, der Text wird clientseitig in die
 * eigentliche Chat-Nachricht eingebettet (siehe src/lib/attachments.ts).
 */
export async function extractDocument(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: ExtractRequestBody
  try {
    body = (await req.json()) as ExtractRequestBody
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: 'Ungültiger Request-Body.' } }
  }

  const lang: 'de' | 'en' = body.lang === 'en' ? 'en' : 'de'

  const demoAccess = await checkAccessCode(req)
  const liveAccess = demoAccess.denied ? await checkLiveSession(req) : null
  if (demoAccess.denied && (!liveAccess || liveAccess.denied)) {
    return demoAccess.denied
  }

  const clientIp = getClientIp(req)
  const allowed = await checkExtractRateLimit(clientIp)
  if (!allowed) {
    return {
      status: 429,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? 'Too many uploads. Please try again later.'
            : 'Zu viele Uploads. Bitte später erneut versuchen.',
      },
    }
  }

  const filename = (body.filename ?? '').trim()
  const contentBase64 = body.contentBase64 ?? ''

  if (!filename || !contentBase64) {
    return {
      status: 400,
      jsonBody: { status: 'error', message: lang === 'en' ? 'File is missing.' : 'Datei fehlt.' },
    }
  }

  const ext = fileExtension(filename)
  if (!isSupportedExtension(ext)) {
    return {
      status: 400,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? 'Unsupported file type. Allowed: PDF, Word (.docx), text (.txt).'
            : 'Dateityp nicht unterstützt. Erlaubt: PDF, Word (.docx), Text (.txt).',
      },
    }
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(contentBase64, 'base64')
  } catch {
    return { status: 400, jsonBody: { status: 'error', message: lang === 'en' ? 'File is invalid.' : 'Datei ist ungültig.' } }
  }

  if (buffer.byteLength === 0 || buffer.byteLength > MAX_FILE_BYTES) {
    return {
      status: 400,
      jsonBody: {
        status: 'error',
        message: lang === 'en' ? 'File is too large (max. 8 MB).' : 'Datei ist zu gross (max. 8 MB).',
      },
    }
  }

  try {
    const { text, truncated } = await extractTextFromFile(filename, buffer)
    if (!text) {
      return {
        status: 400,
        jsonBody: {
          status: 'error',
          message:
            lang === 'en'
              ? 'No text could be found in this file.'
              : 'In dieser Datei konnte kein Text gefunden werden.',
        },
      }
    }
    return { status: 200, jsonBody: { status: 'ok', text, truncated } }
  } catch (err) {
    context.error('TEI extract-document failed', err)
    return {
      status: 502,
      jsonBody: {
        status: 'error',
        message:
          lang === 'en'
            ? 'The file could not be read. Please try a different file.'
            : 'Die Datei konnte nicht gelesen werden. Bitte eine andere Datei versuchen.',
      },
    }
  }
}

app.http('extractDocument', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'extract-document',
  handler: extractDocument,
})
