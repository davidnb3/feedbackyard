import { useEffect, useRef } from 'react'
import { getKnob } from '../../audio/paramRegistry'
import { useHudCanvas } from '../../hooks/useHudCanvas'
import { useKnobParam } from '../../hooks/useParam'
import { useParamStore } from '../../store/paramStore'
import { gainToDb } from '../../utils/dsp-math'
import { rgba } from '../../utils/theme'

const START = 135
const SWEEP = 270
const OUTER_SEGS = 54
const INNER_SEGS = 40
const feedbackDef = getKnob('feedback')

/**
 * Segmented ring gauge. Outer ring = feedback amount (segments past 100% turn warning color).
 * Inner ring = live loop energy (RMS of the master). Idle: calm and static.
 */
export function RingGauge({ size = 168 }: { size?: number }) {
  const energy = useRef(0)
  const { value } = useKnobParam('feedback')

  const [canvasRef, invalidate] = useHudCanvas(({ g, w, h, frame, colors }) => {
    const cx = w / 2
    const cy = h / 2
    const fb = useParamStore.getState().values.feedback ?? feedbackDef.def
    const fbFrac = fb / feedbackDef.max
    const unityFrac = 1 / feedbackDef.max

    const rms = Math.max(frame.rmsL, frame.rmsR)
    const targetE = frame.active ? Math.min(1, Math.max(0, (gainToDb(rms) + 54) / 54)) : 0
    energy.current += (targetE - energy.current) * (targetE > energy.current ? 0.35 : 0.08)
    const e = energy.current

    const rOuter = Math.min(cx, cy) - 8
    const rInner = rOuter - 18
    const segArc = (SWEEP / OUTER_SEGS) * (Math.PI / 180)

    g.lineCap = 'butt'
    // outer ring: feedback amount
    g.lineWidth = 8
    for (let i = 0; i < OUTER_SEGS; i++) {
      const f0 = i / OUTER_SEGS
      const a0 = ((START + f0 * SWEEP) * Math.PI) / 180
      const lit = f0 + 0.0001 < fbFrac
      const over = f0 >= unityFrac - 0.0001
      g.strokeStyle = lit ? rgba(over ? colors.warn : colors.accent, 1) : rgba(over ? colors.warn : colors.line, over ? 0.28 : 0.7)
      if (lit && frame.active) {
        g.shadowColor = rgba(over ? colors.warn : colors.accent, 0.5)
        g.shadowBlur = 5
      } else {
        g.shadowBlur = 0
      }
      g.beginPath()
      g.arc(cx, cy, rOuter, a0, a0 + segArc * 0.62)
      g.stroke()
    }
    g.shadowBlur = 0

    // inner ring: loop energy
    const innerArc = (SWEEP / INNER_SEGS) * (Math.PI / 180)
    g.lineWidth = 4
    for (let i = 0; i < INNER_SEGS; i++) {
      const f0 = i / INNER_SEGS
      const a0 = ((START + f0 * SWEEP) * Math.PI) / 180
      const lit = f0 + 0.0001 < e
      g.strokeStyle = lit ? rgba(colors.data, 1) : rgba(colors.line, 0.55)
      g.beginPath()
      g.arc(cx, cy, rInner, a0, a0 + innerArc * 0.62)
      g.stroke()
    }

    // hairline ring and cardinal ticks
    g.lineWidth = 1
    g.strokeStyle = rgba(colors.line, 1)
    g.beginPath()
    g.arc(cx, cy, rInner - 10, 0, Math.PI * 2)
    g.stroke()
    g.strokeStyle = rgba(colors.accent, 0.7)
    for (const deg of [270, 0, 90, 180]) {
      const a = (deg * Math.PI) / 180
      g.beginPath()
      g.moveTo(cx + Math.cos(a) * (rOuter + 5), cy + Math.sin(a) * (rOuter + 5))
      g.lineTo(cx + Math.cos(a) * (rOuter + 8), cy + Math.sin(a) * (rOuter + 8))
      g.stroke()
    }
    return energy.current > 0.004
  })

  // Redraw (once) when the feedback knob moves while the engine is idle.
  useEffect(() => {
    invalidate()
  }, [value, invalidate])

  const danger = value > 1

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Feedback amount and loop energy" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-label uppercase text-muted">Feedback</span>
        <span className={`font-display text-[22px] font-bold tabular-nums ${danger ? 'text-warn' : 'text-accent'}`}>
          {(value * 100).toFixed(0)}
          <span className="text-[12px]">%</span>
        </span>
        <span className="mt-1 text-label uppercase text-data">Energy</span>
      </div>
    </div>
  )
}
