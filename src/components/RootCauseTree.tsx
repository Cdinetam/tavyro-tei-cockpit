import { useEffect, useState, type ReactNode } from 'react'
import type { RootCauseNode } from '../types'
import { SectionShell } from './SectionShell'
import { DimensionBadge } from './DimensionBadge'

const ebeneMeta: Record<RootCauseNode['ebene'], { label: string; tag: string }> = {
  symptom: { label: 'Symptom', tag: 'S' },
  ursache: { label: 'Mögliche Ursache', tag: 'U' },
  tiefenursache: { label: 'Vertiefende Ursache', tag: 'T' },
  entscheidungsfrage: { label: 'Entscheidungsfrage', tag: 'F' },
}

function NodeButton({
  node,
  isSelected,
  onSelect,
}: {
  node: RootCauseNode
  isSelected: boolean
  onSelect: (node: RootCauseNode) => void
}) {
  const meta = ebeneMeta[node.ebene]
  const isQuestion = node.ebene === 'entscheidungsfrage'

  return (
    <button
      onClick={() => onSelect(node)}
      className={`group flex w-full items-start gap-3 border px-4 py-3.5 text-left transition-all duration-200 ease-editorial ${
        isSelected
          ? 'border-brass-dim bg-brass/[0.07]'
          : 'border-line-soft bg-ink-800/30 hover:border-line-strong hover:bg-ink-800/50'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border font-mono text-[9.5px] ${
          isSelected ? 'border-brass text-brass-light' : 'border-line-strong text-paper-faint'
        }`}
      >
        {meta.tag}
      </span>
      <span className="flex flex-col gap-1.5">
        <span
          className={`block font-sans text-[13.5px] leading-snug ${
            isQuestion ? 'italic text-paper' : 'text-paper'
          }`}
        >
          {node.label}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-widest2 text-paper-faint">
            {meta.label}
          </span>
          {node.dimension && <DimensionBadge dimension={node.dimension} size="xs" />}
        </span>
      </span>
    </button>
  )
}

function Branch({
  node,
  selectedId,
  onSelect,
}: {
  node: RootCauseNode
  selectedId: string
  onSelect: (node: RootCauseNode) => void
}) {
  return (
    <div className="flex flex-col">
      <NodeButton node={node} isSelected={node.id === selectedId} onSelect={onSelect} />
      {node.children && node.children.length > 0 && (
        <div className="ml-2.5 mt-2 flex flex-col gap-2 border-l border-line-strong pl-4">
          {node.children.map((child) => (
            <Branch key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  ursachenbaum: RootCauseNode
  description?: string
  afterTree?: ReactNode
}

export function RootCauseTreeSection({ ursachenbaum, description, afterTree }: Props) {
  const [selected, setSelected] = useState<RootCauseNode>(ursachenbaum)

  useEffect(() => {
    setSelected(ursachenbaum)
  }, [ursachenbaum])

  const meta = ebeneMeta[selected.ebene]

  return (
    <SectionShell
      id="baum"
      code="D"
      title="Ursachenbaum"
      description={
        description ??
        'Symptom → mögliche Ursache → vertiefende Ursache → Entscheidungsfrage. Knoten anklicken für Detail.'
      }
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <Branch node={ursachenbaum} selectedId={selected.id} onSelect={setSelected} />
          {afterTree}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="border border-line-soft bg-ink-800/40 p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-[2px] border border-brass-dim font-mono text-[9.5px] text-brass-light">
                {meta.tag}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint">
                {meta.label}
              </span>
            </div>
            <p className="mt-4 font-display text-[16px] leading-snug text-paper">
              {selected.label}
            </p>
            {selected.dimension && (
              <div className="mt-3">
                <DimensionBadge dimension={selected.dimension} />
              </div>
            )}
            <div className="mt-4 h-px bg-line-soft" />
            <p className="mt-4 font-sans text-[13.5px] leading-relaxed text-paper-dim">
              {selected.detail}
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
