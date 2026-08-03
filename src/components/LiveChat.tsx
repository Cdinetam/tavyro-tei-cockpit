import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import type { LiveChatStatus } from '../hooks/useLiveChat'
import type { LiveConversationSummary } from '../lib/liveClient'
import { getCopy, type Lang } from '../lib/i18n'

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

interface Props {
  lang: Lang
  messages: ChatMessage[]
  status: LiveChatStatus
  errorMessage: string
  savedConversations: LiveConversationSummary[]
  send: (text: string) => void
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

  if (messages.length === 0) {
    return (
      <section className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-brass-light">
            {liveCopy.statusLabel}
          </span>
          <button
            onClick={onLogout}
            className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            {liveCopy.logout}
          </button>
        </div>
        <h1 className="mt-6 font-display text-[1.75rem] font-medium leading-snug text-paper">
          {liveCopy.empty.heading}
        </h1>
        <p className="mt-3 max-w-lg font-sans text-[15px] leading-relaxed text-paper-dim">{liveCopy.empty.body}</p>
        <form onSubmit={handleSubmit} className="mt-8">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={liveCopy.empty.placeholder}
            rows={4}
            className="w-full resize-none border border-line bg-ink-800/40 px-4 py-3.5 font-sans text-[15px] leading-relaxed text-paper placeholder:text-paper-faint/70 focus:border-brass-dim"
          />
          <CharCounter length={draft.length} lang={lang} />
          <button
            type="submit"
            disabled={!draft.trim() || overLimit}
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
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brass" />
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
            {liveCopy.statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="border border-line-strong px-3.5 py-1.5 font-sans text-[12.5px] font-medium text-paper-dim transition-all duration-300 ease-editorial hover:border-brass-dim hover:text-paper"
          >
            {liveCopy.newDialog}
          </button>
          <button
            onClick={onLogout}
            className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            {liveCopy.logout}
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto py-6">
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
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
            placeholder={liveCopy.active.placeholder}
            rows={2}
            className="w-full resize-none border border-line bg-ink-800/40 px-4 py-3 font-sans text-[14.5px] leading-relaxed text-paper placeholder:text-paper-faint/70 focus:border-brass-dim"
          />
          <button
            type="submit"
            disabled={!draft.trim() || status === 'sending' || overLimit}
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
