import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Landing } from './components/Landing'
import { TrustRoomChat, ExitConfirmDialog } from './components/TrustRoomChat'
import { useTrustRoomChat } from './hooks/useTrustRoomChat'

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
function pathToView(pathname: string): View {
  return pathname.startsWith('/gespraech') ? 'room' : 'landing'
}

// Wohin nach einer Bestätigung (Speichern-Dialog) navigiert werden soll —
// "toLanding" für Header-Logo/Zurück-zum-Start, "newChat" für den
// "Neuer Dialog"-Button innerhalb des Trust Rooms selbst.
type PendingExit = 'toLanding' | 'newChat' | null

export default function App() {
  const [view, setView] = useState<View>(() => pathToView(window.location.pathname))
  const [prefill, setPrefill] = useState('')
  const [pendingExit, setPendingExit] = useState<PendingExit>(null)

  const roomChat = useTrustRoomChat()

  useEffect(() => {
    function onPopState() {
      setView(pathToView(window.location.pathname))
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
    window.history.pushState({}, '', '/gespraech')
    setView('room')
  }

  function doFullReset() {
    window.history.pushState({}, '', '/')
    setView('landing')
    setPrefill('')
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
      <Header stage={headerStage} onReset={resetAll} />
      <div className="pt-14">
        {view === 'landing' && <Landing onStart={(text) => goToRoom(text)} />}

        {view === 'room' && (
          <TrustRoomChat
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
            onSaveAndLeave={() => confirmPendingExit(true)}
            onLeaveWithoutSaving={() => confirmPendingExit(false)}
            onCancel={() => setPendingExit(null)}
          />
        )}
      </div>
    </div>
  )
}
