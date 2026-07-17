import type { Confidence, RootCauseHypothesis } from '../types'
import { SectionShell } from './SectionShell'

const confidenceScale: Record<Confidence, number> = { niedrig: 1, mittel: 2, hoch: 3 }

function ConfidenceMeter({ level }: { level: Confidence }) {
  const filled = confidenceScale[level]
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-2 w-2 rounded-full border ${
              n <= filled ? 'border-brass bg-brass' : 'border-line-strong bg-transparent'
            }`}
          />
        ))}
      </div>
      <span className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
        Konfidenz {level}
      </span>
    </div>
  )
}

interface Props {
  hypothesen: RootCauseHypothesis[]
}

export function HypothesesSection({ hypothesen }: Props) {
  if (hypothesen.length === 0) {
    return (
      <SectionShell
        id="hypothesen"
        code="C"
        title="Root-Cause-Hypothesen"
        description="Plausible Ursachenhypothesen mit Begründung, Evidenzsignalen und Konfidenzgrad."
      >
        <div className="border border-dashed border-line-strong bg-ink-800/30 p-6">
          <p className="font-sans text-[13.5px] leading-relaxed text-paper-faint">
            Für diese Eingabe liegen im aktuellen Modus keine belastbaren Hypothesen vor.
          </p>
        </div>
      </SectionShell>
    )
  }

  return (
    <SectionShell
      id="hypothesen"
      code="C"
      title="Root-Cause-Hypothesen"
      description="Plausible Ursachenhypothesen mit Begründung, Evidenzsignalen und Konfidenzgrad."
    >
      <div className="flex flex-col gap-px overflow-hidden border border-line-soft bg-line-soft">
        {hypothesen.map((h, i) => (
          <div key={h.id} className="grid grid-cols-1 gap-6 bg-ink-800/40 p-6 lg:grid-cols-[1fr_280px]">
            <div>
              <div className="flex items-start gap-3">
                <span className="case-number mt-1 shrink-0 font-mono text-[11px] text-brass-dim">
                  H{i + 1}
                </span>
                <p className="font-display text-[19px] leading-snug text-paper">{h.hypothese}</p>
              </div>
              <p className="mt-3 pl-7 font-sans text-[14.5px] leading-relaxed text-paper-dim">
                {h.begruendung}
              </p>
              <div className="mt-4 pl-7">
                <p className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
                  Evidenzsignale
                </p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {h.evidenzsignale.map((e) => (
                    <li key={e} className="flex gap-2.5 font-sans text-[13px] leading-relaxed text-paper-dim">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-paper-faint" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-line-soft pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <ConfidenceMeter level={h.konfidenz} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
                  Benötigte Zusatzinformation
                </p>
                <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-paper-dim">
                  {h.zusatzinformation}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
