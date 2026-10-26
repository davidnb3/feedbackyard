import type { ReactNode } from 'react'
import { HatchBlock } from './Deco'

interface PanelProps {
  title: string
  /** Small section number shown before the title, for example "01". */
  index?: string
  right?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

/**
 * Hairline panel with a chamfered top-left and bottom-right corner, corner ticks on the other
 * two corners, and a title tab whose connector line ends in a dot terminal.
 */
export function Panel({ title, index, right, className = '', bodyClassName = '', children }: PanelProps) {
  return (
    <section className={`relative flex min-h-0 flex-col ${className}`} style={{ ['--c' as string]: '18px' }} aria-label={title}>
      <div className="chamfer pointer-events-none absolute inset-0 bg-line" aria-hidden="true" />
      <div className="chamfer-in pointer-events-none absolute inset-[1px] bg-panel" aria-hidden="true" />
      {/* corner ticks on the two square corners */}
      <span className="pointer-events-none absolute -right-[3px] -top-[3px] h-2 w-2 border-r border-t border-accent" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-[3px] -left-[3px] h-2 w-2 border-b border-l border-accent" aria-hidden="true" />

      <header className="relative flex items-center gap-3 pl-6 pr-4 pt-3">
        <HatchBlock width={22} height={8} stripe={3} className="text-accent" />
        {index && <span className="text-label text-muted">{index}</span>}
        <h2 className="font-display text-title font-bold uppercase text-accent">{title}</h2>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        {right}
        <span className="h-[5px] w-[5px] rounded-full bg-accent" aria-hidden="true" />
      </header>

      <div className={`relative min-h-0 flex-1 px-4 pb-4 pt-3 short:pb-3 short:pt-2 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
