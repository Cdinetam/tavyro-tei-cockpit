import type { ReactNode } from 'react'

interface SectionShellProps {
  id: string
  code?: string
  title: string
  description?: string
  children: ReactNode
  delayClass?: string
}

export function SectionShell({ id, title, description, children, delayClass }: SectionShellProps) {
  return (
    <section id={id} className={`scroll-mt-24 border-t border-line-soft py-12 fade-in ${delayClass ?? ''}`}>
      <h2 className="font-display text-xl font-medium text-paper sm:text-2xl">{title}</h2>
      {description && (
        <p className="mt-2 max-w-2xl font-sans text-[13.5px] leading-relaxed text-paper-faint">
          {description}
        </p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  )
}
