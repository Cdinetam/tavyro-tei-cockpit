import { SectionShell } from './SectionShell'

interface Props {
  verstaendnis: string
  einordnung: string
  rueckfragen: string[]
}

export function EmpathicReflectionSection({ verstaendnis, einordnung, rueckfragen }: Props) {
  return (
    <>
      <SectionShell id="verstaendnis" title="Was ich verstanden habe">
        <p className="max-w-2xl font-display text-[18px] italic leading-relaxed text-paper">
          {verstaendnis}
        </p>
      </SectionShell>

      <SectionShell id="einordnung" title="Einordnung">
        <p className="max-w-2xl font-sans text-[18px] leading-relaxed text-paper-dim">
          {einordnung}
        </p>
      </SectionShell>

      {rueckfragen.length > 0 && (
        <SectionShell
          id="rueckfragen"
          title="Zum Weiterdenken"
          description="Keine Checkliste — Fragen, die Sie für sich mitnehmen können, nicht beantworten müssen."
        >
          <ul className="flex flex-col gap-5">
            {rueckfragen.map((frage, i) => (
              <li
                key={i}
                className="border-l border-brass-dim/60 pl-5 font-display text-[18px] italic leading-relaxed text-paper-dim"
              >
                {frage}
              </li>
            ))}
          </ul>
        </SectionShell>
      )}
    </>
  )
}
