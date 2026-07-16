import type { AiAnalysisResult } from '../types'
import { isMockMode } from '../lib/aiClient'
import { DimensionRadar } from './DimensionRadar'
import { ExecutiveSituationSection } from './ExecutiveSituation'
import { OrganisationSignalsSection } from './OrganisationSignals'
import { HypothesesSection } from './Hypotheses'
import { RecommendedNextEvidence } from './RecommendedNextEvidence'
import { RootCauseTreeSection } from './RootCauseTree'
import { LockedDecisionCard } from './LockedDecisionCard'
import { AdvisoryNoteSection } from './AdvisoryNote'

const BOOKING_URL = 'https://tavyro.ch/de/erstgespraech-buchen'

function ModeBadge() {
  if (isMockMode) {
    return (
      <div className="mb-6 inline-flex items-center gap-2 border border-line-strong px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-paper-faint" />
        <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
          Demo-Modus lokal · kein Live-Modell verbunden
        </span>
      </div>
    )
  }

  return (
    <div className="mb-6 inline-flex items-center gap-2 border border-brass-dim/50 px-3 py-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-brass" />
      <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
        Processed within TaVyro's protected Azure OpenAI environment
      </span>
    </div>
  )
}

export function AiLoadingState({ question }: { question: string }) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-2xl flex-col justify-center px-6">
      <ModeBadge />
      <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
        TEI® strukturiert Ihre Situation
      </p>
      <p className="mt-4 max-w-lg font-display text-xl italic leading-snug text-paper-dim">
        „{question}"
      </p>
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-8 animate-pulse bg-brass-dim"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
    </section>
  )
}

export function AiErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-xl flex-col justify-center px-6">
      <p className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint">
        Nicht verfügbar
      </p>
      <p className="mt-4 font-sans text-[15px] leading-relaxed text-paper-dim">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex w-fit items-center gap-2 border border-line-strong px-5 py-2.5 font-sans text-[13px] text-paper-dim transition-colors hover:border-brass-dim hover:text-paper"
      >
        Erneut versuchen
      </button>
    </section>
  )
}

export function AiLimitReachedState({ onReset }: { onReset: () => void }) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-xl flex-col justify-center px-6">
      <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
        Vertiefte Analyse abgeschlossen
      </p>
      <h2 className="mt-4 font-display text-2xl font-medium text-paper">
        Ihr Kontingent an vertieften Analysen ist erreicht.
      </h2>
      <p className="mt-4 font-sans text-[14.5px] leading-relaxed text-paper-dim">
        Das ist bewusst so begrenzt: eine erste Einordnung, alles Weitere gehört in ein echtes
        Gespräch — nicht in eine endlose Demo-Schleife.
      </p>
      <div className="mt-7 flex flex-wrap gap-4">
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
        >
          Erstgespräch buchen →
        </a>
        <button
          onClick={onReset}
          className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
        >
          Zurück zum Start
        </button>
      </div>
    </section>
  )
}

export function AiDemoExpiredState() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-xl flex-col justify-center px-6">
      <p className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint">
        Pilotphase abgeschlossen
      </p>
      <h2 className="mt-4 font-display text-2xl font-medium text-paper">
        Diese Live-Demo ist nicht mehr verfügbar.
      </h2>
      <p className="mt-4 font-sans text-[14.5px] leading-relaxed text-paper-dim">
        TEI® als KI-assistiertes Executive Sparring befindet sich aktuell in einer begrenzten
        Pilotphase.
      </p>
      <a
        href={BOOKING_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-7 inline-flex w-fit items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
      >
        Erstgespräch buchen →
      </a>
    </section>
  )
}

export function AiResultView({ result, onReset }: { result: AiAnalysisResult; onReset: () => void }) {
  return (
    <div className="mx-auto max-w-[1000px] px-6 pb-24 pt-8 lg:px-10">
      <ModeBadge />

      <div className="border-b border-line-soft pb-10">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-brass-light">TEI® TRUST ROOM</span>
          <span className="h-[3px] w-[3px] rounded-full bg-paper-faint" />
          <span className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint">
            Vertrauliche Ersteinschätzung
          </span>
        </div>
        <div className="mt-6 max-w-2xl border-l border-brass-dim bg-brass/[0.05] py-3 pl-5">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-brass-light">
            Current Topic
          </p>
          <p className="mt-1.5 font-display text-lg italic leading-snug text-paper">
            „{result.eingabeText}"
          </p>
        </div>
      </div>

      <DimensionRadar signale={result.organisationssignale} ursachenbaum={result.ursachenbaum} />

      <ExecutiveSituationSection situation={result.situation} symptome={result.symptome} />
      <OrganisationSignalsSection signale={result.organisationssignale} />
      <HypothesesSection hypothesen={result.hypothesen} />
      <RecommendedNextEvidence hypothesen={result.hypothesen} />
      <RootCauseTreeSection
        ursachenbaum={result.ursachenbaum}
        description="Symptom → mögliche Ursache → vertiefende Ursache. Die vierte Ebene — die Entscheidungsfrage — folgt bewusst unten, nicht im Baum."
        afterTree={<LockedDecisionCard teaser={result.gesperrteEntscheidungsfrage} question={result.eingabeText} />}
      />
      <AdvisoryNoteSection note={result.advisoryNote} />

      {!isMockMode && (
        <div className="border-t border-line-soft py-8">
          <p className="max-w-2xl font-sans text-[13.5px] leading-relaxed text-paper-faint">
            Um diese Einschätzung zu validieren, verknüpft TaVyro in der Vollversion die Signale
            aus Ihren Systemen über alle sechs Dimensionen der Organisationsintelligenz (People,
            Organisation, Workforce, Governance, Business &amp; Decision Intelligence). Im
            Erstgespräch zeigen wir Ihnen, wie wir diese Datenströme in Ihrer Azure-OpenAI-Umgebung
            sicher zusammenführen.
          </p>
        </div>
      )}

      <div className="mt-10 border-t border-line-soft pt-8">
        <button
          onClick={onReset}
          className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
        >
          ← Neues Thema
        </button>
      </div>
    </div>
  )
}
