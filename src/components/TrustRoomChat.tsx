import { useEffect, useRef, useState } from 'react'
import { chatMessageImageUrl, chatMessageText, type ChatMessage } from '../types'
import type { ChatFlowStatus, SavedConversation } from '../hooks/useTrustRoomChat'
import { extractDocument, isMockMode } from '../lib/aiClient'
import { BOOKING_URL, DATE_LOCALE, getCopy, type Lang } from '../lib/i18n'
import { useDocumentAttachment } from '../hooks/useDocumentAttachment'
import {
  ACCEPTED_ATTACHMENT_ACCEPT,
  composeMessageWithAttachment,
  composeMessageWithImage,
  parseMessageAttachment,
} from '../lib/attachments'

// Muss mit MAX_MESSAGE_LENGTH in api/src/functions/chat.ts übereinstimmen —
// hier nur zur frühzeitigen Rückmeldung beim Tippen, die eigentliche
// Durchsetzung passiert serverseitig.
const MAX_MESSAGE_LENGTH = 2000
const WARN_THRESHOLD = MAX_MESSAGE_LENGTH - 200

function CharCounter({ length, lang }: { length: number; lang: Lang }) {
  if (length < WARN_THRESHOLD) return null
  const overLimit = length > MAX_MESSAGE_LENGTH
  const copy = getCopy(lang)
  return (
    <p
      className={`mt-2 font-mono text-[10.5px] uppercase tracking-widest2 ${
        overLimit ? 'text-paper' : 'text-paper-faint'
      }`}
    >
      {length} / {MAX_MESSAGE_LENGTH} {copy.chat.charCounterSuffix}
      {overLimit ? copy.chat.charCounterOverLimit : ''}
    </p>
  )
}

function Bubble({ message, lang }: { message: ChatMessage; lang: Lang }) {
  const isUser = message.role === 'user'
  const copy = getCopy(lang).attachment
  const parsed = isUser ? parseMessageAttachment(message.content) : null
  const imageUrl = isUser ? chatMessageImageUrl(message.content) : null
  const [expanded, setExpanded] = useState(false)

  if (parsed) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] border border-brass-dim/50 bg-brass/[0.08] px-5 py-3.5 font-sans text-[15px] leading-relaxed text-paper">
          {parsed.userText && <p className="whitespace-pre-line">{parsed.userText}</p>}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-widest2 text-brass-light transition-colors hover:text-paper ${parsed.userText ? 'mt-2.5' : ''}`}
          >
            📎 {parsed.filename} · {expanded ? copy.collapse : copy.expand}
          </button>
          {expanded && (
            <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line border border-line-soft bg-ink-900/50 p-3 font-mono text-[12px] leading-relaxed text-paper-faint">
              {parsed.documentText}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (imageUrl) {
    const text = chatMessageText(message.content)
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] border border-brass-dim/50 bg-brass/[0.08] px-5 py-3.5 font-sans text-[15px] leading-relaxed text-paper">
          <img src={imageUrl} alt={copy.imageAlt} className="max-h-72 w-auto rounded border border-line-soft" />
          {text && <p className="mt-2.5 whitespace-pre-line">{text}</p>}
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
        onChange={attachment.handleFileSelected}
        className="hidden"
      />
      <button
        type="button"
        onClick={attachment.openPicker}
        aria-label={copy.buttonAria}
        title={copy.buttonAria}
        disabled={attachment.status === 'uploading'}
        className="shrink-0 border border-line-strong px-3.5 py-3 text-paper-dim transition-colors hover:border-brass-dim hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
      >
        📎
      </button>
    </>
  )
}

function AttachmentBar({ attachment, lang }: { attachment: ReturnType<typeof useDocumentAttachment>; lang: Lang }) {
  const copy = getCopy(lang).attachment
  if (attachment.status === 'idle') return null
  return (
    <div className="mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-widest2">
      {attachment.status === 'uploading' && <span className="text-paper-faint">{copy.uploading}</span>}
      {attachment.status === 'ready' && attachment.attachment && (
        <span className="flex items-center gap-2 text-brass-light">
          {attachment.attachment.kind === 'image' ? '🖼️' : '📎'} {attachment.attachment.filename}
          {attachment.attachment.kind === 'document' && attachment.attachment.truncated && (
            <span className="normal-case text-paper-faint">{copy.truncatedNote}</span>
          )}
          <button
            type="button"
            onClick={attachment.clear}
            aria-label={copy.remove}
            className="text-paper-faint transition-colors hover:text-paper"
          >
            ✕
          </button>
        </span>
      )}
      {attachment.status === 'error' && (
        <span className="flex items-center gap-2 normal-case text-paper-dim">
          {attachment.errorMessage}
          <button type="button" onClick={attachment.clear} className="text-paper-faint transition-colors hover:text-paper">
            ✕
          </button>
        </span>
      )}
    </div>
  )
}

/**
 * Erscheint direkt unter einer Cliffhanger-Antwort (siehe useTrustRoomChat/
 * chat.ts) — macht den bewussten Abschluss dieses Gesprächsfadens auch
 * visuell greifbar, statt es allein am Text der Antwort zu belassen.
 */
function CliffhangerCta({ lang }: { lang: Lang }) {
  const copy = getCopy(lang)
  return (
    <div className="flex justify-start">
      <div className="ml-1 flex max-w-[75%] items-center gap-3 border-l-2 border-brass-dim bg-brass/[0.05] py-2 pl-4">
        <span className="font-mono text-[10.5px] uppercase tracking-widest2 text-brass-light">
          {copy.chat.cliffhangerLabel}
        </span>
        <a
          href={BOOKING_URL[lang]}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 font-mono text-[11px] uppercase tracking-widest2 text-paper-dim transition-colors hover:text-paper"
        >
          {copy.chat.cliffhangerBooking}
        </a>
      </div>
    </div>
  )
}

function formatSavedAt(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleString(DATE_LOCALE[lang], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function firstUserMessage(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')
  return first ? chatMessageText(first.content) : ''
}

/**
 * Bestätigungsdialog beim Verlassen eines laufenden Gesprächs — verhindert
 * versehentlichen Verlust, ohne automatisch zu speichern (siehe
 * Produktentscheidung zur Vertraulichkeit: Speichern ist immer eine
 * bewusste, einzelne Entscheidung der Person, nie ein Automatismus).
 */
export function ExitConfirmDialog({
  lang = 'de',
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onCancel,
}: {
  lang?: Lang
  onSaveAndLeave: () => void
  onLeaveWithoutSaving: () => void
  onCancel: () => void
}) {
  const copy = getCopy(lang)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm border border-line-strong bg-ink-800 p-7 shadow-panel">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
          {copy.chat.exitDialog.title}
        </p>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-dim">{copy.chat.exitDialog.body}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onSaveAndLeave}
            className="border border-brass-dim bg-brass/[0.08] px-4 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
          >
            {copy.chat.exitDialog.saveAndLeave}
          </button>
          <button
            onClick={onLeaveWithoutSaving}
            className="border border-line-strong px-4 py-2.5 font-sans text-[13px] text-paper-dim transition-colors hover:border-paper-faint hover:text-paper"
          >
            {copy.chat.exitDialog.leaveWithoutSaving}
          </button>
          <button
            onClick={onCancel}
            className="mt-1 font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            {copy.chat.exitDialog.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  lang: Lang
  messages: ChatMessage[]
  status: ChatFlowStatus
  errorMessage: string
  savedConversations: SavedConversation[]
  initialDraft?: string
  /**
   * Die tatsächlich konfigurierte Wochengrenze (PILOT_WEEKLY_LIMIT), erst
   * bekannt nachdem das Backend einmal "limit_reached" gemeldet hat. Bis
   * dahin null — die UI zeigt dann nur allgemein "Demo-Version" ohne Zahl.
   */
  weeklyLimit: number | null
  send: (content: ChatMessage['content']) => void
  resumeConversation: (id: string) => void
  deleteSavedConversation: (id: string) => void
  onRequestNewChat: () => void
  onExit: () => void
}

export function TrustRoomChat({
  lang,
  messages,
  status,
  errorMessage,
  savedConversations,
  initialDraft,
  weeklyLimit,
  send,
  resumeConversation,
  deleteSavedConversation,
  onRequestNewChat,
  onExit,
}: Props) {
  const copy = getCopy(lang)
  const [draft, setDraft] = useState(initialDraft ?? '')
  const listRef = useRef<HTMLDivElement>(null)
  const attachment = useDocumentAttachment(extractDocument, lang)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, status])

  const overLimit = draft.length > MAX_MESSAGE_LENGTH
  const canSubmit = (draft.trim() || attachment.attachment) && attachment.status !== 'uploading' && !overLimit

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || status === 'sending') return
    const content: ChatMessage['content'] =
      attachment.attachment?.kind === 'document'
        ? composeMessageWithAttachment(draft, attachment.attachment.filename, attachment.attachment.text)
        : attachment.attachment?.kind === 'image'
          ? composeMessageWithImage(draft, attachment.attachment.dataUrl)
          : draft
    send(content)
    setDraft('')
    attachment.clear()
  }

  if (status === 'limit_reached') {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-xl flex-col justify-center px-6">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
          {copy.chat.limitReached.kicker}
        </p>
        <h2 className="mt-4 font-display text-2xl font-medium text-paper">
          {weeklyLimit
            ? copy.chat.limitReached.headingWithLimit(weeklyLimit)
            : copy.chat.limitReached.headingWithoutLimit}
        </h2>
        <p className="mt-4 font-sans text-[14.5px] leading-relaxed text-paper-dim">{copy.chat.limitReached.body}</p>
        <div className="mt-7 flex flex-wrap gap-4">
          <a
            href={BOOKING_URL[lang]}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
          >
            {copy.chat.limitReached.booking}
          </a>
          <button
            onClick={onExit}
            className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            {copy.chat.limitReached.backToStart}
          </button>
        </div>
      </section>
    )
  }

  if (status === 'conversation_limit_reached') {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-xl flex-col justify-center px-6">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
          {copy.chat.conversationLimitReached.kicker}
        </p>
        <h2 className="mt-4 font-display text-2xl font-medium text-paper">
          {copy.chat.conversationLimitReached.heading}
        </h2>
        <p className="mt-4 font-sans text-[14.5px] leading-relaxed text-paper-dim">
          {copy.chat.conversationLimitReached.body}
        </p>
        <div className="mt-7 flex flex-wrap gap-4">
          <a
            href={BOOKING_URL[lang]}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
          >
            {copy.chat.conversationLimitReached.booking}
          </a>
          <button
            onClick={onRequestNewChat}
            className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            {copy.chat.conversationLimitReached.newDialog}
          </button>
        </div>
      </section>
    )
  }

  if (status === 'demo_expired') {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-xl flex-col justify-center px-6">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint">
          {copy.chat.demoExpired.kicker}
        </p>
        <h2 className="mt-4 font-display text-2xl font-medium text-paper">{copy.chat.demoExpired.heading}</h2>
        <a
          href={BOOKING_URL[lang]}
          target="_blank"
          rel="noreferrer"
          className="mt-7 inline-flex w-fit items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
        >
          {copy.chat.demoExpired.booking}
        </a>
      </section>
    )
  }

  if (messages.length === 0) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-2xl flex-col justify-center px-6 py-16">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{copy.chat.empty.kicker}</p>
        <h1 className="mt-4 font-display text-[1.75rem] font-medium leading-snug text-paper">
          {copy.chat.empty.heading}
        </h1>
        <p className="mt-3 max-w-lg font-sans text-[15px] leading-relaxed text-paper-dim">{copy.chat.empty.body}</p>
        <p className="mt-2 font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
          {copy.chat.empty.demoNote}
        </p>
        <form onSubmit={handleSubmit} className="mt-8">
          <AttachmentBar attachment={attachment} lang={lang} />
          <div className="flex items-end gap-3">
            <AttachButton attachment={attachment} lang={lang} />
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={copy.chat.empty.placeholder}
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
            {copy.chat.empty.startButton}
          </button>
        </form>

        {savedConversations.length > 0 && (
          <div className="mt-12 border-t border-line-soft pt-6">
            <p className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
              {copy.chat.empty.savedKicker}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {savedConversations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 border border-line-soft bg-ink-800/30 px-5 py-3.5"
                >
                  <button
                    onClick={() => resumeConversation(c.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-sans text-[14px] leading-snug text-paper-dim">
                      {firstUserMessage(c.messages) || copy.chat.empty.savedEmptyLabel}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
                      {formatSavedAt(c.savedAt, lang)}
                    </p>
                  </button>
                  <button
                    onClick={() => deleteSavedConversation(c.id)}
                    aria-label={copy.chat.empty.deleteAria}
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
    <div className="mx-auto flex h-[calc(100vh-56px)] max-w-3xl flex-col px-6">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft py-4">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brass" />
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
            {isMockMode ? copy.chat.active.statusMock : copy.chat.active.statusLive}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={BOOKING_URL[lang]}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light transition-colors hover:text-paper"
          >
            {copy.chat.active.booking}
          </a>
          <button
            onClick={onRequestNewChat}
            className="border border-line-strong px-3.5 py-1.5 font-sans text-[12.5px] font-medium text-paper-dim transition-all duration-300 ease-editorial hover:border-brass-dim hover:text-paper"
          >
            {copy.chat.active.newDialog}
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto py-6">
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bubble message={m} lang={lang} />
              {m.role === 'assistant' && m.cliffhanger && <CliffhangerCta lang={lang} />}
            </div>
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
          {status === 'error' && (
            <p className="font-sans text-[13px] text-paper-faint">{errorMessage}</p>
          )}
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
            placeholder={copy.chat.active.placeholder}
            rows={2}
            className="w-full resize-none border border-line bg-ink-800/40 px-4 py-3 font-sans text-[14.5px] leading-relaxed text-paper placeholder:text-paper-faint/70 focus:border-brass-dim"
          />
          <button
            type="submit"
            disabled={!canSubmit || status === 'sending'}
            className="shrink-0 border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.chat.active.send}
          </button>
        </div>
        <CharCounter length={draft.length} lang={lang} />
      </form>
    </div>
  )
}
