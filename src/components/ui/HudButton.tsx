import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'accent' | 'warn' | 'ghost'
type Size = 'xl' | 'lg' | 'md' | 'sm'

const SIZE: Record<Size, { h: string; px: string; text: string; c: number }> = {
  xl: { h: 'h-[68px]', px: 'px-8', text: 'text-[15px] tracking-wide2 font-bold', c: 16 },
  lg: { h: 'h-[52px]', px: 'px-5', text: 'text-title font-bold', c: 12 },
  md: { h: 'h-10', px: 'px-4', text: 'text-label font-bold', c: 9 },
  sm: { h: 'h-8', px: 'px-3', text: 'text-label', c: 7 },
}

const VARIANT: Record<Variant, { stroke: string; strokeActive: string; fill: string; fillActive: string; text: string; textActive: string; glow: string }> = {
  accent: {
    stroke: 'bg-accent/70 group-hover:bg-accent',
    strokeActive: 'bg-accent',
    fill: 'bg-panel group-hover:bg-accent/15',
    fillActive: 'bg-accent',
    text: 'text-accent',
    textActive: 'text-bg',
    glow: 'glow-accent',
  },
  warn: {
    stroke: 'bg-warn/75 group-hover:bg-warn',
    strokeActive: 'bg-warn',
    fill: 'bg-panel group-hover:bg-warn/15',
    fillActive: 'bg-warn',
    text: 'text-warn',
    textActive: 'text-bg',
    glow: 'glow-warn',
  },
  ghost: {
    stroke: 'bg-line group-hover:bg-accent/70',
    strokeActive: 'bg-accent',
    fill: 'bg-panel group-hover:bg-accent/10',
    fillActive: 'bg-accent/20',
    text: 'text-ink',
    textActive: 'text-accent',
    glow: 'glow-accent',
  },
}

interface HudButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Latched/on state: flat fill, plus a soft glow. */
  active?: boolean
  icon?: ReactNode
  trailing?: ReactNode
}

/** Chamfered hairline button. Flat fills, glow only while active. */
export const HudButton = forwardRef<HTMLButtonElement, HudButtonProps>(function HudButton(
  {
    variant = 'accent',
    size = 'md',
    active = false,
    icon,
    trailing,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const s = SIZE[size]
  const v = VARIANT[variant]
  return (
    <button
      ref={ref}
      type={type}
      className={`group relative inline-flex select-none items-center justify-center uppercase disabled:pointer-events-none disabled:opacity-35 ${s.h} ${s.px} ${s.text} ${active ? v.glow : ''} ${className}`}
      style={{ ['--c' as string]: `${s.c}px` }}
      {...rest}
    >
      <span className={`chamfer pointer-events-none absolute inset-0 transition-colors ${active ? v.strokeActive : v.stroke}`} aria-hidden="true" />
      <span className={`chamfer-in pointer-events-none absolute inset-[1px] transition-colors ${active ? v.fillActive : v.fill}`} aria-hidden="true" />
      <span className={`relative flex items-center gap-3 ${active ? v.textActive : v.text}`}>
        {icon}
        {children}
        {trailing}
      </span>
    </button>
  )
})
