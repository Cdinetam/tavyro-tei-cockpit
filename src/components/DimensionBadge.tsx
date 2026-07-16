import type { TeiDimension } from '../types'
import { dimensionMeta } from '../data/dimensions'

interface Props {
  dimension: TeiDimension
  size?: 'sm' | 'xs'
}

export function DimensionBadge({ dimension, size = 'sm' }: Props) {
  const meta = dimensionMeta[dimension]
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[9px]'

  return (
    <span
      title={`${meta.label} — ${meta.definition}`}
      className={`inline-flex w-fit items-center gap-1.5 border border-line-soft px-2 py-0.5 font-mono ${textSize} uppercase tracking-widest2 text-paper-faint`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  )
}
