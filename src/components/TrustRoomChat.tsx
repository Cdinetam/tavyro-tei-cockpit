import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import type { ChatFlowStatus, SavedConversation } from '../hooks/useTrustRoomChat'
import { isMockMode } from '../lib/aiClient'
import { BOOKING_URL, DATE_LOCALE, getCopy, type Lang } from '../lib/i18n'

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

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[75%] border border-brass-dim/50 bg-brass/[0.08] px-5 py-3.5 font-sans text-[15px] leading-relaxed text-paper'
            : 'max-w-[85%] whitespace-pre-line border border-line-soft bg-ink-800/60 px-5 py-3.5 font-display text-[16px] leading-relaxed text-paper-dim'
        }
      >
        {message.content}
      </div>
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
  return messages.find((m) => m.role === 'user')?.content ?? ''
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
  send: (text: string) => void
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

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, status])

  const overLimit = draft.length > MAX_MESSAGE_LENGTH

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || status === 'sending' || overLimit) return
    send(draft)
    setDraft('')
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
          <button
            onClick={onRequestNewChat}
            className="inline-flex items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
          >
            {copy.chat.conversationLimitReached.newDialog}
          </button>
          <a
            href={BOOKING_URL[lang]}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            {copy.chat.conversationLimitReached.booking}
          </a>
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
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={copy.chat.empty.placeholder}
            rows={4}
            className="w-full resize-none border border-line bg-ink-800/40 px-4 py-3.5 font-sans text-[15px] leading-relaxed text-paper placeholder:text-paper-faint/70 focus:border-brass-dim"
          />
          <CharCounter length={draft.length} lang={lang} />
          <button
            type="submit"
            disabled={!draft.trim() || overLimit}
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
              <Bubble message={m} />
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
        <div className="flex items-end gap-3">
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
            disabled={!draft.trim() || status === 'sending' || overLimit}
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
