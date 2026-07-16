import { useState } from 'react'
import type { AiAnalysisResult } from '../types'
import { analyzeQuestion } from '../lib/aiClient'

export type AiFlowStatus = 'idle' | 'loading' | 'result' | 'limit_reached' | 'demo_expired' | 'error'

export function useAiSession() {
  const [status, setStatus] = useState<AiFlowStatus>('idle')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AiAnalysisResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function submit(text: string) {
    setQuestion(text)
    setStatus('loading')
    setErrorMessage('')

    const response = await analyzeQuestion(text)

    if (response.status === 'ok' && response.result) {
      setResult(response.result)
      setStatus('result')
    } else if (response.status === 'limit_reached') {
      setStatus('limit_reached')
    } else if (response.status === 'demo_expired') {
      setStatus('demo_expired')
    } else {
      setErrorMessage(response.message ?? 'Etwas ist schiefgelaufen.')
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setQuestion('')
    setResult(null)
    setErrorMessage('')
  }

  return { status, question, result, errorMessage, submit, reset }
}
