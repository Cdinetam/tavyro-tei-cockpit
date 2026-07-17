interface HeaderProps {
  stage: 'landing' | 'input' | 'analysis'
  onReset: () => void
}

export function Header({ stage, onReset }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-line-soft bg-ink-900/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-6 lg:px-10">
        <button
          onClick={onReset}
          className="group flex items-center gap-3 text-left"
          aria-label="Zur Startseite"
        >
          <img src="/tavyro-logo.png" alt="TaVyro" className="h-6 w-auto" />
          <span className="hidden font-sans text-[13px] text-paper-dim sm:inline">
            Executive Intelligence<sup className="text-[8px]">®</sup> (TEI<sup className="text-[8px]">®</sup>) — Trust Room
          </span>
        </button>

        <div className="flex items-center gap-6">
          {stage === 'analysis' && (
            <button
              onClick={onReset}
              className="font-mono text-[11px] uppercase tracking-widest2 text-paper-faint transition-colors hover:text-paper"
            >
              Neue Analyse
            </button>
          )}
          <div className="hidden items-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-brass" />
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
              Vertraulich · Lokale Sitzung
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
