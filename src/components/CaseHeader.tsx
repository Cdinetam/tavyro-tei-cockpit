import type { Scenario } from '../types'

interface CaseHeaderProps {
  scenario: Scenario
  index: number
  question: string
  isMatchedReference?: boolean
}

export function CaseHeader({ scenario, index, question, isMatchedReference }: CaseHeaderProps) {
  return (
    <div className="border-b border-line-soft pb-10 fade-in">
      <div className="flex items-center gap-3">
        <span className="case-number font-mono text-[11px] text-brass-light">
          FALL {String(index + 1).padStart(2, '0')}
        </span>
        <span className="h-[3px] w-[3px] rounded-full bg-paper-faint" />
        <span className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint">
          {scenario.kategorie}
        </span>
      </div>

      <h1 className="mt-4 max-w-3xl font-display text-[2rem] font-medium leading-tight text-paper sm:text-[2.5rem]">
        {scenario.titel}
      </h1>

      <p className="mt-3 max-w-2xl font-sans text-[14px] leading-relaxed text-paper-faint">
        {scenario.unternehmensprofil}
      </p>

      <div className="mt-6 max-w-2xl border-l border-brass-dim bg-brass/[0.05] py-3 pl-5">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-brass-light">
          CEO-Frage
        </p>
        <p className="mt-1.5 font-display text-lg italic leading-snug text-paper">
          „{question}“
        </p>
        {isMatchedReference && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
            Nächstliegende Referenzakte aus der TEI®-Wissensbasis — kein Ersatz für eine
            individuelle Analyse
          </p>
        )}
      </div>
    </div>
  )
}
