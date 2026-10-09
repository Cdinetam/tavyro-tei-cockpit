import { useEffect, useRef, useState } from 'react'
import { storeAccessCode } from '../lib/aiClient'
import { campaignCodeFromLocation } from '../lib/campaignAccess'
import { BOOKING_URL, CONTACT_EMAIL, getCopy, hasEnPrefix, PRIVACY_URL, TAVYRO_URL, type Lang } from '../lib/i18n'

// Wie aiClient.ts: leerer String zählt als "kein Backend" — hier aber
// fail-closed (kein Fake-Unlock), sonst landet man im Chat mit einem
// Code, den /api/chat anschliessend mit 401 ablehnt.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'

/**
 * Gate für die physische Karte-Kampagne (Track 3).
 * Kurze URLs: /k , /k/CODE , /karte , /karte/CODE
 * Alias: /live/zugang?code=…
 * Nach OK → /gespraech (7er-Limit + Cliffhanger).
 */

function codeFromLocation(): string {
  return campaignCodeFromLocation()
}

async function readCampaignStatus(response: Response): Promise<'ok' | 'invalid' | 'network'> {
  // Nur echtes JSON mit status:ok akzeptieren — SWA kann bei fehlender
  // Function-Route sonst index.html mit HTTP 200 liefern, was fälschlich
  // als Freischaltung wirkte (Chat danach 401).
  try {
    const data = (await response.json()) as { status?: string }
    if (response.ok && data.status === 'ok') return 'ok'
    return 'invalid'
  } catch {
    return response.ok ? 'invalid' : 'network'
  }
}

async function lookupCampaignCode(
  code: string,
): Promise<'ok' | 'invalid' | 'network'> {
  try {
    const params = new URLSearchParams({ code })
    const response = await fetch(`${API_BASE_URL}/campaign-access?${params.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
    })
    return readCampaignStatus(response)
  } catch {
    return 'network'
  }
}

async function redeemCampaignCode(code: string): Promise<'ok' | 'invalid' | 'network'> {
  try {
    const response = await fetch(`${API_BASE_URL}/campaign-access`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    return readCampaignStatus(response)
  } catch {
    return 'network'
  }
}

interface Props {
  lang: Lang
  onToggleLang: () => void
}

export function CardCampaignGate({ lang, onToggleLang }: Props) {
  const copy = getCopy(lang).cardCampaign
  const [code, setCode] = useState(() => codeFromLocation())
  const [showCode, setShowCode] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'invalid' | 'network'>('idle')
  const [lookupHint, setLookupHint] = useState<'idle' | 'ok' | 'invalid'>('idle')
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fromLocation = codeFromLocation().trim().toLowerCase()
    if (!fromLocation) return

    let cancelled = false
    void (async () => {
      const result = await lookupCampaignCode(fromLocation)
      if (cancelled) return
      if (result === 'ok') setLookupHint('ok')
      else if (result === 'invalid') setLookupHint('invalid')
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function unlock(rawCode: string) {
    const normalized = rawCode.trim().toLowerCase()
    if (!normalized) return
    setStatus('checking')
    const result = await redeemCampaignCode(normalized)
    if (result === 'ok') {
      storeAccessCode(normalized, 'campaign')
      const prefix = hasEnPrefix(window.location.pathname) ? '/en' : ''
      window.location.assign(`${prefix}/gespraech`)
      return
    }
    setStatus(result === 'network' ? 'network' : 'invalid')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await unlock(code)
  }

  return (
    <div className="grain min-h-dvh-safe overflow-x-hidden bg-ink-900 safe-inset">
      <div className="mx-auto w-full max-w-2xl px-5 py-8 fade-in sm:py-12">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/tavyro-logo.png" alt="TaVyro" className="h-10 w-auto shrink-0" />
            <span className="hidden min-w-0 font-sans text-[12px] leading-snug text-paper-faint sm:inline">
              TaVyro Executive Intelligence<sup className="text-[8px]">®</sup> (TEI) – Trust Room
            </span>
          </div>
          <button
            onClick={onToggleLang}
            aria-label={getCopy(lang).header.langToggleAria}
            className="flex shrink-0 items-center gap-1 font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            <span className={lang === 'de' ? 'text-paper' : undefined}>DE</span>
            <span aria-hidden="true">|</span>
            <span className={lang === 'en' ? 'text-paper' : undefined}>EN</span>
          </button>
        </div>

        <section className="mt-12 sm:mt-16">
          <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{copy.kicker}</p>
          <h1 className="mt-4 font-display text-[1.75rem] font-medium leading-snug text-paper sm:text-[2.1rem]">
            {copy.heading}
          </h1>
          <p className="mt-5 max-w-xl font-sans text-[16px] font-semibold leading-relaxed text-paper">{copy.lead}</p>
          <p className="mt-3 max-w-xl font-sans text-[15px] leading-relaxed text-paper-dim">{copy.body}</p>
        </section>

        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {copy.trustPoints.map((point) => (
            <li key={point.title} className="border border-line-soft bg-ink-800/40 p-4">
              <p className="flex items-center gap-2 font-sans text-[13px] font-medium text-paper">
                <span className="text-brass-light">✓</span>
                {point.title}
              </p>
              <p className="mt-2 font-sans text-[12.5px] leading-snug text-paper-faint">{point.text}</p>
            </li>
          ))}
        </ul>

        <section className="mt-10 border border-brass-dim bg-ink-800/60 p-6 shadow-panel sm:p-8">
          <h2 className="font-display text-xl font-medium text-paper">{copy.ctaHeading}</h2>
          <p className="mt-2 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.ctaBody}</p>

          {lookupHint === 'invalid' && (
            <p className="mt-4 font-sans text-[13px] text-paper-dim">{copy.invalidCode}</p>
          )}

          <form onSubmit={handleSubmit} className="mt-6">
            <div className="relative">
              <input
                ref={codeInputRef}
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setStatus('idle')
                  setLookupHint('idle')
                }}
                placeholder={copy.inputPlaceholder}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus={!codeFromLocation()}
                className="w-full border border-line bg-ink-900/60 px-4 py-3 pr-14 font-sans text-[16px] text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim sm:text-[15px]"
              />
              <button
                type="button"
                onClick={() => setShowCode((open) => !open)}
                aria-label={showCode ? copy.hideCodeAria : copy.showCodeAria}
                aria-pressed={showCode}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
              >
                {showCode ? copy.hideCodeLabel : copy.showCodeLabel}
              </button>
            </div>
            {status === 'invalid' && (
              <p className="mt-2 font-sans text-[13px] text-paper-dim">{copy.invalidCode}</p>
            )}
            {status === 'network' && (
              <p className="mt-2 font-sans text-[13px] text-paper-dim">{copy.networkError}</p>
            )}
            <button
              type="submit"
              disabled={status === 'checking' || code.trim().length === 0}
              className="mt-4 w-full border border-brass bg-gradient-to-b from-brass/[0.2] to-brass/[0.08] px-6 py-3.5 font-sans text-[15px] font-medium text-paper transition-all duration-300 ease-editorial hover:from-brass/[0.28] hover:to-brass/[0.12] disabled:cursor-not-allowed disabled:border-line disabled:from-transparent disabled:to-transparent disabled:text-paper-faint"
            >
              {status === 'checking' ? copy.checking : copy.submit}
            </button>
          </form>
        </section>

        <section className="mt-14 border-t border-line-soft pt-10">
          <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{copy.chroKicker}</p>
          <h2 className="mt-3 font-display text-xl font-medium text-paper">{copy.chroHeading}</h2>
          <p className="mt-3 max-w-xl font-sans text-[14.5px] leading-relaxed text-paper-dim">{copy.chroBody}</p>
          <a
            href={TAVYRO_URL[lang]}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block font-sans text-[14px] text-brass-light underline decoration-brass-dim underline-offset-4 transition-colors hover:text-paper"
          >
            {copy.chroLink}
          </a>
        </section>

        <section className="mt-12 border-t border-line-soft pt-10">
          <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{copy.contactKicker}</p>
          <h2 className="mt-3 font-display text-xl font-medium text-paper">{copy.contactHeading}</h2>
          <p className="mt-3 font-sans text-[14.5px] leading-relaxed text-paper-dim">{copy.contactBody}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <a
              href={BOOKING_URL[lang]}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
            >
              {copy.bookingCta}
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-sans text-[14px] text-paper-dim underline decoration-paper-faint/40 underline-offset-4 transition-colors hover:text-paper"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </section>

        <p className="mt-14 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint/70">
          {copy.footer} ·{' '}
          <a
            href={PRIVACY_URL[lang]}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-paper-faint/40 underline-offset-2 transition-colors hover:text-paper"
          >
            {copy.privacyLinkText}
          </a>
        </p>
      </div>
    </div>
  )
}
