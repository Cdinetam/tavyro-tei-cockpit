import { useEffect, useState } from 'react'
import { getCopy, PRIVACY_URL, type Lang } from '../lib/i18n'
import {
  liveLogin,
  liveRegister,
  liveVerifyEmail,
  liveRequestPasswordReset,
  liveResetPassword,
} from '../lib/liveClient'

/**
 * Live-Version-Auth-Bildschirme: Login (Startbildschirm, siehe
 * copy.live.welcome), Registrierung, E-Mail-Bestätigung, Passwort-vergessen,
 * Passwort-Reset. Bewusst im selben visuellen Grundgerüst wie AccessGate.tsx
 * (Logo, zentrierte Karte, Formularstil) — "gleicher Auftritt", nur der
 * Inhalt/die Zugriffslogik unterscheidet sich komplett vom Demo-
 * Zugangscode-Weg.
 */

function Shell({ children, wide = false, lang }: { children: React.ReactNode; wide?: boolean; lang: Lang }) {
  const copy = getCopy(lang).live
  return (
    <div className="grain flex min-h-screen items-center justify-center bg-ink-900 px-6 py-12">
      <div className={`w-full ${wide ? 'max-w-md' : 'max-w-sm'} fade-in`}>
        <div className="flex items-center gap-3">
          <img src="/tavyro-logo.png" alt="TaVyro" className="h-10 w-auto" />
          <span className="font-sans text-[12px] text-paper-faint">
            TaVyro Executive Intelligence<sup className="text-[8px]">®</sup> (TEI) – Trust Room
          </span>
        </div>
        {children}
        <p className="mt-8 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint/70">
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

function TrustBox({ lang }: { lang: Lang }) {
  const copy = getCopy(lang).live.welcome
  return (
    <div className="mt-8 border border-line-strong bg-ink-800/50 p-6">
      <p className="font-mono text-[10.5px] uppercase tracking-widest2 text-brass-light">{copy.kicker}</p>
      <h1 className="mt-3 font-display text-2xl font-medium leading-snug text-paper">{copy.heading}</h1>
      <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.body}</p>
      <ul className="mt-5 flex flex-col gap-2">
        {copy.trustPoints.map((point) => (
          <li key={point} className="flex items-start gap-2.5 font-sans text-[13px] leading-snug text-paper-dim">
            <span className="mt-0.5 text-brass-light">✓</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface LoginProps {
  lang: Lang
  onLoginSuccess: () => void
  onNavigateRegister: () => void
  onNavigateForgotPassword: () => void
}

export function LiveLoginScreen({ lang, onLoginSuccess, onNavigateRegister, onNavigateForgotPassword }: LoginProps) {
  const copy = getCopy(lang).live
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setStatus('checking')
    const result = await liveLogin(email.trim(), password, lang)
    if (result.status === 'ok') {
      onLoginSuccess()
    } else {
      setErrorMessage(result.message)
      setStatus('error')
    }
  }

  return (
    <Shell wide lang={lang}>
      <TrustBox lang={lang} />
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          autoFocus
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder={copy.login.emailPlaceholder}
          className="w-full border border-line bg-ink-800/60 px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder={copy.login.passwordPlaceholder}
          className="w-full border border-line bg-ink-800/60 px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim"
        />
        {status === 'error' && <p className="font-sans text-[13px] text-paper-dim">{errorMessage}</p>}
        <button
          type="submit"
          disabled={status === 'checking' || !email.trim() || !password}
          className="w-full border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-paper-faint"
        >
          {status === 'checking' ? copy.login.checking : copy.login.submit}
        </button>
      </form>
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={onNavigateForgotPassword}
          className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
        >
          {copy.login.forgotPasswordLink}
        </button>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line-soft" />
      </div>
      <p className="mt-4 font-sans text-[13px] text-paper-faint">
        {copy.login.registerPrompt}{' '}
        <button onClick={onNavigateRegister} className="text-brass-light transition-colors hover:text-paper">
          {copy.login.registerLink}
        </button>
      </p>
    </Shell>
  )
}

export function LiveRegisterScreen({ lang, onNavigateLogin }: { lang: Lang; onNavigateLogin: () => void }) {
  const copy = getCopy(lang).live
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'checking' | 'error' | 'sent'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password || !acceptedPrivacy) return
    setStatus('checking')
    const result = await liveRegister(email.trim(), password, lang)
    if (result.status === 'ok') {
      setStatus('sent')
    } else {
      setErrorMessage(result.message)
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <Shell lang={lang}>
        <p className="mt-8 font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{copy.register.kicker}</p>
        <h1 className="mt-3 font-display text-2xl font-medium leading-snug text-paper">{copy.register.successHeading}</h1>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">
          {copy.register.successBody(email.trim())}
        </p>
        <button
          onClick={onNavigateLogin}
          className="mt-6 w-full border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
        >
          {copy.register.loginLink}
        </button>
      </Shell>
    )
  }

  return (
    <Shell lang={lang}>
      <p className="mt-8 font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{copy.register.kicker}</p>
      <h1 className="mt-3 font-display text-2xl font-medium leading-snug text-paper">{copy.register.heading}</h1>
      <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.register.body}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          autoFocus
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder={copy.register.emailPlaceholder}
          className="w-full border border-line bg-ink-800/60 px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim"
        />
        <div>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (status === 'error') setStatus('idle')
            }}
            placeholder={copy.register.passwordPlaceholder}
            className="w-full border border-line bg-ink-800/60 px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim"
          />
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint/70">
            {copy.register.passwordHint}
          </p>
        </div>
        <label className="flex items-start gap-2.5 font-sans text-[13px] leading-snug text-paper-dim">
          <input
            type="checkbox"
            required
            checked={acceptedPrivacy}
            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 border-line bg-ink-800/60 accent-brass"
          />
          <span>
            {copy.register.privacyBefore}
            <a
              href={PRIVACY_URL[lang]}
              target="_blank"
              rel="noreferrer"
              className="text-brass-light underline decoration-brass-dim/50 underline-offset-2 transition-colors hover:text-paper"
            >
              {copy.register.privacyLinkText}
            </a>
            {copy.register.privacyAfter}
          </span>
        </label>
        {status === 'error' && <p className="font-sans text-[13px] text-paper-dim">{errorMessage}</p>}
        <button
          type="submit"
          disabled={status === 'checking' || !email.trim() || password.length < 8 || !acceptedPrivacy}
          className="w-full border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-paper-faint"
        >
          {status === 'checking' ? copy.register.checking : copy.register.submit}
        </button>
      </form>
      <p className="mt-6 font-sans text-[13px] text-paper-faint">
        {copy.register.loginPrompt}{' '}
        <button onClick={onNavigateLogin} className="text-brass-light transition-colors hover:text-paper">
          {copy.register.loginLink}
        </button>
      </p>
    </Shell>
  )
}

export function LiveVerifyScreen({ lang, token, onNavigateLogin }: { lang: Lang; token: string; onNavigateLogin: () => void }) {
  const copy = getCopy(lang).live.verify
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    liveVerifyEmail(token, lang).then((result) => {
      setStatus(result.status === 'ok' ? 'success' : 'error')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Shell lang={lang}>
      {status === 'checking' && <p className="mt-8 font-sans text-[14px] text-paper-faint">{copy.checking}</p>}
      {status === 'success' && (
        <>
          <h1 className="mt-8 font-display text-2xl font-medium leading-snug text-paper">{copy.successHeading}</h1>
          <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.successBody}</p>
          <button
            onClick={onNavigateLogin}
            className="mt-6 w-full border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
          >
            {copy.loginButton}
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="mt-8 font-display text-2xl font-medium leading-snug text-paper">{copy.errorHeading}</h1>
          <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.errorBody}</p>
        </>
      )}
    </Shell>
  )
}

export function LiveForgotPasswordScreen({ lang, onNavigateLogin }: { lang: Lang; onNavigateLogin: () => void }) {
  const copy = getCopy(lang).live.forgotPassword
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'sent'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('checking')
    await liveRequestPasswordReset(email.trim(), lang)
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <Shell lang={lang}>
        <h1 className="mt-8 font-display text-2xl font-medium leading-snug text-paper">{copy.sentHeading}</h1>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.sentBody}</p>
        <button
          onClick={onNavigateLogin}
          className="mt-6 font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
        >
          {copy.backToLogin}
        </button>
      </Shell>
    )
  }

  return (
    <Shell lang={lang}>
      <p className="mt-8 font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{copy.kicker}</p>
      <h1 className="mt-3 font-display text-2xl font-medium leading-snug text-paper">{copy.heading}</h1>
      <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.body}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.emailPlaceholder}
          className="w-full border border-line bg-ink-800/60 px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim"
        />
        <button
          type="submit"
          disabled={status === 'checking' || !email.trim()}
          className="w-full border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-paper-faint"
        >
          {status === 'checking' ? copy.checking : copy.submit}
        </button>
      </form>
      <button
        onClick={onNavigateLogin}
        className="mt-6 font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
      >
        {copy.backToLogin}
      </button>
    </Shell>
  )
}

export function LiveResetPasswordScreen({
  lang,
  token,
  onNavigateLogin,
}: {
  lang: Lang
  token: string
  onNavigateLogin: () => void
}) {
  const copy = getCopy(lang).live.resetPassword
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8 || !token) return
    setStatus('checking')
    const result = await liveResetPassword(token, password, lang)
    if (result.status === 'ok') {
      setStatus('success')
    } else {
      setErrorMessage(result.message)
      setStatus('error')
    }
  }

  if (!token || status === 'error') {
    return (
      <Shell lang={lang}>
        <h1 className="mt-8 font-display text-2xl font-medium leading-snug text-paper">{copy.errorHeading}</h1>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{errorMessage || copy.errorBody}</p>
        <button
          onClick={onNavigateLogin}
          className="mt-6 w-full border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
        >
          {copy.loginButton}
        </button>
      </Shell>
    )
  }

  if (status === 'success') {
    return (
      <Shell lang={lang}>
        <h1 className="mt-8 font-display text-2xl font-medium leading-snug text-paper">{copy.successHeading}</h1>
        <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.successBody}</p>
        <button
          onClick={onNavigateLogin}
          className="mt-6 w-full border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
        >
          {copy.loginButton}
        </button>
      </Shell>
    )
  }

  return (
    <Shell lang={lang}>
      <p className="mt-8 font-mono text-[11px] uppercase tracking-widest2 text-brass-light">{copy.kicker}</p>
      <h1 className="mt-3 font-display text-2xl font-medium leading-snug text-paper">{copy.heading}</h1>
      <p className="mt-3 font-sans text-[14px] leading-relaxed text-paper-faint">{copy.body}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="password"
          autoFocus
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={copy.passwordPlaceholder}
          className="w-full border border-line bg-ink-800/60 px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim"
        />
        <button
          type="submit"
          disabled={status === 'checking' || password.length < 8}
          className="w-full border border-brass-dim bg-brass/[0.08] px-5 py-3 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-paper-faint"
        >
          {status === 'checking' ? copy.checking : copy.submit}
        </button>
      </form>
    </Shell>
  )
}
