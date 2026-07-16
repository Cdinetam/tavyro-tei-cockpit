import { useState } from 'react'
import { isMockMode } from '../lib/aiClient'

interface Props {
  onSubmit: (text: string) => void
}

const inspirations = [
  'Welche Entscheidung bereitet mir aktuell die grösste Unsicherheit?',
  'Ich komme nicht mehr aus dem operativen Tagesgeschäft.',
  'Ich bin unsicher, ob mein Management-Team richtig aufgestellt ist.',
  'Wir haben gute Leute, aber die Zusammenarbeit funktioniert nicht.',
]

export function AiScenarioInput({ onSubmit }: Props) {
  const [value, setValue] = useState('')

  return (
    <section className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[1400px] flex-col justify-center px-6 py-16 lg:px-10">
      <div className="mx-auto w-full max-w-2xl fade-in">
        <p className="font-mono text-[11px] uppercase tracking-widest2 text-brass-light">
          TEI® Trust Room · vertraulich
        </p>
        <h2 className="mt-4 font-display text-3xl font-medium text-paper sm:text-4xl">
          Was beschäftigt Sie im Moment am meisten?
        </h2>
        <p className="mt-3 max-w-lg font-sans text-[14px] leading-relaxed text-paper-faint">
          TEI® strukturiert Ihre Situation in Echtzeit. Ihr persönlicher Zugang erlaubt eine
          begrenzte Zahl vertiefter Analysen — für die eigentliche Entscheidungsfrage
          empfiehlt TEI® ein vertrauliches Gespräch.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (value.trim().length < 8) return
            onSubmit(value.trim())
          }}
          className="mt-8"
        >
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Beschreiben Sie in eigenen Worten, was Sie gerade beschäftigt…"
            rows={5}
            className="w-full resize-none border border-line bg-ink-800/60 px-5 py-4 font-sans text-[15px] leading-relaxed text-paper placeholder:text-paper-faint/70 transition-colors focus:border-brass-dim"
          />
          <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <span className="flex flex-col gap-1">
              <span className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
                Keine Speicherung Ihrer Eingabe über die Sitzung hinaus
              </span>
              {!isMockMode && (
                <span className="font-mono text-[10px] uppercase tracking-widest2 text-paper-faint/70">
                  Processed within TaVyro's protected Azure OpenAI environment
                </span>
              )}
            </span>
            <button
              type="submit"
              disabled={value.trim().length < 8}
              className="inline-flex items-center gap-2 border border-brass-dim bg-brass/[0.08] px-5 py-2.5 font-sans text-[13px] font-medium text-paper transition-all duration-300 ease-editorial hover:border-brass hover:bg-brass/[0.14] disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-paper-faint"
            >
              Situation analysieren →
            </button>
          </div>
        </form>

        <div className="mt-12">
          <p className="font-mono text-[10.5px] uppercase tracking-widest2 text-paper-faint">
            Zur Orientierung
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {inspirations.map((text) => (
              <button
                key={text}
                onClick={() => setValue(text)}
                className="border border-line-soft px-3 py-2 text-left font-sans text-[13px] text-paper-faint transition-colors hover:border-line-strong hover:text-paper-dim"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
