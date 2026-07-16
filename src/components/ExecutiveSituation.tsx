import type { ExecutiveSituation as ExecutiveSituationT } from '../types'
import { SectionShell } from './SectionShell'

interface Props {
  situation: ExecutiveSituationT
  symptome: string[]
}

export function ExecutiveSituationSection({ situation, symptome }: Props) {
  const rows: [string, string][] = [
    ['Ausgangslage', situation.ausgangslage],
    ['Entscheidungsdruck', situation.entscheidungsdruck],
    ['Strategische Relevanz', situation.strategischeRelevanz],
    ['Führungsdilemma', situation.fuehrungsdilemma],
  ]

  return (
    <SectionShell
      id="situation"
      code="A"
      title="Executive Situation"
      description="Kurzeinordnung der Ausgangslage aus Sicht der Geschäftsleitung."
    >
      <div className="grid grid-cols-1 gap-px overflow-hidden border border-line-soft bg-line-soft sm:grid-cols-2">
        {rows.map(([label, text]) => (
          <div key={label} className="bg-ink-800/40 p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
              {label}
            </p>
            <p className="mt-3 font-sans text-[14.5px] leading-relaxed text-paper-dim">{text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
          Beobachtete Symptome
        </p>
        <ul className="mt-3 flex flex-col divide-y divide-line-soft border-y border-line-soft">
          {symptome.map((s) => (
            <li key={s} className="flex gap-4 py-3 font-sans text-[14px] leading-relaxed text-paper-dim">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brass-dim" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  )
}
