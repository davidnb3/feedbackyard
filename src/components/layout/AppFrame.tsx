import type { ReactNode } from 'react'

/** The outer HUD frame: a hairline outline with stepped (chamfered) corners and dot terminals. */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col p-3 short:p-2">
      <div className="relative flex flex-1 flex-col px-6 pb-6 pt-5 short:pb-4 short:pt-4" style={{ ['--c' as string]: '34px' }}>
        <div className="chamfer pointer-events-none absolute inset-0 bg-line" aria-hidden="true" />
        <div className="chamfer-in pointer-events-none absolute inset-[1px] bg-bg" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-[3px] top-[26px] h-[7px] w-[7px] rounded-full bg-accent" aria-hidden="true" />
        <span className="pointer-events-none absolute -left-[3px] bottom-[26px] h-[7px] w-[7px] rounded-full bg-accent" aria-hidden="true" />
        <div className="relative flex flex-1 flex-col gap-4 short:gap-2">{children}</div>
      </div>
    </div>
  )
}
