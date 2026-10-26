import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { engine } from '../../audio/AudioEngine'
import { useKnobParam } from '../../hooks/useParam'
import { useParamStore } from '../../store/paramStore'
import { clamp, formatValue, fromNorm, toNorm } from '../../utils/dsp-math'

type KnobSize = 'xs' | 'sm' | 'md' | 'lg'

const PX: Record<KnobSize, { dial: number; box: number }> = {
  xs: { dial: 46, box: 64 },
  sm: { dial: 56, box: 72 },
  md: { dial: 76, box: 92 },
  lg: { dial: 104, box: 120 },
}

const START = 135
const SWEEP = 270
const R = 44
const SEGMENTS = 36
const DASH = `${((100 / SEGMENTS) * 0.68).toFixed(3)} ${((100 / SEGMENTS) * 0.32).toFixed(3)}`

function polar(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)]
}

const ARC_PATH = (() => {
  const [x0, y0] = polar(START, R)
  const [x1, y1] = polar(START + SWEEP, R)
  return `M ${x0.toFixed(3)} ${y0.toFixed(3)} A ${R} ${R} 0 1 1 ${x1.toFixed(3)} ${y1.toFixed(3)}`
})()

/** Dash pattern (in pathLength units, 0..100) that reveals the lit part of the ring. */
function litDash(n: number, bipolar: boolean): string {
  if (!bipolar) return `${(n * 100).toFixed(2)} 200`
  if (n >= 0.5) return `0 50 ${((n - 0.5) * 100).toFixed(2)} 200`
  return `0 ${(n * 100).toFixed(2)} ${((0.5 - n) * 100).toFixed(2)} 200`
}

interface KnobProps {
  /** Param id (see core-params.ts or a source definition). */
  id: string
  size?: KnobSize
  label?: string
}

/**
 * Custom SVG rotary control: a segmented ring around a thin dial, numeric readout, and a lock.
 * Drag (Shift = fine), wheel, arrow keys (Shift = fine, PageUp/PageDown = coarse, Home/End),
 * double-click to reset. The hollow marker on the ring is the live value while CHAOS drifts it.
 */
export function Knob({ id, size = 'md', label }: KnobProps) {
  const { def, value, set, reset } = useKnobParam(id)
  const locked = useParamStore((s) => !!s.locks[id])
  const toggleLock = useParamStore((s) => s.toggleLock)
  const maskId = useId().replace(/:/g, '')

  const n = toNorm(def, value)
  const nRef = useRef(n)
  const dialRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<SVGGElement>(null)
  const drag = useRef<{ y: number; n: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const [active, setActive] = useState(false)

  useEffect(() => {
    nRef.current = n
  })

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const bump = () => {
    setActive(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setActive(false), 700)
  }

  const commit = (next: number) => {
    set(fromNorm(def, clamp(next, 0, 1)))
    bump()
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Capture can fail for inactive pointers; the drag still works while the pointer stays over the knob.
    }
    drag.current = { y: e.clientY, n: nRef.current }
    e.currentTarget.focus()
    setActive(true)
    window.clearTimeout(timer.current)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const range = e.shiftKey ? 900 : 190
    commit(d.n + (d.y - e.clientY) / range)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Already released.
    }
    bump()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const fine = e.shiftKey ? 0.2 : 1
    let next: number | null = null
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        next = nRef.current + 0.01 * fine
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        next = nRef.current - 0.01 * fine
        break
      case 'PageUp':
        next = nRef.current + 0.1
        break
      case 'PageDown':
        next = nRef.current - 0.1
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = 1
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        reset()
        bump()
        return
    }
    if (next !== null) {
      e.preventDefault()
      commit(next)
    }
  }

  // Wheel needs a non-passive listener so the page does not scroll while turning a knob.
  useEffect(() => {
    const el = dialRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const scale = e.shiftKey ? 0.00008 : 0.0004
      set(fromNorm(def, clamp(nRef.current - e.deltaY * scale, 0, 1)))
      setActive(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setActive(false), 700)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [def, set])

  // Ghost marker: where chaos has drifted the parameter to. rAF + ref, no React state.
  useEffect(() => {
    if (!def.chaos) return
    let raf = 0
    const tick = () => {
      const g = ghostRef.current
      if (g) {
        const s = useParamStore.getState()
        const live = engine.getLive(id)
        const base = s.values[id] ?? def.def
        const show =
          (s.values.chaos ?? 0) > 0 &&
          engine.status === 'running' &&
          !s.locks[id] &&
          live !== undefined &&
          Math.abs(live - base) > 1e-9
        if (show && live !== undefined) {
          g.setAttribute('transform', `rotate(${START + toNorm(def, live) * SWEEP} 50 50)`)
          g.style.opacity = '1'
        } else {
          g.style.opacity = '0'
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [def, id])

  const px = PX[size]
  const deg = START + n * SWEEP
  const danger = def.danger !== undefined && value > def.danger
  const text = formatValue(def, value)
  const name = label ?? def.label

  return (
    <div className={`relative flex flex-col items-center ${active ? 'knob-active' : ''}`} style={{ width: px.box }}>
      <span className="select-none whitespace-nowrap text-label uppercase text-muted">{name}</span>

      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-label={name}
        aria-valuemin={def.min}
        aria-valuemax={def.max}
        aria-valuenow={Number(value.toFixed(4))}
        aria-valuetext={text}
        title="Drag, wheel or arrow keys. Double-click to reset."
        className="relative mt-1 cursor-ns-resize touch-none rounded-full"
        style={{ width: px.dial, height: px.dial }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => {
          reset()
          bump()
        }}
        onKeyDown={onKeyDown}
      >
        <svg viewBox="-6 -6 112 112" width={px.dial} height={px.dial} className="knob-svg block" aria-hidden="true">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="-6" y="-6" width="112" height="112">
              <path
                d={ARC_PATH}
                pathLength={100}
                fill="none"
                stroke="white"
                strokeWidth={14}
                strokeDasharray={litDash(n, !!def.bipolar)}
              />
            </mask>
          </defs>
          {/* segmented track */}
          <path d={ARC_PATH} pathLength={100} fill="none" className="stroke-line" strokeWidth={5.5} strokeDasharray={DASH} />
          {/* lit segments */}
          <path
            d={ARC_PATH}
            pathLength={100}
            fill="none"
            className={danger ? 'stroke-warn' : 'stroke-accent'}
            strokeWidth={5.5}
            strokeDasharray={DASH}
            mask={`url(#${maskId})`}
          />
          {def.bipolar && <path d="M50 -1 V4" className="stroke-muted" strokeWidth={1.5} />}
          {/* dial */}
          <circle cx="50" cy="50" r="31" className={`fill-panel ${active ? 'stroke-accent' : 'stroke-accent/55'}`} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <circle cx="50" cy="50" r="2.4" className="fill-accent" />
          <g transform={`rotate(${deg.toFixed(2)} 50 50)`}>
            <line x1="62" y1="50" x2="79" y2="50" className={danger ? 'stroke-warn' : 'stroke-accent'} strokeWidth={3} />
          </g>
          {/* chaos ghost marker */}
          <g ref={ghostRef} style={{ opacity: 0 }}>
            <polygon points="95,50 103,45 103,55" className="fill-data" />
          </g>
        </svg>
      </div>

      <output className={`mt-1 tabular-nums text-readout ${danger ? 'text-warn' : 'text-ink'}`}>{text}</output>

      <button
        type="button"
        aria-pressed={locked}
        aria-label={`Lock ${name}`}
        title={locked ? 'Locked: skipped by randomize, mutate and chaos' : 'Lock (skip in randomize, mutate and chaos)'}
        onClick={() => toggleLock(id)}
        className={`absolute right-0 top-[15px] grid h-5 w-5 place-items-center ${locked ? 'text-accent' : 'text-muted/70 hover:text-accent'}`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
          <rect x="2" y="5.5" width="8" height="5.5" fill={locked ? 'currentColor' : 'none'} />
          <path d={locked ? 'M3.8 5.5 V3.6 a2.2 2.2 0 0 1 4.4 0 V5.5' : 'M3.8 5.5 V3.6 a2.2 2.2 0 0 1 4.4 0'} />
        </svg>
      </button>
    </div>
  )
}
