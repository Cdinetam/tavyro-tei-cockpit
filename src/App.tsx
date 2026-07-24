import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Landing } from './components/Landing'
import { ScenarioInput } from './components/ScenarioInput'
import { AnalysisView } from './components/AnalysisView'
import { TrustRoomChat, ExitConfirmDialog } from './components/TrustRoomChat'
import { useAnalysis } from './hooks/useAnalysis'
import { useTrustRoomChat } from './hooks/useTrustRoomChat'

type View = 'landing' | 'static' | 'room'

// Der echte, mehrteilige Trust-Room-Gespräch-Flow bekommt eine eigene URL
// (/gespraech), damit er direkt verlinkt/geteilt werden kann. Er ist der
// einzige Live-KI-Flow — die frühere Einmal-Analyse-Demo wurde bewusst
// entfernt (Produktentscheidung: der Dialog ist strikt überlegen, eine
// schwächere Parallelversion würde nur den Cliffhanger-Effekt verwässern,
// siehe Diskussion). Azure SWA leitet via staticwebapp.config.json
// (navigationFallback) jeden Pfad auf index.html um, ein Deep-Link auf
// /gespraech funktioniert also direkt.
function pathToView(pathname: string): View {
  return pathname.startsWith('/gespraech') ? 'room' : 'landing'
}

// Wohin nach einer Bestätigung (Speichern-Dialog) navigiert werden soll —
// "toLanding" für Header-Logo/Zurück-zum-Start, "newChat" für den
// "Neues Gespräch"-Button innerhalb des Trust Rooms selbst.
type PendingExit = 'toLanding' | 'newChat' | null

export default function App() {
  const [view, setView] = useState<View>(() => pathToView(window.location.pathname))
  const [prefill, setPrefill] = useState('')
  const [pendingExit, setPendingExit] = useState<PendingExit>(null)

  const staticFlow = useAnalysis()
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
    staticFlow.reset()
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

  // "Neues Gespräch"-Button innerhalb des Trust Rooms — bleibt in der
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

  const headerStage = view === 'room' ? 'room' : view === 'static' ? staticFlow.stage : 'landing'

  return (
    <div className="grain min-h-screen bg-ink-900">
      <Header stage={headerStage} onReset={resetAll} />
      <div className="pt-14">
        {view === 'landing' && (
          <Landing
            onStart={(text) => goToRoom(text)}
            onViewExamples={() => {
              setView('static')
              staticFlow.goToInput()
            }}
          />
        )}

        {view === 'room' && (
          <TrustRoomChat
            messages={roomChat.messages}
            status={roomChat.status}
            errorMessage={roomChat.errorMessage}
            savedConversations={roomChat.savedConversations}
            initialDraft={prefill}
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

        {view === 'static' && (
          <>
            {staticFlow.stage === 'input' && (
              <ScenarioInput onSubmit={staticFlow.submitQuestion} noMatch={staticFlow.noMatch} />
            )}
            {staticFlow.stage === 'analysis' && staticFlow.scenario && (
              <AnalysisView
                scenario={staticFlow.scenario}
                question={staticFlow.question}
                isMatchedReference={staticFlow.isMatchedReference}
                onSelectScenario={staticFlow.selectScenario}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
