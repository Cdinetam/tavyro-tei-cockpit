import type { Scenario } from '../types'
import { scenarios } from '../data/scenarios'
import { CaseRail } from './CaseRail'
import { CaseHeader } from './CaseHeader'
import { DimensionRadar } from './DimensionRadar'
import { ExecutiveSituationSection } from './ExecutiveSituation'
import { OrganisationSignalsSection } from './OrganisationSignals'
import { HypothesesSection } from './Hypotheses'
import { RootCauseTreeSection } from './RootCauseTree'
import { DecisionOptionsSection } from './DecisionOptions'
import { AdvisoryNoteSection } from './AdvisoryNote'

interface AnalysisViewProps {
  scenario: Scenario
  question: string
  isMatchedReference: boolean
  onSelectScenario: (scenario: Scenario) => void
}

export function AnalysisView({
  scenario,
  question,
  isMatchedReference,
  onSelectScenario,
}: AnalysisViewProps) {
  const index = scenarios.findIndex((s) => s.id === scenario.id)

  return (
    <div className="mx-auto flex max-w-[1400px] gap-10 px-6 pb-24 pt-8 lg:px-10">
      <CaseRail activeId={scenario.id} onSelect={onSelectScenario} />

      <main className="min-w-0 flex-1">
        <div className="-mx-1 mb-8 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {scenarios.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onSelectScenario(s)}
              className={`shrink-0 border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-widest2 transition-colors ${
                s.id === scenario.id
                  ? 'border-brass-dim bg-brass/[0.08] text-brass-light'
                  : 'border-line-soft text-paper-faint'
              }`}
            >
              {String(i + 1).padStart(2, '0')} · {s.kategorie}
            </button>
          ))}
        </div>

        <CaseHeader
          scenario={scenario}
          index={index}
          question={question}
          isMatchedReference={isMatchedReference}
        />
        <DimensionRadar signale={scenario.organisationssignale} ursachenbaum={scenario.ursachenbaum} />
        <ExecutiveSituationSection situation={scenario.situation} symptome={scenario.symptome} />
        <OrganisationSignalsSection signale={scenario.organisationssignale} />
        <HypothesesSection hypothesen={scenario.hypothesen} />
        <RootCauseTreeSection ursachenbaum={scenario.ursachenbaum} />
        <DecisionOptionsSection scenario={scenario} />
        <AdvisoryNoteSection note={scenario.advisoryNote} />
      </main>
    </div>
  )
}
