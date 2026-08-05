import { useEffect, useRef, useState } from 'react'
import { chatMessageImageUrls, chatMessageText, type ChatMessage } from '../types'
import type { LiveChatStatus } from '../hooks/useLiveChat'
import { extractDocument, type LiveConversationSummary } from '../lib/liveClient'
import { getCopy, type Lang } from '../lib/i18n'
import { useDocumentAttachment } from '../hooks/useDocumentAttachment'
import {
  ACCEPTED_ATTACHMENT_ACCEPT,
  composeMessageWithAttachments,
  MAX_ATTACHMENTS_COUNT,
  parseMessageAttachments,
} from '../lib/attachments'

const MAX_MESSAGE_LENGTH = 2000
const WARN_THRESHOLD = MAX_MESSAGE_LENGTH - 200

function CharCounter({ length, lang }: { length: number; lang: Lang }) {
  if (length < WARN_THRESHOLD) return null
  const overLimit = length > MAX_MESSAGE_LENGTH
  const copy = getCopy(lang)
  return (
    <p className={`mt-2 font-mono text-[10.5px] uppercase tracking-widest2 ${overLimit ? 'text-paper' : 'text-paper-faint'}`}>
      {length} / {MAX_MESSAGE_LENGTH} {copy.chat.charCounterSuffix}
      {overLimit ? copy.chat.charCounterOverLimit : ''}
    </p>
  )
}

function Bubble({ message, lang }: { message: ChatMessage; lang: Lang }) {
  const isUser = message.role === 'user'
  const copy = getCopy(lang).attachment
  const parsed = isUser ? parseMessageAttachments(message.content) : null
  const imageUrls = isUser ? chatMessageImageUrls(message.content) : []
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function toggleExpanded(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  if (parsed || imageUrls.length > 0) {
    const text = parsed ? parsed.userText : chatMessageText(message.content)
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] border border-brass-dim/50 bg-brass/[0.08] px-5 py-3.5 font-sans text-[15px] leading-relaxed text-paper">
          {imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imageUrls.map((url, i) => (
                <img key={i} src={url} alt={copy.imageAlt} className="max-h-56 w-auto rounded border border-line-soft" />
              ))}
            </div>
          )}
          {text && <p className={`whitespace-pre-line ${imageUrls.length > 0 ? 'mt-2.5' : ''}`}>{text}</p>}
          {parsed && parsed.documents.length > 0 && (
            <div className={`flex flex-col gap-1.5 ${imageUrls.length > 0 || text ? 'mt-2.5' : ''}`}>
              {parsed.documents.map((doc, i) => (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(i)}
                    className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-widest2 text-brass-light transition-colors hover:text-paper"
                  >
                    📎 {doc.filename} · {expanded.has(i) ? copy.collapse : copy.expand}
                  </button>
                  {expanded.has(i) && (
                    <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line border border-line-soft bg-ink-900/50 p-3 font-mono text-[12px] leading-relaxed text-paper-faint">
                      {doc.documentText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[75%] border border-brass-dim/50 bg-brass/[0.08] px-5 py-3.5 font-sans text-[15px] leading-relaxed text-paper'
            : 'max-w-[85%] whitespace-pre-line border border-line-soft bg-ink-800/60 px-5 py-3.5 font-display text-[16px] leading-relaxed text-paper-dim'
        }
      >
        {chatMessageText(message.content)}
      </div>
    </div>
  )
}

function AttachButton({ attachment, lang }: { attachment: ReturnType<typeof useDocumentAttachment>; lang: Lang }) {
  const copy = getCopy(lang).attachment
  return (
    <>
      <input
        ref={attachment.inputRef}
        type="file"
        accept={ACCEPTED_ATTACHMENT_ACCEPT}
        multiple
        onChange={attachment.handleFilesSelected}
        className="hidden"
      />
      <button
        type="button"
        onClick={attachment.openPicker}
        aria-label={copy.buttonAria}
        title={copy.buttonAria}
        disabled={attachment.status === 'uploading' || attachment.attachments.length >= MAX_ATTACHMENTS_COUNT}
        className="shrink-0 border border-line-strong px-3.5 py-3 text-paper-dim transition-colors hover:border-brass-dim hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
      >
        📎
      </button>
    </>
  )
}

function AttachmentBar({ attachment, lang }: { attachment: ReturnType<typeof useDocumentAttachment>; lang: Lang }) {
  const copy = getCopy(lang).attachment
  if (attachment.status === 'idle' && attachment.attachments.length === 0) return null
  return (
    <div className="mb-2 flex flex-col gap-1.5 font-mono text-[10.5px] uppercase tracking-widest2">
      {attachment.status === 'uploading' && <span className="text-paper-faint">{copy.uploading}</span>}
      {attachment.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachment.attachments.map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-2 border border-line-soft bg-ink-800/40 px-2.5 py-1 text-brass-light"
            >
              {item.kind === 'image' ? '🖼️' : '📎'} {item.filename}
              {item.kind === 'document' && item.truncated && (
                <span className="normal-case text-paper-faint">{copy.truncatedNote}</span>
              )}
              <button
                type="button"
                onClick={() => attachment.removeAt(i)}
                aria-label={copy.remove}
                className="text-paper-faint transition-colors hover:text-paper"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {attachment.errorMessage && <span className="normal-case text-paper-dim">{attachment.errorMessage}</span>}
    </div>
  )
}

function LangToggle({ lang, onToggleLang }: { lang: Lang; onToggleLang: () => void }) {
  const copy = getCopy(lang)
  return (
    <button
      onClick={onToggleLang}
      aria-label={copy.header.langToggleAria}
      className="flex shrink-0 items-center gap-1 font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
    >
      <span className={lang === 'de' ? 'text-paper' : undefined}>DE</span>
      <span aria-hidden="true">|</span>
      <span className={lang === 'en' ? 'text-paper' : undefined}>EN</span>
    </button>
  )
}

function formatSavedAt(ms: number, lang: Lang): string {
  try {
    const locale = lang === 'en' ? 'en-GB' : 'de-CH'
    return new Date(ms).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Overlay mit der Liste gespeicherter Gespräche — Zugang aus dem AKTIVEN
 * Chat heraus, ohne den bisherigen Umweg über "Neues Gespräch" (das das
 * laufende Gespräch beendet, bevor die Liste sichtbar wird). Wiederverwendet
 * dieselbe Zeilen-Darstellung wie die Liste auf dem Startbildschirm.
 */
function HistoryPanel({
  lang,
  savedConversations,
  onResume,
  onDelete,
  onClose,
}: {
  lang: Lang
  savedConversations: LiveConversationSummary[]
  onResume: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const copy = getCopy(lang)
  const liveCopy = copy.live.room
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-line-strong bg-ink-800 p-7 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{liveCopy.savedKicker}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={liveCopy.historyCloseAria}
            className="shrink-0 font-mono text-[13px] text-paper-faint transition-colors hover:text-paper"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto">
          {savedConversations.length === 0 ? (
            <p className="font-sans text-[13.5px] leading-relaxed text-paper-faint">{liveCopy.historyEmpty}</p>
          ) : (
            savedConversations.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 border border-line-soft bg-ink-800/30 px-5 py-3.5"
              >
                <button
                  onClick={() => {
                    onResume(c.id)
                    onClose()
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-sans text-[14px] leading-snug text-paper-dim">
                    {c.title || liveCopy.savedEmptyLabel}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
                    {formatSavedAt(c.updatedAt, lang)}
                  </p>
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  aria-label={liveCopy.deleteAria}
                  className="shrink-0 font-mono text-[11px] text-paper-faint transition-colors hover:text-paper"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  lang: Lang
  onToggleLang: () => void
  messages: ChatMessage[]
  status: LiveChatStatus
  errorMessage: string
  savedConversations: LiveConversationSummary[]
  send: (content: ChatMessage['content']) => void
  reset: () => void
  resumeConversation: (id: string) => void
  deleteSavedConversation: (id: string) => void
  onLogout: () => void
}

/**
 * Live-Version-Pendant zu TrustRoomChat.tsx — bewusst deutlich schlanker:
 * kein limit_reached/conversation_limit_reached/demo_expired-Zweig (all das
 * existiert für die Live-Version nicht), kein CliffhangerCta (siehe
 * liveChat.ts: cliffhanger ist dort immer false), dafür ein Logout-Button
 * und eine aus dem Server geladene (statt lokal gespeicherte)
 * Gesprächsliste.
 */
export function LiveChat({
  lang,
  onToggleLang,
  messages,
  status,
  errorMessage,
  savedConversations,
  send,
  reset,
  resumeConversation,
  deleteSavedConversation,
  onLogout,
}: Props) {
  const copy = getCopy(lang)
  const liveCopy = copy.live.room
  const [draft, setDraft] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const attachment = useDocumentAttachment(extractDocument, lang)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, status])

  const overLimit = draft.length > MAX_MESSAGE_LENGTH
  const canSubmit = (draft.trim() || attachment.attachments.length > 0) && attachment.status !== 'uploading' && !overLimit

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || status === 'sending') return
    const content = composeMessageWithAttachments(draft, attachment.attachments)
    send(content)
    setDraft('')
    attachment.clear()
  }

  if (messages.length === 0) {
    return (
      <section className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/tavyro-logo.png" alt="TaVyro" className="h-8 w-auto" />
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-brass-light">
              {liveCopy.statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <LangToggle lang={lang} onToggleLang={onToggleLang} />
            <button
              onClick={onLogout}
              className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
            >
              {liveCopy.logout}
            </button>
          </div>
        </div>
        <h1 className="mt-6 font-display text-[1.75rem] font-medium leading-snug text-paper">
          {liveCopy.empty.heading}
        </h1>
        <p className="mt-3 max-w-lg font-sans text-[15px] leading-relaxed text-paper-dim">{liveCopy.empty.body}</p>
        <form onSubmit={handleSubmit} className="mt-8">
          <AttachmentBar attachment={attachment} lang={lang} />
          <div className="flex items-end gap-3">
            <AttachButton attachment={attachment} lang={lang} />
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={liveCopy.empty.placeholder}
              rows={4}
              className="w-full resize-none border border-line bg-ink-800/40 px-4 py-3.5 font-sans text-[15px] leading-relaxed text-paper placeholder:text-paper-faint/70 focus:border-brass-dim"
            />
          </div>
          <CharCounter length={draft.length} lang={lang} />
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-4 inline-flex items-center gap-2 border border-brass-dim bg-gradient-to-b from-brass/[0.14] to-brass/[0.06] px-6 py-3 font-sans text-[14px] font-medium text-paper shadow-panel transition-all duration-300 ease-editorial hover:border-brass hover:from-brass/[0.2] hover:to-brass/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {liveCopy.empty.startButton}
          </button>
        </form>

        {savedConversations.length > 0 && (
          <div className="mt-12 border-t border-line-soft pt-6">
            <p className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
              {liveCopy.savedKicker}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {savedConversations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 border border-line-soft bg-ink-800/30 px-5 py-3.5"
                >
                  <button onClick={() => resumeConversation(c.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-sans text-[14px] leading-snug text-paper-dim">
                      {c.title || liveCopy.savedEmptyLabel}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
                      {formatSavedAt(c.updatedAt, lang)}
                    </p>
                  </button>
                  <button
                    onClick={() => deleteSavedConversation(c.id)}
                    aria-label={liveCopy.deleteAria}
                    className="shrink-0 font-mono text-[11px] text-paper-faint transition-colors hover:text-paper"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col px-6">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft py-4">
        <div className="flex items-center gap-3">
          <img src="/tavyro-logo.png" alt="TaVyro" className="h-7 w-auto" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brass" />
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
            {liveCopy.statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHistory(true)}
            className="border border-line-strong px-3.5 py-1.5 font-sans text-[12.5px] font-medium text-paper-dim transition-all duration-300 ease-editorial hover:border-brass-dim hover:text-paper"
          >
            {liveCopy.historyButton}
          </button>
          <button
            onClick={reset}
            className="border border-line-strong px-3.5 py-1.5 font-sans text-[12.5px] font-medium text-paper-dim transition-all duration-300 ease-editorial hover:border-brass-dim hover:text-paper"
          >
            {liveCopy.newDialog}
          </button>
          <LangToggle lang={lang} onToggleLang={onToggleLang} />
          <button
            onClick={onLogout}
            className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            {liveCopy.logout}
          </button>
        </div>
      </div>

      {showHistory && (
        <HistoryPanel
          lang={lang}
          savedConversations={savedConversations}
          onResume={resumeConversation}
          onDelete={deleteSavedConversation}
          onClose={() => setShowHistory(false)}
        />
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto py-6">
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <Bubble key={i} message={m} lang={lang} />
          ))}
          {status === 'sending' && (
            <div className="flex justify-start">
              <div className="flex gap-1.5 border border-line-soft bg-ink-800/60 px-5 py-3.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-brass-dim"
                    style={{ animationDelay: `${i * 180}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          {status === 'error' && <p className="font-sans text-[13px] text-paper-faint">{errorMessage}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-line-soft py-4">
        <AttachmentBar attachment={attachment} lang={lang} />
        <div className="flex items-end gap-3">
          <AttachButton attachment={attachment} lang={lang} />
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder={liveCopy.active.placeholder}
            rows={2}
            className="w-full resize-none border border-line bg-ink-800/40 px-4 py-3 font-sans text-[14.5px] leading-relaxed text-paper placeholder:text-paper-faint/70 focus:border-brass-dim"
          />
          <button
            type="submit"
            disabled={!canSubmit || status === 'sending'}
            className="shrink-0 border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {liveCopy.active.send}
          </button>
        </div>
        <CharCounter length={draft.length} lang={lang} />
      </form>
    </div>
  )
}
