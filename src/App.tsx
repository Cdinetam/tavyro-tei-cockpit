import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Landing } from './components/Landing'
import { TrustRoomChat, ExitConfirmDialog } from './components/TrustRoomChat'
import { useTrustRoomChat } from './hooks/useTrustRoomChat'
import { getLangFromPath, hasEnPrefix, type Lang } from './lib/i18n'

type View = 'landing' | 'room'

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
  return withoutLangPrefix.startsWith('/gespraech') ? 'room' : 'landing'
}

function buildPath(lang: Lang, view: View): string {
  const base = view === 'room' ? '/gespraech' : '/'
  if (lang !== 'en') return base
  return base === '/' ? '/en' : `/en${base}`
}

// Wohin nach einer Bestätigung (Speichern-Dialog) navigiert werden soll —
// "toLanding" für Header-Logo/Zurück-zum-Start, "newChat" für den
// "Neuer Dialog"-Button innerhalb des Trust Rooms selbst.
type PendingExit = 'toLanding' | 'newChat' | null

export default function App() {
  const [view, setView] = useState<View>(() => pathToView(window.location.pathname))
  const [lang, setLang] = useState<Lang>(() => getLangFromPath(window.location.pathname))
  const [prefill, setPrefill] = useState('')
  const [pendingExit, setPendingExit] = useState<PendingExit>(null)

  const roomChat = useTrustRoomChat(lang)

  useEffect(() => {
    function onPopState() {
      setView(pathToView(window.location.pathname))
      setLang(getLangFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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

  return (
    <div className="grain min-h-screen bg-ink-900">
      <Header stage={headerStage} lang={lang} onToggleLang={toggleLang} onReset={resetAll} />
      <div className="pt-14">
        {view === 'landing' && <Landing lang={lang} onStart={(text) => goToRoom(text)} />}

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
