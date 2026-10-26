import type { CSSProperties } from 'react'

/*
 * Decorative HUD elements taken from the reference sheets: barcode strips, chevron rows, hatch
 * blocks, dot rows, filled square trios, pinwheel fan, reticle, asterisk and sparkle icons.
 * They use currentColor, so the parent decides the color. Use sparingly: structure, not wallpaper.
 */

/** Deterministic pseudo-random barcode from a seed. */
export function Barcode({ seed = 1, bars = 28, width = 120, height = 14, className = '' }: {
  seed?: number
  bars?: number
  width?: number
  height?: number
  className?: string
}) {
  // Pure hash of (seed, index): the same seed always draws the same strip.
  const rand = (i: number) => {
    const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
    return v - Math.floor(v)
  }
  const rects: { x: number; w: number }[] = []
  let x = 0
  for (let i = 0; i < bars; i++) {
    const w = rand(i * 3) < 0.35 ? 3 : rand(i * 3 + 1) < 0.5 ? 2 : 1
    rects.push({ x, w })
    x += w + (rand(i * 3 + 2) < 0.4 ? 3 : 2)
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${x} 10`} preserveAspectRatio="none" className={className} aria-hidden="true">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={10} fill="currentColor" />
      ))}
    </svg>
  )
}

export function Chevrons({ count = 8, size = 12, dir = 'right', className = '' }: {
  count?: number
  size?: number
  dir?: 'left' | 'right'
  className?: string
}) {
  const step = size * 0.7
  const w = count * step + size * 0.3
  return (
    <svg width={w} height={size} viewBox={`0 0 ${w} ${size}`} className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.5}>
      {Array.from({ length: count }, (_, i) => {
        const x = i * step + 2
        const pts = dir === 'right'
          ? `${x},1 ${x + size * 0.45},${size / 2} ${x},${size - 1}`
          : `${x + size * 0.45},1 ${x},${size / 2} ${x + size * 0.45},${size - 1}`
        return <polyline key={i} points={pts} />
      })}
    </svg>
  )
}

/** Diagonal stripe block (flat fill). */
export function HatchBlock({ width = 40, height = 10, stripe = 4, className = '' }: {
  width?: number
  height?: number
  stripe?: number
  className?: string
}) {
  const style: CSSProperties = {
    width,
    height,
    backgroundImage: `repeating-linear-gradient(115deg, currentColor 0 ${stripe}px, transparent ${stripe}px ${stripe * 2}px)`,
  }
  return <span className={`inline-block ${className}`} style={style} aria-hidden="true" />
}

export function DotRow({ count = 3, size = 4, gap = 4, className = '' }: {
  count?: number
  size?: number
  gap?: number
  className?: string
}) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="rounded-full bg-current" style={{ width: size, height: size }} />
      ))}
    </span>
  )
}

export function SquareTrio({ size = 6, gap = 4, className = '' }: { size?: number; gap?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap }} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="bg-current" style={{ width: size, height: size }} />
      ))}
    </span>
  )
}

/** Pinwheel from the reference sheet. Spins slowly only when `spinning`. */
export function Fan({ size = 28, spinning = false, className = '' }: { size?: number; spinning?: boolean; className?: string }) {
  const blades = 9
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`${spinning ? 'animate-spin-slow' : ''} ${className}`} aria-hidden="true">
      {Array.from({ length: blades }, (_, i) => (
        <path
          key={i}
          transform={`rotate(${(360 / blades) * i} 50 50)`}
          d="M50 50 C 47 30, 58 12, 80 10 C 66 20, 60 34, 50 50 Z"
          fill="currentColor"
        />
      ))}
      <circle cx="50" cy="50" r="6" fill="currentColor" />
    </svg>
  )
}

export function ReticleIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={5}>
      <circle cx="50" cy="52" r="38" />
      <path d="M50 8 V20 M50 84 V96 M6 52 H18 M82 52 H94" />
      <path d="M30 32 L70 72 M70 32 L30 72" strokeDasharray="7 6" />
      <path d="M42 0 H58 L50 10 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function AsteriskIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" stroke="currentColor" strokeWidth={14}>
      <path d="M50 8 V92 M13.6 29 L86.4 71 M13.6 71 L86.4 29" />
    </svg>
  )
}

export function SparkleIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" fill="currentColor">
      <path d="M50 2 Q54 46 98 50 Q54 54 50 98 Q46 54 2 50 Q46 46 50 2 Z" />
    </svg>
  )
}

export function PlayIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" fill="currentColor">
      <path d="M22 10 L90 50 L22 90 Z" />
    </svg>
  )
}

export function StopIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true" fill="currentColor">
      <rect x="16" y="16" width="68" height="68" />
    </svg>
  )
}
