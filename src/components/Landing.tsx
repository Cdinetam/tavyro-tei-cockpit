interface LandingProps {
  onStart: (prefill?: string) => void
  onViewExamples: () => void
}

const glQuestions = [
  'Meine Geschäftsleitung zieht nicht am selben Strang — wo genau bricht es?',
  'Ich delegiere immer mehr, aber die Ergebnisse werden nicht besser.',
  'Ein Nachfolge- oder Besetzungsentscheid steht an, und ich bin mir nicht sicher.',
  'Wachstum bringt Reibung ins Führungsteam, die vorher nicht da war.',
]

export function Landing({ onStart, onViewExamples }: LandingProps) {
  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-56px)] max-w-[1400px] flex-col justify-center px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass/[0.06] blur-[130px]" />
        <div className="absolute right-[8%] top-[18%] h-[280px] w-[280px] rounded-full bg-brass-light/[0.05] blur-[100px]" />
      </div>

      <div className="max-w-3xl fade-in">
        <p className="font-mono text-[11.5px] uppercase tracking-widest2 text-brass-light">
          TEI® Trust Room
        </p>

        <h1 className="mt-6 font-display text-[2rem] font-medium leading-[1.18] text-paper sm:text-[2.75rem]">
          TaVyro Executive Intelligence
          <sup className="bg-gradient-to-r from-brass-light via-brass to-brass-light bg-clip-text text-[0.9rem] text-transparent sm:text-[1.1rem]">
            ®
          </sup>{' '}
          – Trust Room
        </h1>

        <p className="mt-7 max-w-xl font-sans text-[19px] leading-relaxed text-paper">
          Executive Sparring und Organisationsdiagnostik — basierend auf C-Level-Erfahrung.
        </p>

        <div className="mt-10 max-w-xl border-l border-brass-dim/60 pl-6">
          <p className="font-sans text-[16px] leading-relaxed text-paper-dim">
            Es gibt Fragen, die sich in keinem internen KI-System stellen lassen: Kann ich meinem
            CFO noch vertrauen? Verschweigt mir die Geschäftsleitung etwas? Muss ich mich von
            einer Führungskraft trennen? Der TEI® Trust Room ist ein unabhängiger, vertraulicher
            Raum ausserhalb Ihrer eigenen Systeme — für genau diese Fragen, einfühlsam begleitet
            durch TaVyro Executive Intelligence®. Die volle Tiefe dieser Methodik entsteht im
            persönlichen Gespräch mit Tam Nguyen.
          </p>
        </div>

        <div className="mt-11 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            onClick={() => onStart()}
            className="group inline-flex items-center gap-3 border border-brass-dim bg-gradient-to-b from-brass/[0.14] to-brass/[0.06] px-7 py-3.5 font-sans text-[14.5px] font-medium tracking-wide text-paper shadow-panel transition-all duration-300 ease-editorial hover:border-brass hover:from-brass/[0.2] hover:to-brass/[0.1]"
          >
            Analyse starten
            <span className="transition-transform duration-300 ease-editorial group-hover:translate-x-1">
              →
            </span>
          </button>
          <button
            onClick={onViewExamples}
            className="font-mono text-[11.5px] uppercase tracking-widest2 text-paper-dim transition-colors hover:text-paper"
          >
            Referenzfälle ansehen
          </button>
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest2 text-paper-faint">
          Demo-Prototyp · keine echten Kundendaten
        </p>
      </div>

      <div className="mt-16 max-w-2xl border-t border-line-soft pt-8 fade-in fade-in-delay-2">
        <p className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
          Typische Fragen von CEOs und Geschäftsleitungen
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {glQuestions.map((question) => (
            <button
              key={question}
              onClick={() => onStart(question)}
              className="group flex items-center justify-between gap-4 border border-line-soft bg-ink-800/30 px-5 py-3.5 text-left font-sans text-[14.5px] leading-snug text-paper-dim transition-all duration-200 ease-editorial hover:border-brass-dim hover:bg-brass/[0.05] hover:text-paper"
            >
              <span>{question}</span>
              <span className="shrink-0 text-brass-light opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
