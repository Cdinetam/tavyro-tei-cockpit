import { SectionShell } from './SectionShell'

export function AdvisoryNoteSection({ note }: { note: string }) {
  return (
    <SectionShell id="note" code="F" title="TaVyro Advisory Note">
      <div className="border-l border-brass-dim bg-brass/[0.04] p-6">
        <p className="max-w-2xl font-display text-[18px] italic leading-relaxed text-paper-dim">
          {note}
        </p>
      </div>
    </SectionShell>
  )
}
