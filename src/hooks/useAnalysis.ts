import { useState } from 'react'
import type { Scenario } from '../types'
import { findScenarioForText, isExactPrompt } from '../data/scenarios'

export type Stage = 'landing' | 'input' | 'analysis'

export function useAnalysis() {
  const [stage, setStage] = useState<Stage>('landing')
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [question, setQuestion] = useState<string>('')
  const [isMatchedReference, setIsMatchedReference] = useState(false)
  const [noMatch, setNoMatch] = useState(false)

  function goToInput() {
    setStage('input')
  }

  function submitQuestion(text: string) {
    const resolved = findScenarioForText(text)

    if (!resolved) {
      // Kein Referenzfall passt gut genug — lieber ehrlich auf der
      // Eingabeseite bleiben, als einen thematisch fremden Fall als
      // "nächstliegend" auszugeben.
      setNoMatch(true)
      setQuestion(text)
      return
    }

    setNoMatch(false)
    setScenario(resolved)
    setQuestion(text)
    setIsMatchedReference(!isExactPrompt(text))
    setStage('analysis')
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  function selectScenario(next: Scenario) {
    setScenario(next)
    setQuestion(next.ceoFrage)
    setIsMatchedReference(false)
    setNoMatch(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() {
    setStage('landing')
    setScenario(null)
    setQuestion('')
    setIsMatchedReference(false)
    setNoMatch(false)
  }

  return {
    stage,
    scenario,
    question,
    isMatchedReference,
    noMatch,
    goToInput,
    submitQuestion,
    selectScenario,
    reset,
  }
}
