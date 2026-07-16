import type { Scenario } from '../types'
import { scenarios } from '../data/scenarios'

interface CaseRailProps {
  activeId: string
  onSelect: (scenario: Scenario) => void
}

const sectionLinks = [
  { href: '#situation', label: 'Executive Situation' },
  { href: '#signale', label: 'Organisationssignale' },
  { href: '#hypothesen', label: 'Root-Cause-Hypothesen' },
  { href: '#baum', label: 'Ursachenbaum' },
  { href: '#optionen', label: 'Entscheidungsoptionen' },
  { href: '#note', label: 'Advisory Note' },
]

export function CaseRail({ activeId, onSelect }: CaseRailProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-line-soft pr-6 lg:block">
      <div className="sticky top-20">
        <p className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
          Fallakten
        </p>
        <nav className="mt-4 flex flex-col gap-0.5">
          {scenarios.map((s, i) => {
            const isActive = s.id === activeId
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className={`group flex items-start gap-3 border-l py-2 pl-3 text-left transition-colors duration-200 ${
                  isActive ? 'border-brass' : 'border-line-soft hover:border-line-strong'
                }`}
              >
                <span
                  className={`case-number shrink-0 pt-[1px] font-mono text-[10.5px] ${
                    isActive ? 'text-brass-light' : 'text-paper-faint'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex flex-col">
                  <span
                    className={`font-sans text-[12.5px] leading-tight ${
                      isActive ? 'text-paper' : 'text-paper-dim group-hover:text-paper'
                    }`}
                  >
                    {s.titel}
                  </span>
                  <span className="mt-1 font-mono text-[9.5px] uppercase tracking-widest2 text-paper-faint">
                    {s.kategorie}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="mt-10 border-t border-line-soft pt-6">
          <p className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
            Aktuelle Analyse
          </p>
          <nav className="mt-4 flex flex-col gap-2">
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 font-sans text-[12.5px] text-paper-faint transition-colors hover:text-paper"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  )
}
