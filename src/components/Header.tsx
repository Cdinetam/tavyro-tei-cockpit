interface HeaderProps {
  stage: 'landing' | 'room'
  onReset: () => void
}

export function Header({ onReset }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-line-soft bg-ink-900/90 backdrop-blur-sm">
      <div className="relative mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-6 lg:px-10">
        <button
          onClick={onReset}
          className="group flex shrink-0 items-center text-left"
          aria-label="Zur Startseite"
        >
          <img src="/tavyro-logo.png" alt="TaVyro" className="h-9 w-auto shrink-0" />
        </button>

        {/* Titel unabhängig von Logo-/rechter Breite über die ganze Bar
            zentriert, statt neben dem Logo mitzuwandern. */}
        <button
          onClick={onReset}
          aria-label="Zur Startseite"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center font-display text-[17px] font-semibold leading-snug text-paper sm:inline-block"
        >
          TaVyro Executive Intelligence<sup className="text-[9px]">®</sup> (TEI) – Trust Room
        </button>

        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-brass" />
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
              Vertraulich
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
