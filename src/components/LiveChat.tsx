import { useEffect, useRef, useState } from 'react'
import { chatMessageImageUrls, chatMessageText, type ChatMessage } from '../types'
import type { LiveChatStatus } from '../hooks/useLiveChat'
import {
  extractDocument,
  hasLiveMemory,
  clearLiveMemory,
  getLiveMemory,
  saveLiveMemory,
  syncLiveMemoryStep,
  type LiveConversationSummary,
  type LiveMemoryProfile,
} from '../lib/liveClient'
import { getCopy, type Lang } from '../lib/i18n'
import { useDocumentAttachment } from '../hooks/useDocumentAttachment'
import {
  ACCEPTED_ATTACHMENT_ACCEPT,
  composeMessageWithAttachments,
  MAX_ATTACHMENTS_COUNT,
  parseMessageAttachments,
} from '../lib/attachments'

// Muss mit MAX_MESSAGE_LENGTH in api/src/functions/liveChat.ts übereinstimmen
// (16'000 — Platz für getippten Text + eingebetteten Dokumentanhang).
const MAX_MESSAGE_LENGTH = 16000
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
        className="flex h-9 w-9 shrink-0 items-center justify-center border border-line-strong text-[15px] text-paper-dim transition-colors hover:border-brass-dim hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10 sm:text-base"
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

function LangToggle({ lang, onToggleLang, className }: { lang: Lang; onToggleLang: () => void; className?: string }) {
  const copy = getCopy(lang)
  return (
    <button
      onClick={onToggleLang}
      aria-label={copy.header.langToggleAria}
      className={`flex shrink-0 items-center gap-1 pr-1 font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper ${className ?? ''}`}
    >
      <span className={lang === 'de' ? 'text-paper' : undefined}>DE</span>
      <span aria-hidden="true">|</span>
      <span className={lang === 'en' ? 'text-paper' : undefined}>EN</span>
    </button>
  )
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-4 w-5 flex-col justify-between" aria-hidden="true">
      <span
        className={`block h-px w-full bg-paper transition-transform duration-200 ${open ? 'translate-y-[7px] rotate-45' : ''}`}
      />
      <span className={`block h-px w-full bg-paper transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
      <span
        className={`block h-px w-full bg-paper transition-transform duration-200 ${open ? '-translate-y-[7px] -rotate-45' : ''}`}
      />
    </span>
  )
}

type LiveMenuAction = {
  label: string
  onClick: () => void
}

function LiveTopBar({
  lang,
  liveCopy,
  showPulse,
  menuActions,
  onToggleLang,
}: {
  lang: Lang
  liveCopy: ReturnType<typeof getCopy>['live']['room']
  showPulse?: boolean
  menuActions: LiveMenuAction[]
  onToggleLang: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  function runAction(action: LiveMenuAction) {
    action.onClick()
    closeMenu()
  }

  return (
    <div className="chat-topbar flex min-w-0 items-center justify-between gap-3 border-b border-line-soft py-3 sm:py-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <img src="/tavyro-logo.png" alt="TaVyro" className="h-8 w-auto shrink-0 sm:h-9" />
        {showPulse && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brass" />}
        <span className="hidden truncate font-mono text-[10px] uppercase tracking-widest2 text-paper-faint sm:inline">
          {liveCopy.statusLabel}
        </span>
      </div>

      {/* Desktop-Navigation */}
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        {menuActions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="shrink-0 border border-line-strong px-3.5 py-1.5 text-center font-sans text-[12.5px] font-medium text-paper-dim transition-all duration-300 ease-editorial hover:border-brass-dim hover:text-paper"
          >
            {action.label}
          </button>
        ))}
        <LangToggle lang={lang} onToggleLang={onToggleLang} />
      </div>

      {/* Mobile: Hamburger-Menü */}
      <div className="relative shrink-0 md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? liveCopy.menuCloseAria : liveCopy.menuOpenAria}
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center border border-line-strong text-paper transition-colors hover:border-brass-dim"
        >
          <HamburgerIcon open={menuOpen} />
        </button>
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label={liveCopy.menuCloseAria}
              className="fixed inset-0 z-40 bg-ink-950/40"
              onClick={closeMenu}
            />
            <nav className="absolute right-0 top-full z-50 mt-2 w-56 border border-line-strong bg-ink-800 py-2 shadow-panel">
              {menuActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => runAction(action)}
                  className="block w-full px-4 py-3 text-left font-sans text-[14px] text-paper-dim transition-colors hover:bg-ink-800/80 hover:text-paper"
                >
                  {action.label}
                </button>
              ))}
              <div className="border-t border-line-soft px-4 py-3">
                <LangToggle lang={lang} onToggleLang={onToggleLang} />
              </div>
            </nav>
          </>
        )}
      </div>
    </div>
  )
}

function ChatInputForm({
  lang,
  liveCopy,
  draft,
  setDraft,
  attachment,
  canSubmit,
  status,
  onSubmit,
  variant,
}: {
  lang: Lang
  liveCopy: ReturnType<typeof getCopy>['live']['room']
  draft: string
  setDraft: (value: string) => void
  attachment: ReturnType<typeof useDocumentAttachment>
  canSubmit: boolean
  status: LiveChatStatus
  onSubmit: (e: React.FormEvent) => void
  variant: 'empty' | 'active'
}) {
  const placeholder = variant === 'empty' ? liveCopy.empty.placeholder : liveCopy.active.placeholder
  const isEmpty = variant === 'empty'
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // preventScroll: sonst schiebt der Browser die Seite nach unten und die
  // Top-Leiste wird am Viewport-Rand abgeschnitten.
  useEffect(() => {
    textareaRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <form
      onSubmit={onSubmit}
      className={isEmpty ? 'mt-8' : 'chat-composer border-t border-line-soft pt-3 sm:pt-4 safe-pb-form'}
    >
      <AttachmentBar attachment={attachment} lang={lang} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={
            isEmpty
              ? undefined
              : (e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSubmit(e)
                  }
                }
          }
          placeholder={placeholder}
          rows={isEmpty ? 5 : 3}
          className="min-h-[88px] w-full min-w-0 flex-1 resize-none border border-line bg-ink-800/40 px-4 py-3.5 font-sans text-[16px] leading-relaxed text-paper placeholder:text-paper-faint/70 focus:border-brass-dim sm:min-h-[72px] sm:text-[15px]"
        />
        <div className={`flex items-center gap-2 sm:shrink-0 ${isEmpty ? 'sm:self-end' : ''}`}>
          <AttachButton attachment={attachment} lang={lang} />
          {!isEmpty && (
            <button
              type="submit"
              disabled={!canSubmit || status === 'sending'}
              className="h-9 flex-1 border border-brass-dim bg-brass/[0.08] px-4 font-sans text-[14px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:flex-none sm:px-5 sm:text-[13px]"
            >
              {liveCopy.active.send}
            </button>
          )}
        </div>
      </div>
      <CharCounter length={draft.length} lang={lang} />
      {isEmpty && (
        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-brass-dim bg-gradient-to-b from-brass/[0.14] to-brass/[0.06] px-6 py-3.5 font-sans text-[15px] font-medium text-paper shadow-panel transition-all duration-300 ease-editorial hover:border-brass hover:from-brass/[0.2] hover:to-brass/[0.1] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:text-[14px]"
        >
          {liveCopy.empty.startButton}
        </button>
      )}
    </form>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 safe-inset backdrop-blur-sm"
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

const MEMORY_INPUT_CLASS =
  'w-full border border-line bg-ink-800/60 px-3 py-2 font-sans text-[16px] text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim sm:text-[14px]'

function MemorySection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line-soft pt-4">
      <p className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">{title}</p>
      {hint && <p className="mt-1 font-sans text-[12px] text-paper-faint">{hint}</p>}
      <div className="mt-2.5 flex flex-col gap-2">{children}</div>
    </div>
  )
}

function MemoryItem({ text, meta, removeAria, onRemove }: { text: string; meta?: string; removeAria: string; onRemove: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border border-line-soft bg-ink-800/30 px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        {meta && <p className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">{meta}</p>}
        <p className="font-sans text-[13.5px] leading-snug text-paper-dim">{text}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeAria}
        className="shrink-0 font-mono text-[11px] text-paper-faint transition-colors hover:text-paper"
      >
        ✕
      </button>
    </div>
  )
}

/**
 * Ansicht "Was TEI über mich weiss": zeigt die komplette Konto-Erinnerung
 * und erlaubt Korrekturen (Felder bearbeiten, einzelne Einträge entfernen).
 * Gespeichert wird erst per Button, damit mehrere Änderungen ein PUT ergeben.
 */
function MemoryPanel({
  lang,
  onClose,
  onClear,
  onSaved,
}: {
  lang: Lang
  onClose: () => void
  onClear: () => void
  onSaved: (hasMemory: boolean) => void
}) {
  const liveCopy = getCopy(lang).live.room
  const t = liveCopy.memoryPanel
  const [memory, setMemory] = useState<LiveMemoryProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    void getLiveMemory().then((loaded) => {
      setMemory(loaded)
      setLoading(false)
    })
  }, [])

  function update(change: (current: LiveMemoryProfile) => LiveMemoryProfile) {
    setMemory((current) => (current ? change(current) : current))
    setSaveState('idle')
  }

  function setIdentity(field: keyof LiveMemoryProfile['identity'], value: string) {
    update((m) => ({ ...m, identity: { ...m.identity, [field]: value } }))
  }

  function setPreference(field: keyof LiveMemoryProfile['preferences'], value: string) {
    update((m) => ({ ...m, preferences: { ...m.preferences, [field]: value } }))
  }

  function removeAt<K extends 'keyPeople' | 'strategicThemes' | 'openTopics' | 'decisions' | 'observations' | 'sessions'>(
    key: K,
    index: number,
  ) {
    update((m) => ({ ...m, [key]: (m[key] as unknown[]).filter((_, i) => i !== index) }))
  }

  async function handleSave() {
    if (!memory) return
    setSaveState('saving')
    const saved = await saveLiveMemory(memory)
    if (!saved) {
      setSaveState('error')
      return
    }
    setMemory(saved)
    setSaveState('saved')
    const isEmpty =
      !Object.entries(saved.identity).some(([k, v]) => k !== 'ceoNameConfirmed' && Boolean(v)) &&
      !Object.values(saved.preferences).some(Boolean) &&
      [saved.keyPeople, saved.strategicThemes, saved.openTopics, saved.decisions, saved.observations, saved.sessions].every(
        (list) => list.length === 0,
      )
    onSaved(!isEmpty)
  }

  const stringLists: { key: 'strategicThemes' | 'openTopics' | 'decisions'; title: string }[] = [
    { key: 'strategicThemes', title: t.strategicThemes },
    { key: 'openTopics', title: t.openTopics },
    { key: 'decisions', title: t.decisions },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 safe-inset backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col border border-line-strong bg-ink-800 p-6 shadow-panel sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{t.kicker}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeAria}
            className="shrink-0 font-mono text-[13px] text-paper-faint transition-colors hover:text-paper"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 font-sans text-[13.5px] leading-relaxed text-paper-dim">{t.intro}</p>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {loading ? (
            <p className="font-sans text-[13.5px] text-paper-faint">{t.loading}</p>
          ) : !memory ? (
            <p className="font-sans text-[13.5px] text-paper-faint">{t.empty}</p>
          ) : (
            <>
              <MemorySection title={t.person}>
                {(
                  [
                    ['ceoName', t.name],
                    ['role', t.role],
                    ['company', t.company],
                    ['industry', t.industry],
                    ['companySize', t.companySize],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="flex flex-col gap-1">
                    <span className="font-sans text-[12px] text-paper-faint">{label}</span>
                    <input
                      value={memory.identity[field]}
                      onChange={(e) => setIdentity(field, e.target.value)}
                      className={MEMORY_INPUT_CLASS}
                    />
                  </label>
                ))}
              </MemorySection>

              {memory.keyPeople.length > 0 && (
                <MemorySection title={t.keyPeople}>
                  {memory.keyPeople.map((person, i) => (
                    <MemoryItem
                      key={`${person.name}-${i}`}
                      text={person.role ? `${person.name} — ${person.role}` : person.name}
                      removeAria={t.removeAria}
                      onRemove={() => removeAt('keyPeople', i)}
                    />
                  ))}
                </MemorySection>
              )}

              {stringLists.map(
                ({ key, title }) =>
                  memory[key].length > 0 && (
                    <MemorySection key={key} title={title}>
                      {memory[key].map((entry, i) => (
                        <MemoryItem key={`${key}-${i}`} text={entry} removeAria={t.removeAria} onRemove={() => removeAt(key, i)} />
                      ))}
                    </MemorySection>
                  ),
              )}

              <MemorySection title={t.preferences}>
                {(
                  [
                    ['communicationStyle', t.communicationStyle],
                    ['decisionStyle', t.decisionStyle],
                    ['preferredApproach', t.preferredApproach],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="flex flex-col gap-1">
                    <span className="font-sans text-[12px] text-paper-faint">{label}</span>
                    <input
                      value={memory.preferences[field]}
                      onChange={(e) => setPreference(field, e.target.value)}
                      className={MEMORY_INPUT_CLASS}
                    />
                  </label>
                ))}
              </MemorySection>

              {memory.observations.length > 0 && (
                <MemorySection title={t.observations} hint={t.observationsHint}>
                  {memory.observations.map((item, i) => (
                    <MemoryItem
                      key={`obs-${i}`}
                      text={item.observation}
                      removeAria={t.removeAria}
                      onRemove={() => removeAt('observations', i)}
                    />
                  ))}
                </MemorySection>
              )}

              {memory.sessions.length > 0 && (
                <MemorySection title={t.sessions}>
                  {[...memory.sessions]
                    .map((session, i) => ({ session, i }))
                    .reverse()
                    .map(({ session, i }) => (
                      <MemoryItem
                        key={`session-${i}`}
                        meta={session.date}
                        text={session.summary}
                        removeAria={t.removeAria}
                        onRemove={() => removeAt('sessions', i)}
                      />
                    ))}
                </MemorySection>
              )}
            </>
          )}
        </div>

        {memory && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
            <button
              type="button"
              onClick={onClear}
              className="font-sans text-[12.5px] text-paper-faint underline-offset-4 transition-colors hover:text-paper hover:underline"
            >
              {liveCopy.clearMemory}
            </button>
            <div className="flex items-center gap-3">
              {saveState === 'saved' && <span className="font-sans text-[12.5px] text-paper-faint">{t.saved}</span>}
              {saveState === 'error' && <span className="font-sans text-[12.5px] text-paper-faint">{t.saveError}</span>}
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saveState === 'saving'}
                className="border border-brass-dim px-4 py-2 font-sans text-[13px] font-medium text-paper transition-colors hover:bg-brass/[0.08] disabled:opacity-50"
              >
                {saveState === 'saving' ? t.saving : t.save}
              </button>
            </div>
          </div>
        )}
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
  const [hasMemory, setHasMemory] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const attachment = useDocumentAttachment(extractDocument, lang)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, status])

  useEffect(() => {
    void hasLiveMemory().then(setHasMemory)
  }, [messages.length])

  // Holt beim Öffnen alle gespeicherten Gespräche nach, die noch nicht in die
  // Erinnerung eingeflossen sind — schrittweise, siehe liveMemorySync.
  useEffect(() => {
    let cancelled = false
    async function run() {
      for (let step = 0; step < 20 && !cancelled; step++) {
        const result = await syncLiveMemoryStep()
        if (!result || result.processed === 0 || result.remaining === 0) break
      }
      if (!cancelled) setHasMemory(await hasLiveMemory())
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleClearMemory() {
    if (!window.confirm(liveCopy.clearMemoryConfirm)) return
    const ok = await clearLiveMemory()
    if (ok) {
      setHasMemory(false)
      setShowMemory(false)
    }
  }

  const memoryPanel = showMemory && (
    <MemoryPanel
      lang={lang}
      onClose={() => setShowMemory(false)}
      onClear={() => void handleClearMemory()}
      onSaved={setHasMemory}
    />
  )

  const overLimit = draft.length > MAX_MESSAGE_LENGTH
  const canSubmit =
    Boolean(draft.trim() || attachment.attachments.length > 0) &&
    attachment.status !== 'uploading' &&
    !overLimit

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || status === 'sending') return
    const content = composeMessageWithAttachments(draft, attachment.attachments)
    send(content)
    setDraft('')
    attachment.clear()
  }

  if (messages.length === 0) {
    const emptyMenuActions: LiveMenuAction[] = [
      { label: liveCopy.memoryView, onClick: () => setShowMemory(true) },
      ...(hasMemory ? [{ label: liveCopy.clearMemory, onClick: () => void handleClearMemory() }] : []),
      { label: liveCopy.logout, onClick: onLogout },
    ]

    return (
      <section className="mx-auto flex min-h-dvh-safe max-w-3xl flex-col justify-center safe-px-sm safe-pt safe-pb py-10 sm:safe-px sm:py-16">
        <LiveTopBar
          lang={lang}
          liveCopy={liveCopy}
          menuActions={emptyMenuActions}
          onToggleLang={onToggleLang}
        />
        {memoryPanel}
        <h1 className="mt-6 font-display text-[1.5rem] font-medium leading-snug text-paper sm:text-[1.75rem]">
          {liveCopy.empty.heading}
        </h1>
        <p className="mt-3 max-w-lg font-sans text-[15px] leading-relaxed text-paper-dim">{liveCopy.empty.body}</p>
        <p className="mt-3 max-w-lg font-sans text-[13px] leading-relaxed text-paper-faint">{liveCopy.memoryNote}</p>
        <ChatInputForm
          lang={lang}
          liveCopy={liveCopy}
          draft={draft}
          setDraft={setDraft}
          attachment={attachment}
          canSubmit={canSubmit}
          status={status}
          onSubmit={handleSubmit}
          variant="empty"
        />

        {savedConversations.length > 0 && (
          <div className="mt-12 border-t border-line-soft pt-6">
            <p className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
              {liveCopy.savedKicker}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {savedConversations.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 border border-line-soft bg-ink-800/30 px-4 py-3.5 sm:px-5"
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

  const activeMenuActions: LiveMenuAction[] = [
    { label: liveCopy.historyButton, onClick: () => setShowHistory(true) },
    { label: liveCopy.newDialog, onClick: reset },
    { label: liveCopy.memoryView, onClick: () => setShowMemory(true) },
    ...(hasMemory ? [{ label: liveCopy.clearMemory, onClick: () => void handleClearMemory() }] : []),
    { label: liveCopy.logout, onClick: onLogout },
  ]

  return (
    <div className="chat-shell chat-shell--live mx-auto flex h-dvh-safe max-w-3xl flex-col overflow-x-hidden safe-px-sm safe-pt sm:safe-px">
      <LiveTopBar
        lang={lang}
        liveCopy={liveCopy}
        showPulse
        menuActions={activeMenuActions}
        onToggleLang={onToggleLang}
      />

      {memoryPanel}

      {showHistory && (
        <HistoryPanel
          lang={lang}
          savedConversations={savedConversations}
          onResume={resumeConversation}
          onDelete={deleteSavedConversation}
          onClose={() => setShowHistory(false)}
        />
      )}

      <div className="chat-column flex min-h-0 flex-1 flex-col">
        <div ref={listRef} className="chat-messages flex-1 overflow-y-auto py-6">
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

        <ChatInputForm
          lang={lang}
          liveCopy={liveCopy}
          draft={draft}
          setDraft={setDraft}
          attachment={attachment}
          canSubmit={canSubmit}
          status={status}
          onSubmit={handleSubmit}
          variant="active"
        />
      </div>
    </div>
  )
}
