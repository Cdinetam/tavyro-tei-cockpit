import type { OrganisationSignal, RootCauseNode, TeiDimension } from '../types'
import { dimensionMeta, dimensionOrder } from '../data/dimensions'

function collectDimensions(signale: OrganisationSignal[], baum: RootCauseNode): Set<TeiDimension> {
  const found = new Set<TeiDimension>()
  signale.forEach((s) => found.add(s.dimension))

  function walk(node: RootCauseNode) {
    if (node.dimension) found.add(node.dimension)
    node.children?.forEach(walk)
  }
  walk(baum)

  return found
}

interface Props {
  signale: OrganisationSignal[]
  ursachenbaum: RootCauseNode
}

export function DimensionRadar({ signale, ursachenbaum }: Props) {
  const active = collectDimensions(signale, ursachenbaum)
  const blindSpots = dimensionOrder.filter((d) => !active.has(d))

  return (
    <div className="border-b border-line-soft py-8">
      <p className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
        Datenquellen & Signale · TaVyro Executive Intelligence® Layer
      </p>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-line-soft bg-line-soft sm:grid-cols-3 lg:grid-cols-6">
        {dimensionOrder.map((dim) => {
          const meta = dimensionMeta[dim]
          const isActive = active.has(dim)
          return (
            <div
              key={dim}
              title={meta.definition}
              className={`flex flex-col gap-2 p-4 transition-colors ${
                isActive ? 'bg-brass/[0.06]' : 'bg-ink-800/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-brass' : 'bg-line-strong'}`}
                />
                <span aria-hidden="true" className={isActive ? 'opacity-100' : 'opacity-40'}>
                  {meta.icon}
                </span>
              </div>
              <span
                className={`font-mono text-[10px] uppercase tracking-widest2 ${
                  isActive ? 'text-paper-dim' : 'text-paper-faint/60'
                }`}
              >
                {meta.label}
              </span>
              <span className="font-sans text-[11px] leading-snug text-paper-faint/80">
                {meta.definition}
              </span>
              {!isActive && (
                <span className="font-mono text-[9px] uppercase tracking-widest2 text-paper-faint/50">
                  Keine Datenpunkte im aktuellen Fall
                </span>
              )}
            </div>
          )
        })}
      </div>

      {blindSpots.length > 0 && (
        <p className="mt-4 font-sans text-[12.5px] leading-relaxed text-paper-faint">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
            Blind Spots ·{' '}
          </span>
          {blindSpots.map((d) => dimensionMeta[d].label).join(', ')} — für diese Eingabe ohne
          erkennbare Datenpunkte, nicht notwendigerweise irrelevant.
        </p>
      )}
    </div>
  )
}
