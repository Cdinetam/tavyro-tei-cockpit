import { useState, type ReactNode } from 'react'
import { verifyAccessCode, storeAccessCode, getStoredAccessCode } from '../lib/aiClient'
import { getCopy, getLangFromPath } from '../lib/i18n'

interface Props {
  children: ReactNode
}

export function AccessGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState(() => getStoredAccessCode().length > 0)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'invalid'>('idle')
  // AccessGate rendert in main.tsx VOR App.tsx (siehe dort) — hat also
  // keinen Zugriff auf Apps view/lang-State. Ermittelt die Sprache deshalb
  // selbst, einmalig beim ersten Rendern, direkt aus der URL (gleiche
  // Logik wie App.tsx, siehe src/lib/i18n.ts → getLangFromPath), damit ein
  // Deep-Link auf /en/gespraech auch die Zugangscode-Gate auf Englisch
  // zeigt statt immer Deutsch. Muss vor dem frühen Return unten stehen
  // (Rules of Hooks: Hooks dürfen nicht bedingt aufgerufen werden).
  const [lang] = useState(() => getLangFromPath(window.location.pathname))

  if (unlocked) return <>{children}</>

  const copy = getCopy(lang)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim().length === 0) return
    setStatus('checking')
    const valid = await verifyAccessCode(code.trim())
    if (valid) {
      storeAccessCode(code.trim())
      setUnlocked(true)
    } else {
      setStatus('invalid')
    }
  }

  return (
    <div className="grain flex min-h-screen items-center justify-center bg-ink-900 px-6">
      <div className="w-full max-w-sm fade-in">
        <div className="flex items-center gap-3">
          <img src="/tavyro-logo.png" alt="TaVyro" className="h-10 w-auto" />
          <span className="font-sans text-[12px] text-paper-faint">
            TaVyro Executive Intelligence<sup className="text-[8px]">®</sup> (TEI) – Trust Room
          </span>
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
          {copy.gate.kicker}
        </p>
        <h1 className="mt-3 font-display text-2xl font-medium leading-snug text-paper">{copy.gate.heading}</h1>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.gate.body}</p>
        <p className="mt-2 font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
          {copy.gate.noCode}
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <input
            type="password"
            autoFocus
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setStatus('idle')
            }}
            placeholder={copy.gate.inputPlaceholder}
            className="w-full border border-line bg-ink-800/60 px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim"
          />
          {status === 'invalid' && (
            <p className="mt-2 font-sans text-[13px] text-paper-dim">{copy.gate.invalidCode}</p>
          )}
          <button
            type="submit"
            disabled={status === 'checking' || code.trim().length === 0}
            className="mt-4 w-full border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-paper-faint"
          >
            {status === 'checking' ? copy.gate.checking : copy.gate.submit}
          </button>
        </form>

        <p className="mt-8 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint/70">
          {copy.gate.footer}
        </p>
      </div>
    </div>
  )
}
