import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Landing } from './components/Landing'
import { TrustRoomChat, ExitConfirmDialog } from './components/TrustRoomChat'
import {
  LiveLoginScreen,
  LiveRegisterScreen,
  LiveVerifyScreen,
  LiveActivateScreen,
  LiveForgotPasswordScreen,
  LiveResetPasswordScreen,
} from './components/LiveAuth'
import { LiveChat } from './components/LiveChat'
import { useTrustRoomChat } from './hooks/useTrustRoomChat'
import { useLiveChat } from './hooks/useLiveChat'
import { getLiveToken, liveLogout } from './lib/liveClient'
import { applyDocumentMeta, detectInitialLang, getLangFromPath, hasEnPrefix, type Lang } from './lib/i18n'

// Live-Version-Views (siehe LiveAuth.tsx/LiveChat.tsx) sind bewusst
// unabhängig vom Demo-Zugangscode-Gate (siehe AccessGate.tsx: /live-Pfade
// überspringen dieses Gate komplett und rendern direkt App, das dann selbst
// über den Sitzungs-Token entscheidet) — eigenes, offenes Login/Register
// statt Zugangscode, keine Limits, kein Cliffhanger, siehe api/src/functions
// /live*.ts.
type View =
  | 'landing'
  | 'room'
  | 'liveLogin'
  | 'liveRegister'
  | 'liveVerify'
  | 'liveActivate'
  | 'liveForgotPassword'
  | 'liveResetPassword'
  | 'liveRoom'

// Der echte, mehrteilige Trust-Room-Gespräch-Flow bekommt eine eigene URL
// (/gespraech), damit er direkt verlinkt/geteilt werden kann. Er ist der
// einzige Live-KI-Flow — sowohl die frühere Einmal-Analyse-Demo als auch
// die statische Referenzfälle-Ansicht wurden bewusst entfernt
// (Produktentscheidung: der Dialog ist strikt überlegen, eine parallele,
// stilistisch inkonsistente Ansicht — Konfidenzwerte, Hypothesen-Raster —
// verwässert nur die Stimme des Trust Room, siehe Diskussion). Die
// zugehörigen Dateien (ScenarioInput.tsx, AnalysisView.tsx, scenarios.ts,
// useAnalysis.ts etc.) sind NICHT gelöscht (Sandbox-rm-Probleme), aber hier
// nicht mehr eingebunden — toter Code, kann bei Gelegenheit bereinigt
// werden. Azure SWA leitet via staticwebapp.config.json
// (navigationFallback) jeden Pfad auf index.html um, ein Deep-Link auf
// /gespraech funktioniert also direkt.
//
// Englische Demo-Version (siehe Diskussion): eigener Pfad-Präfix /en statt
// nur In-App-Umschaltung, damit sich die englische Version von aussen
// direkt verlinken lässt (z.B. von einer künftigen EN-Homepage) und beim
// Teilen/Reload erhalten bleibt. /en → englische Landing, /en/gespraech →
// englischer Gespräch-Flow. lang steuert sowohl die UI-Texte (src/lib/
// i18n.ts) als auch den an das Backend mitgeschickten System-Prompt (siehe
// api/src/lib/prompt.ts → getChatSystemPrompt).
// hasEnPrefix/getLangFromPath leben zentral in src/lib/i18n.ts (statt hier
// dupliziert), damit AccessGate.tsx — das in main.tsx VOR App.tsx rendert
// und daher nicht auf Apps State zugreifen kann — dieselbe Grenzprüfung für
// den /en-Pfad-Präfix verwendet, ohne dass beide Stellen auseinanderdriften
// können.
function pathToView(pathname: string): View {
  const withoutLangPrefix = hasEnPrefix(pathname) ? pathname.slice(3) : pathname
  if (withoutLangPrefix === '/live' || withoutLangPrefix === '/live/') return 'liveLogin'
  if (withoutLangPrefix.startsWith('/live/register')) return 'liveRegister'
  if (withoutLangPrefix.startsWith('/live/verify')) return 'liveVerify'
  if (withoutLangPrefix.startsWith('/live/activate')) return 'liveActivate'
  if (withoutLangPrefix.startsWith('/live/forgot-password')) return 'liveForgotPassword'
  if (withoutLangPrefix.startsWith('/live/reset-password')) return 'liveResetPassword'
  if (withoutLangPrefix.startsWith('/live/gespraech')) return 'liveRoom'
  return withoutLangPrefix.startsWith('/gespraech') ? 'room' : 'landing'
}

const LIVE_VIEW_PATHS: Partial<Record<View, string>> = {
  liveLogin: '/live',
  liveRegister: '/live/register',
  liveVerify: '/live/verify',
  liveActivate: '/live/activate',
  liveForgotPassword: '/live/forgot-password',
  liveResetPassword: '/live/reset-password',
  liveRoom: '/live/gespraech',
}

function buildPath(lang: Lang, view: View): string {
  const base = LIVE_VIEW_PATHS[view] ?? (view === 'room' ? '/gespraech' : '/')
  if (lang !== 'en') return base
  return base === '/' ? '/en' : `/en${base}`
}

/** Liest den ?token=-Query-Parameter aus der aktuellen URL — genutzt von
 * /live/verify (E-Mail-Bestätigung) und /live/reset-password
 * (Passwort-Reset), beide verlinkt aus den entsprechenden E-Mails (siehe
 * emailSender.ts). */
function tokenFromQuery(): string {
  return new URLSearchParams(window.location.search).get('token') ?? ''
}

// Wohin nach einer Bestätigung (Speichern-Dialog) navigiert werden soll —
// "toLanding" für Header-Logo/Zurück-zum-Start, "newChat" für den
// "Neuer Dialog"-Button innerhalb des Trust Rooms selbst.
type PendingExit = 'toLanding' | 'newChat' | null

export default function App() {
  const [view, setView] = useState<View>(() => pathToView(window.location.pathname))
  // Erstaufruf: siehe detectInitialLang in i18n.ts (explizite /en-URL hat
  // Vorrang, sonst Browsersprache als Fallback — deckungsgleich mit
  // AccessGate.tsx, das denselben Pfad schon vorher gesehen hat). Bei
  // späterer Browser-Navigation (popstate unten) zählt dagegen bewusst nur
  // noch die URL selbst, siehe getLangFromPath.
  const [lang, setLang] = useState<Lang>(() => detectInitialLang(window.location.pathname))
  const [prefill, setPrefill] = useState('')
  const [pendingExit, setPendingExit] = useState<PendingExit>(null)
  // Ob gerade eine gültige Live-Sitzung vorliegt (siehe liveClient.ts,
  // localStorage-Token) — bewusst als eigener State statt bei jedem Render
  // neu aus localStorage gelesen, damit ein Login/Logout sofort einen
  // Re-Render auslöst.
  const [liveLoggedIn, setLiveLoggedIn] = useState(() => getLiveToken().length > 0)

  const roomChat = useTrustRoomChat(lang)
  const liveChat = useLiveChat(lang)

  useEffect(() => {
    function onPopState() {
      setView(pathToView(window.location.pathname))
      setLang(getLangFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Schützt /live/gespraech: ohne gültige Sitzung zurück zum Live-Login,
  // statt eine leere/fehlerhafte Chat-Ansicht zu zeigen. replaceState (statt
  // pushState/goToLiveView) lässt dabei bewusst keinen zusätzlichen
  // Zurück-Schritt entstehen.
  useEffect(() => {
    if (view === 'liveRoom' && !liveLoggedIn) {
      window.history.replaceState({}, '', buildPath(lang, 'liveLogin'))
      setView('liveLogin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, liveLoggedIn])

  // Hält html[lang]/Title/Meta-Description synchron mit lang — sowohl beim
  // ersten Rendern nach der Zugangscode-Gate (siehe AccessGate.tsx, das
  // dasselbe schon vorher für die Gate-Seite selbst setzt) als auch bei
  // jedem D | EN-Wechsel im Header (toggleLang unten).
  useEffect(() => {
    applyDocumentMeta(lang)
  }, [lang])

  // Warnt beim Schliessen/Neuladen des Tabs, solange ein ungesichertes
  // Gespräch offen ist — der Browser zeigt dabei einen generischen, nicht
  // anpassbaren Hinweis (Standardverhalten, kein individueller Text möglich).
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (view === 'room' && roomChat.messages.length > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [view, roomChat.messages.length])

  function goToRoom(text?: string) {
    setPrefill(text ?? '')
    window.history.pushState({}, '', buildPath(lang, 'room'))
    setView('room')
  }

  function doFullReset() {
    window.history.pushState({}, '', buildPath(lang, 'landing'))
    setView('landing')
    setPrefill('')
  }

  // D | EN-Umschaltung im Header — wechselt nur den Pfad-Präfix, View
  // (Landing/Room) bleibt erhalten, damit z.B. ein laufendes Gespräch beim
  // Sprachwechsel nicht verloren geht (der Gesprächsverlauf selbst wird
  // dadurch nicht übersetzt, nur künftige Antworten laufen dann auf
  // Englisch).
  function toggleLang() {
    const nextLang: Lang = lang === 'en' ? 'de' : 'en'
    window.history.pushState({}, '', buildPath(nextLang, view))
    setLang(nextLang)
  }

  // Zurück zum Start — fragt erst nach, falls im Trust Room ein
  // ungesichertes Gespräch offen ist (siehe ExitConfirmDialog).
  function resetAll() {
    if (view === 'room' && roomChat.messages.length > 0) {
      setPendingExit('toLanding')
      return
    }
    roomChat.reset()
    doFullReset()
  }

  // "Neuer Dialog"-Button innerhalb des Trust Rooms — bleibt in der
  // Ansicht, fragt aber ebenfalls erst nach, falls etwas verloren ginge.
  function requestNewRoomChat() {
    if (roomChat.messages.length > 0) {
      setPendingExit('newChat')
    } else {
      roomChat.reset()
    }
  }

  // Navigation zwischen den Live-Bildschirmen (Login/Register/Verify/
  // Passwort-vergessen/Reset/Room) — bewusst simpel gehalten, da hier (im
  // Unterschied zum Demo-Flow) kein ungespeichertes-Gespräch-Dialog nötig
  // ist: Live-Gespräche sind ja immer schon serverseitig gespeichert.
  function goToLiveView(nextView: View) {
    window.history.pushState({}, '', buildPath(lang, nextView))
    setView(nextView)
  }

  function handleLiveLoginSuccess() {
    setLiveLoggedIn(true)
    goToLiveView('liveRoom')
  }

  async function handleLiveLogout() {
    await liveLogout()
    setLiveLoggedIn(false)
    liveChat.reset()
    goToLiveView('liveLogin')
  }

  function confirmPendingExit(withSave: boolean) {
    if (withSave) {
      roomChat.saveAndReset()
    } else {
      roomChat.reset()
    }
    if (pendingExit === 'toLanding') {
      doFullReset()
    }
    setPendingExit(null)
  }

  const headerStage = view === 'room' ? 'room' : 'landing'
  const isLiveView =
    view === 'liveLogin' ||
    view === 'liveRegister' ||
    view === 'liveVerify' ||
    view === 'liveActivate' ||
    view === 'liveForgotPassword' ||
    view === 'liveResetPassword' ||
    view === 'liveRoom'

  // Live-Bildschirme bringen ihr eigenes Logo/Branding mit (siehe
  // LiveAuth.tsx → Shell, LiveChat.tsx-Kopfzeile) — der globale <Header>
  // (mit Demo-spezifischem "Dialog starten"/Buchungs-Link) würde hier nur
  // doppelt und fehl am Platz wirken, deshalb komplett übersprungen.
  if (isLiveView) {
    return (
      <div className="grain min-h-screen bg-ink-900">
        {view === 'liveLogin' && (
          <LiveLoginScreen
            lang={lang}
            onLoginSuccess={handleLiveLoginSuccess}
            onNavigateRegister={() => goToLiveView('liveRegister')}
            onNavigateForgotPassword={() => goToLiveView('liveForgotPassword')}
            onNavigateActivate={() => goToLiveView('liveActivate')}
          />
        )}
        {view === 'liveRegister' && (
          <LiveRegisterScreen lang={lang} onNavigateLogin={() => goToLiveView('liveLogin')} />
        )}
        {view === 'liveVerify' && (
          <LiveVerifyScreen lang={lang} token={tokenFromQuery()} onNavigateLogin={() => goToLiveView('liveLogin')} />
        )}
        {view === 'liveActivate' && (
          <LiveActivateScreen lang={lang} onNavigateLogin={() => goToLiveView('liveLogin')} />
        )}
        {view === 'liveForgotPassword' && (
          <LiveForgotPasswordScreen lang={lang} onNavigateLogin={() => goToLiveView('liveLogin')} />
        )}
        {view === 'liveResetPassword' && (
          <LiveResetPasswordScreen
            lang={lang}
            token={tokenFromQuery()}
            onNavigateLogin={() => goToLiveView('liveLogin')}
          />
        )}
        {view === 'liveRoom' && liveLoggedIn && (
          <LiveChat
            lang={lang}
            messages={liveChat.messages}
            status={liveChat.status}
            errorMessage={liveChat.errorMessage}
            savedConversations={liveChat.savedConversations}
            send={liveChat.send}
            reset={liveChat.reset}
            resumeConversation={liveChat.resumeConversation}
            deleteSavedConversation={liveChat.deleteSavedConversation}
            onLogout={handleLiveLogout}
          />
        )}
      </div>
    )
  }

  return (
    <div className="grain min-h-screen bg-ink-900">
      <Header stage={headerStage} lang={lang} onToggleLang={toggleLang} onReset={resetAll} />
      <div className="pt-14">
        {view === 'landing' && (
          <Landing lang={lang} onStart={(text) => goToRoom(text)} onNavigateLive={() => goToLiveView('liveLogin')} />
        )}

        {view === 'room' && (
          <TrustRoomChat
            lang={lang}
            messages={roomChat.messages}
            status={roomChat.status}
            errorMessage={roomChat.errorMessage}
            savedConversations={roomChat.savedConversations}
            initialDraft={prefill}
            weeklyLimit={roomChat.weeklyLimit}
            send={roomChat.send}
            resumeConversation={roomChat.resumeConversation}
            deleteSavedConversation={roomChat.deleteSavedConversation}
            onRequestNewChat={requestNewRoomChat}
            onExit={resetAll}
          />
        )}

        {pendingExit && (
          <ExitConfirmDialog
            lang={lang}
            onSaveAndLeave={() => confirmPendingExit(true)}
            onLeaveWithoutSaving={() => confirmPendingExit(false)}
            onCancel={() => setPendingExit(null)}
          />
        )}
      </div>
    </div>
  )
}
