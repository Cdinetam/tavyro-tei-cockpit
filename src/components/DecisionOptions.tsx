import type { Scenario } from '../types'
import { SectionShell } from './SectionShell'

export function DecisionOptionsSection({ scenario }: { scenario: Scenario }) {
  return (
    <SectionShell
      id="optionen"
      code="E"
      title="Entscheidungsoptionen"
      description="Drei mögliche nächste Schritte, unterschiedlicher Wirkungshorizont und Eingriffstiefe."
    >
      <div className="grid grid-cols-1 gap-px overflow-hidden border border-line-soft bg-line-soft md:grid-cols-3">
        {scenario.entscheidungsoptionen.map((opt) => (
          <div key={opt.typ} className="flex flex-col bg-ink-800/40 p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-brass-light">
              {opt.typ}
            </p>
            <p className="mt-3 font-display text-[17px] leading-snug text-paper">{opt.titel}</p>
            <p className="mt-3 flex-1 font-sans text-[13.5px] leading-relaxed text-paper-dim">
              {opt.beschreibung}
            </p>
            <div className="mt-5 flex flex-col gap-2 border-t border-line-soft pt-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
                  Horizont
                </span>
                <span className="font-sans text-[12.5px] text-paper-dim">{opt.horizont}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
                  Risiko
                </span>
                <span className="font-sans text-[12.5px] text-paper-dim">{opt.risiko}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
