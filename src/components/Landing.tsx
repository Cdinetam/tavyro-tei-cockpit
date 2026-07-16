interface LandingProps {
  onStart: () => void
  onViewExamples: () => void
}

export function Landing({ onStart, onViewExamples }: LandingProps) {
  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-56px)] max-w-[1400px] flex-col justify-center px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass/[0.04] blur-[120px]" />
      </div>

      <div className="max-w-3xl fade-in">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
          TEI® Trust Room
        </p>

        <h1 className="mt-6 font-display text-[2.75rem] font-medium leading-[1.08] text-paper sm:text-[3.75rem]">
          TaVyro Executive
          <br />
          Intelligence<span className="text-brass-light">®</span> (TEI<span className="text-brass-light">®</span>)
        </h1>

        <p className="mt-6 max-w-xl font-sans text-[17px] leading-relaxed text-paper-dim">
          Executive Sparring und Organisationsdiagnostik — basierend auf C-Level-Erfahrung.
        </p>

        <div className="mt-10 max-w-xl border-l border-line-strong pl-6">
          <p className="font-sans text-[15px] leading-relaxed text-paper-dim">
            Beschreiben Sie eine Führungs- oder Organisationsfrage. Der TEI® Trust Room
            strukturiert die Situation und erkennt mögliche Ursachenmuster — als vertrauliche
            Vorschau auf die TEI®-Methodik. Die vollständige Analyse mit echten
            Unternehmensdaten entsteht im persönlichen Gespräch mit Tam.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-3 border border-brass-dim bg-brass/[0.08] px-6 py-3 font-sans text-[13px] font-medium tracking-wide text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14]"
          >
            Analyse starten
            <span className="transition-transform duration-300 ease-editorial group-hover:translate-x-1">
              →
            </span>
          </button>
          <button
            onClick={onViewExamples}
            className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
          >
            Referenzfälle ansehen
          </button>
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest2 text-paper-faint">
          Demo-Prototyp · keine echten Kundendaten
        </p>
      </div>

      <div className="mt-24 grid max-w-3xl grid-cols-3 gap-8 border-t border-line-soft pt-8 fade-in fade-in-delay-2">
        {[
          ['6', 'Intelligence-Dimensionen'],
          ['3–5', 'Root-Cause-Hypothesen'],
          ['CH', 'KMU- und DACH-Kontext'],
        ].map(([value, label]) => (
          <div key={label}>
            <div className="font-display text-2xl text-paper">{value}</div>
            <div className="mt-1 font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
