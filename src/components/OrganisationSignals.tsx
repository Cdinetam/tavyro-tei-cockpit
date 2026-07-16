import type { OrganisationSignal } from '../types'
import { SectionShell } from './SectionShell'
import { DimensionBadge } from './DimensionBadge'

interface Props {
  signale: OrganisationSignal[]
}

function Intensity({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Ausprägung ${level} von 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-3.5 w-[3px] rounded-sm ${n <= level ? 'bg-brass' : 'bg-line-strong'}`}
        />
      ))}
    </div>
  )
}

export function OrganisationSignalsSection({ signale }: Props) {
  return (
    <SectionShell
      id="signale"
      code="B"
      title="Organisationssignale"
      description="Strukturelle Muster, die im Zusammenhang mit der Ausgangslage erkennbar sind."
    >
      <div className="flex flex-col divide-y divide-line-soft border-y border-line-soft">
        {signale.map((sig) => (
          <div
            key={sig.label}
            className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-[220px_1fr_100px] sm:items-center sm:gap-6"
          >
            <span className="flex flex-col items-start gap-2">
              <span className="font-sans text-[14px] font-medium text-paper">{sig.label}</span>
              <DimensionBadge dimension={sig.dimension} size="xs" />
            </span>
            <span className="font-sans text-[13.5px] leading-relaxed text-paper-faint">
              {sig.beschreibung}
            </span>
            <div className="sm:justify-self-end">
              <Intensity level={sig.auspraegung} />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
