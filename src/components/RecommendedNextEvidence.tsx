import type { RootCauseHypothesis } from '../types'
import { evidenceScoreLabel } from '../lib/evidenceScore'

/**
 * Nicht mehr im KI-Flow verwendet (TEI® Trust Room liefert dort keine
 * Hypothesen mehr) — nur noch von der statischen Referenzfälle-Ansicht
 * genutzt, falls dort referenziert.
 */
type HypothesisLike = Pick<RootCauseHypothesis, 'konfidenz' | 'zusatzinformation'>

interface Props {
  hypothesen: HypothesisLike[]
}

export function RecommendedNextEvidence({ hypothesen }: Props) {
  const items = Array.from(new Set(hypothesen.map((h) => h.zusatzinformation).filter(Boolean)))

  return (
    <div className="mt-8 border border-line-soft bg-ink-800/30 p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-brass-light">
          Evidence Score
        </p>
        <p className="font-sans text-[13px] text-paper-dim">{evidenceScoreLabel(hypothesen)}</p>
      </div>

      {items.length > 0 && (
        <>
          <div className="mt-5 h-px bg-line-soft" />
          <p className="mt-5 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
            Recommended Next Evidence
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((item) => (
              <li key={item} className="flex gap-2.5 font-sans text-[13.5px] leading-relaxed text-paper-dim">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brass-dim" />
                {item}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
