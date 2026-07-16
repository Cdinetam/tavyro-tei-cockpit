import { useState } from 'react'
import { scenarioPrompts } from '../data/scenarios'

interface ScenarioInputProps {
  onSubmit: (text: string) => void
  noMatch?: boolean
}

export function ScenarioInput({ onSubmit, noMatch }: ScenarioInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    if (value.trim().length === 0) return
    onSubmit(value.trim())
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[1400px] flex-col justify-center px-6 py-16 lg:px-10">
      <div className="mx-auto w-full max-w-2xl fade-in">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
          Referenzfälle
        </p>
        <h2 className="mt-4 font-display text-3xl font-medium text-paper sm:text-4xl">
          Welche der Ausgangslagen kommt Ihrer Frage am nächsten?
        </h2>
        <p className="mt-3 max-w-lg font-sans text-[14px] leading-relaxed text-paper-faint">
          Dieser Bereich zeigt fünf ausgearbeitete Referenzfälle zur Illustration der TEI®-Methodik
          — kein KI-Verständnis Ihrer exakten Formulierung. Für eine echte Analyse Ihrer Frage:
          KI-Sparring auf der Startseite.
        </p>

        <div className="mt-8">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Eigene Formulierung eingeben, wird dem nächstliegenden Referenzfall zugeordnet…"
            rows={4}
            className="w-full resize-none border border-line bg-ink-800/60 px-5 py-4 font-sans text-[15px] leading-relaxed text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim"
          />
          <div className="mt-4 flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
              Lokale Verarbeitung · keine Speicherung
            </span>
            <button
              onClick={handleSubmit}
              disabled={value.trim().length === 0}
              className="inline-flex items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-paper-faint"
            >
              Referenzfall zuordnen →
            </button>
          </div>

          {noMatch && (
            <div className="mt-4 border-l border-brass-dim bg-brass/[0.05] px-4 py-3">
              <p className="font-sans text-[13px] leading-relaxed text-paper-dim">
                Für diese Formulierung ist kein passender Referenzfall hinterlegt — statt Ihnen
                einen falschen Fall anzuzeigen, wählen Sie unten direkt eine der sechs
                Ausgangslagen, oder nutzen Sie das KI-Sparring für eine echte Analyse Ihrer Frage.
              </p>
            </div>
          )}
        </div>

        <div className="mt-14">
          <p className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
            Oder direkt eine typische Ausgangslage wählen
          </p>
          <div className="mt-4 flex flex-col divide-y divide-line-soft border-y border-line-soft">
            {scenarioPrompts.map((prompt, i) => (
              <button
                key={prompt.text}
                onClick={() => onSubmit(prompt.text)}
                className="group flex items-center gap-5 py-4 text-left transition-colors hover:bg-ink-800/40"
              >
                <span className="case-number shrink-0 font-mono text-[11px] text-paper-faint">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-sans text-[14.5px] text-paper-dim transition-colors group-hover:text-paper">
                  {prompt.text}
                </span>
                <span className="ml-auto shrink-0 text-paper-faint opacity-0 transition-opacity duration-300 ease-editorial group-hover:opacity-100">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
