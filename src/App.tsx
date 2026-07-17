import { useState } from 'react'
import { Header } from './components/Header'
import { Landing } from './components/Landing'
import { ScenarioInput } from './components/ScenarioInput'
import { AnalysisView } from './components/AnalysisView'
import { AiScenarioInput } from './components/AiScenarioInput'
import {
  AiLoadingState,
  AiErrorState,
  AiLimitReachedState,
  AiDemoExpiredState,
  AiResultView,
} from './components/AiAnalysisView'
import { useAnalysis } from './hooks/useAnalysis'
import { useAiSession } from './hooks/useAiSession'

type View = 'landing' | 'ai' | 'static'

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [prefill, setPrefill] = useState('')

  const staticFlow = useAnalysis()
  const aiFlow = useAiSession()

  function resetAll() {
    setView('landing')
    setPrefill('')
    staticFlow.reset()
    aiFlow.reset()
  }

  const headerStage =
    view === 'ai'
      ? aiFlow.status === 'result'
        ? 'analysis'
        : 'input'
      : view === 'static'
        ? staticFlow.stage
        : 'landing'

  return (
    <div className="grain min-h-screen bg-ink-900">
      <Header stage={headerStage} onReset={resetAll} />
      <div className="pt-14">
        {view === 'landing' && (
          <Landing
            onStart={(text) => {
              setPrefill(text ?? '')
              setView('ai')
            }}
            onViewExamples={() => {
              setView('static')
              staticFlow.goToInput()
            }}
          />
        )}

        {view === 'ai' && (
          <>
            {aiFlow.status === 'idle' && (
              <AiScenarioInput onSubmit={aiFlow.submit} initialValue={prefill} />
            )}
            {aiFlow.status === 'loading' && <AiLoadingState question={aiFlow.question} />}
            {aiFlow.status === 'result' && aiFlow.result && (
              <AiResultView result={aiFlow.result} onReset={aiFlow.reset} />
            )}
            {aiFlow.status === 'limit_reached' && <AiLimitReachedState onReset={resetAll} />}
            {aiFlow.status === 'demo_expired' && <AiDemoExpiredState />}
            {aiFlow.status === 'error' && (
              <AiErrorState message={aiFlow.errorMessage} onRetry={aiFlow.reset} />
            )}
          </>
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
