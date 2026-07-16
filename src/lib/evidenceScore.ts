import type { AiHypothesis, RootCauseHypothesis } from '../types'

type HypothesisLike = Pick<AiHypothesis | RootCauseHypothesis, 'konfidenz'>

/**
 * "Evidence Score" — bewusst qualitativ, nicht als Prozentzahl. Eine
 * numerische Quote würde mehr Präzision vortäuschen, als die zugrunde
 * liegende Konfidenz-Deckelung (niemals "hoch") hergibt. Leitet sich rein
 * aus bereits vorhandenen Konfidenzwerten ab — keine zusätzliche
 * Modellabfrage, kein neuer Zustand.
 */
export function evidenceScoreLabel(hypothesen: HypothesisLike[]): string {
  if (hypothesen.length === 0) return 'Keine belastbaren Hypothesen für diese Eingabe.'

  const mittelCount = hypothesen.filter((h) => h.konfidenz === 'mittel').length

  if (mittelCount === 0) {
    return 'Schwach — einzelne Aussage ohne Bestätigung durch weitere Quellen.'
  }
  if (mittelCount < hypothesen.length) {
    return 'Gemischt — einzelne konkrete Anhaltspunkte, aber nicht verifiziert.'
  }
  return 'Vorhanden, aber unbestätigt — direkt aus der Eingabe ableitbar, ohne Gegenperspektive.'
}
