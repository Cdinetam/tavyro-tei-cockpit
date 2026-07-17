import { useState } from 'react'
import { submitLead } from '../lib/aiClient'

const BOOKING_URL = 'https://tavyro.ch/de/erstgespraech-buchen'

interface Props {
  teaser: string
  question: string
}

export function LockedDecisionCard({ teaser, question }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    const res = await submitLead({ email: email.trim(), question })
    setStatus(res.status === 'ok' ? 'sent' : 'error')
  }

  return (
    <div className="mt-10 border border-dashed border-brass-dim/70 bg-ink-800/50 p-7 sm:p-8">
      <div className="flex items-center gap-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-[2px] border border-brass-dim text-[10px] text-brass-light">
          ⊘
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
          Für das persönliche Gespräch
        </span>
      </div>

      <p className="mt-4 max-w-xl font-display text-[18px] italic leading-relaxed text-paper-dim">
        {teaser}
      </p>

      <div className="mt-6 h-px bg-line-soft" />

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-sans text-[13.5px] leading-relaxed text-paper-dim">
            Diese Einordnung entsteht im Gespräch, nicht im Cockpit.
          </p>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
          >
            Erstgespräch buchen →
          </a>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-2 sm:items-end">
          {status === 'sent' ? (
            <p className="font-sans text-[13px] text-paper-dim">
              Danke. Tam Nguyen meldet sich persönlich bei Ihnen.
            </p>
          ) : (
            <>
              <label
                htmlFor="lead-email"
                className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint"
              >
                Oder: mit wem darf ich mich melden?
              </label>
              <div className="flex w-full gap-2">
                <input
                  id="lead-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre@firma.ch"
                  className="w-full border border-line bg-ink-900/60 px-3 py-2 font-sans text-[13px] text-paper placeholder:text-paper-faint/70 focus:border-brass-dim"
                />
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="shrink-0 border border-line-strong px-3 py-2 font-sans text-[12.5px] text-paper-dim transition-colors hover:border-brass-dim hover:text-paper disabled:opacity-50"
                >
                  {status === 'sending' ? '…' : 'Senden'}
                </button>
              </div>
              {status === 'error' && (
                <p className="font-sans text-[12px] text-paper-faint">
                  Das hat gerade nicht geklappt — bitte direkt über den Button links buchen.
                </p>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  )
}
