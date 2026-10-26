import { useEffect, useRef } from 'react'
import { engine, type Frame } from '../../audio/AudioEngine'

interface FrameLampProps {
  label: string
  /** Called every animation frame while the engine is active. */
  test: (frame: Frame) => boolean
  /** The lamp holds for this long after the condition ends, so short events stay visible. */
  holdMs?: number
}

/** Indicator lamp driven by rAF and a ref (no React state). Lit lamps are always the warning color. */
export function FrameLamp({ label, test, holdMs = 600 }: FrameLampProps) {
  const lampRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const testRef = useRef(test)

  useEffect(() => {
    testRef.current = test
  })

  useEffect(() => {
    let raf = 0
    let until = 0
    let lit = false
    const tick = (now: number) => {
      const frame = engine.readFrame(now)
      if (frame.active && testRef.current(frame)) until = now + holdMs
      const next = now < until
      if (next !== lit) {
        lit = next
        lampRef.current?.setAttribute('data-on', String(next))
        textRef.current?.setAttribute('data-on', String(next))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [holdMs])

  return (
    <span className="inline-flex items-center gap-2" role="status" aria-label={label}>
      <span
        ref={lampRef}
        data-on="false"
        className="h-3 w-3 border border-line bg-bg transition-colors data-[on=true]:border-warn data-[on=true]:bg-warn data-[on=true]:shadow-[0_0_8px_rgb(var(--warn)/0.7)]"
      />
      <span ref={textRef} data-on="false" className="text-label uppercase text-muted data-[on=true]:text-warn">
        {label}
      </span>
    </span>
  )
}
