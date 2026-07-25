import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import type { ChatFlowStatus, SavedConversation } from '../hooks/useTrustRoomChat'
import { isMockMode } from '../lib/aiClient'

const BOOKING_URL = 'https://tavyro.ch/de/erstgespraech-buchen'
// Muss mit MAX_MESSAGE_LENGTH in api/src/functions/chat.ts übereinstimmen —
// hier nur zur frühzeitigen Rückmeldung beim Tippen, die eigentliche
// Durchsetzung passiert serverseitig.
const MAX_MESSAGE_LENGTH = 2000
const WARN_THRESHOLD = MAX_MESSAGE_LENGTH - 200

function CharCounter({ length }: { length: number }) {
  if (length < WARN_THRESHOLD) return null
  const overLimit = length > MAX_MESSAGE_LENGTH
  return (
    <p
      className={`mt-2 font-mono text-[10.5px] uppercase tracking-widest2 ${
        overLimit ? 'text-paper' : 'text-paper-faint'
      }`}
    >
      {length} / {MAX_MESSAGE_LENGTH} Zeichen
      {overLimit ? ' — bitte kürzen' : ''}
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
            : 'max-w-[75%] border border-line-soft bg-ink-800/60 px-5 py-3.5 font-display text-[16px] leading-relaxed text-paper-dim'
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
function CliffhangerCta() {
  return (
    <div className="flex justify-start">
      <div className="ml-1 flex max-w-[75%] items-center gap-3 border-l-2 border-brass-dim bg-brass/[0.05] py-2 pl-4">
        <span className="font-mono text-[10.5px] uppercase tracking-widest2 text-brass-light">
          Für das persönliche Gespräch
        </span>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 font-mono text-[11px] uppercase tracking-widest2 text-paper-dim transition-colors hover:text-paper"
        >
          Erstgespräch buchen →
        </a>
      </div>
    </div>
  )
}

function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-CH', {
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
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onCancel,
}: {
  onSaveAndLeave: () => void
  onLeaveWithoutSaving: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm border border-line-strong bg-ink-800 p-7 shadow-panel">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
          Gespräch verlassen?
        </p>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-dim">
          Der bisherige Verlauf geht sonst verloren. Möchten Sie dieses Gespräch vorher lokal auf
          diesem Gerät speichern?
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onSaveAndLeave}
            className="border border-brass-dim bg-brass/[0.08] px-4 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
          >
            Speichern &amp; verlassen
          </button>
          <button
            onClick={onLeaveWithoutSaving}
            className="border border-line-strong px-4 py-2.5 font-sans text-[13px] text-paper-dim transition-colors hover:border-paper-faint hover:text-paper"
          >
            Ohne Speichern verlassen
          </button>
          <button
            onClick={onCancel}
            className="mt-1 font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}

interface Props {
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
          Demo-Version · Kontingent erreicht
        </p>
        <h2 className="mt-4 font-display text-2xl font-medium text-paper">
          {weeklyLimit
            ? `Die Demo-Version ist auf ${weeklyLimit} Gespräche pro Woche begrenzt — Ihr Kontingent ist erreicht.`
            : 'Ihr Kontingent in der Demo-Version ist für diese Woche erreicht.'}
        </h2>
        <p className="mt-4 font-sans text-[14.5px] leading-relaxed text-paper-dim">
          Das ist bewusst so begrenzt: ein erstes Gespräch, alles Weitere gehört in einen echten
          Austausch — nicht in eine endlose Demo-Schleife.
        </p>
        <div className="mt-7 flex flex-wrap gap-4">
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
          >
            Erstgespräch buchen →
          </a>
          <button
            onClick={onExit}
            className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            Zurück zum Start
          </button>
        </div>
      </section>
    )
  }

  if (status === 'demo_expired') {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-xl flex-col justify-center px-6">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint">
          Pilotphase abgeschlossen
        </p>
        <h2 className="mt-4 font-display text-2xl font-medium text-paper">
          Dieser Trust Room ist aktuell nicht verfügbar.
        </h2>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-7 inline-flex w-fit items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
        >
          Erstgespräch buchen →
        </a>
      </section>
    )
  }

  if (messages.length === 0) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-2xl flex-col justify-center px-6 py-16">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
          TEI® Trust Room · Gespräch
        </p>
        <h1 className="mt-4 font-display text-[1.75rem] font-medium leading-snug text-paper">
          Worüber möchten Sie nachdenken?
        </h1>
        <p className="mt-3 max-w-lg font-sans text-[15px] leading-relaxed text-paper-dim">
          Anders als die kurze Analyse: hier entsteht ein echtes, mehrteiliges Gespräch — TEI® hört
          zu, ordnet ein und bleibt mit Ihnen im Austausch.
        </p>
        <p className="mt-2 font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
          Demo-Version · kostenlose Testphase, begrenzt auf wenige Gespräche pro Woche
        </p>
        <form onSubmit={handleSubmit} className="mt-8">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Beschreiben Sie in ein paar Sätzen, was Sie beschäftigt…"
            rows={4}
            className="w-full resize-none border border-line bg-ink-800/40 px-4 py-3.5 font-sans text-[15px] leading-relaxed text-paper placeholder:text-paper-faint/70 focus:border-brass-dim"
          />
          <CharCounter length={draft.length} />
          <button
            type="submit"
            disabled={!draft.trim() || overLimit}
            className="mt-4 inline-flex items-center gap-2 border border-brass-dim bg-gradient-to-b from-brass/[0.14] to-brass/[0.06] px-6 py-3 font-sans text-[14px] font-medium text-paper shadow-panel transition-all duration-300 ease-editorial hover:border-brass hover:from-brass/[0.2] hover:to-brass/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Gespräch beginnen →
          </button>
        </form>

        {savedConversations.length > 0 && (
          <div className="mt-12 border-t border-line-soft pt-6">
            <p className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
              Lokal gespeicherte Gespräche auf diesem Gerät
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
                      {firstUserMessage(c.messages) || '(ohne Text)'}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
                      {formatSavedAt(c.savedAt)}
                    </p>
                  </button>
                  <button
                    onClick={() => deleteSavedConversation(c.id)}
                    aria-label="Gespeichertes Gespräch löschen"
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
            {isMockMode
              ? 'Demo-Modus lokal · kein Live-Modell verbunden'
              : 'Demo-Version · vertrauliches Gespräch'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light transition-colors hover:text-paper"
          >
            Erstgespräch buchen →
          </a>
          <button
            onClick={onRequestNewChat}
            className="border border-line-strong px-3.5 py-1.5 font-sans text-[12.5px] font-medium text-paper-dim transition-all duration-300 ease-editorial hover:border-brass-dim hover:text-paper"
          >
            Neues Gespräch
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto py-6">
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bubble message={m} />
              {m.role === 'assistant' && m.cliffhanger && <CliffhangerCta />}
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
            placeholder="Antworten…"
            rows={2}
            className="w-full resize-none border border-line bg-ink-800/40 px-4 py-3 font-sans text-[14.5px] leading-relaxed text-paper placeholder:text-paper-faint/70 focus:border-brass-dim"
          />
          <button
            type="submit"
            disabled={!draft.trim() || status === 'sending' || overLimit}
            className="shrink-0 border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Senden
          </button>
        </div>
        <CharCounter length={draft.length} />
      </form>
    </div>
  )
}
