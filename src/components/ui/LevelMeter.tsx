import { useRef } from 'react'
import { useHudCanvas } from '../../hooks/useHudCanvas'
import { gainToDb } from '../../utils/dsp-math'
import { rgba } from '../../utils/theme'

const SEGMENTS = 24
const DB_MIN = -60
const DB_STEP = -DB_MIN / SEGMENTS
const BAR_W = 20
const GAP = 6
const LABEL_H = 18
const MONO = '11px "JetBrains Mono", ui-monospace, monospace'

/** Segmented stereo peak meter (L/R) with peak hold and a numeric peak readout. */
export function LevelMeter({ className = '' }: { className?: string }) {
  const state = useRef({ db: [DB_MIN, DB_MIN], hold: [DB_MIN, DB_MIN], holdAt: [0, 0] })

  const [canvasRef] = useHudCanvas(({ g, h, frame, now, colors }) => {
    const s = state.current
    const peaks = [frame.peakL, frame.peakR]
    let moving = false

    for (let c = 0; c < 2; c++) {
      const target = frame.active ? Math.max(DB_MIN, gainToDb(peaks[c])) : DB_MIN
      s.db[c] = target > s.db[c] ? target : Math.max(target, s.db[c] - 1.1)
      if (s.db[c] > DB_MIN + 0.1) moving = true
      if (s.db[c] >= s.hold[c]) {
        s.hold[c] = s.db[c]
        s.holdAt[c] = now
      } else if (now - s.holdAt[c] > 1400) {
        s.hold[c] = Math.max(DB_MIN, s.hold[c] - 0.8)
      }
    }

    const plotH = h - LABEL_H
    const segH = plotH / SEGMENTS
    for (let c = 0; c < 2; c++) {
      const x = c * (BAR_W + GAP)
      const lit = Math.floor((s.db[c] - DB_MIN) / DB_STEP + 0.0001)
      const holdSeg = Math.min(SEGMENTS - 1, Math.max(0, Math.floor((s.hold[c] - DB_MIN) / DB_STEP)))
      for (let i = 0; i < SEGMENTS; i++) {
        const y = plotH - (i + 1) * segH + 1
        const db = DB_MIN + (i + 1) * DB_STEP
        const hot = db > -3
        const isLit = i < lit
        const isHold = i === holdSeg && s.hold[c] > DB_MIN + DB_STEP
        g.fillStyle = isLit
          ? hot ? rgba(colors.warn, 1) : rgba(colors.accent, db > -12 ? 1 : 0.85)
          : isHold
            ? rgba(hot ? colors.warn : colors.ink, 1)
            : rgba(colors.line, 0.55)
        g.fillRect(x, y, BAR_W, Math.max(1, segH - 2))
      }
      g.fillStyle = rgba(colors.muted, 1)
      g.font = MONO
      g.textBaseline = 'top'
      g.textAlign = 'center'
      g.fillText(c === 0 ? 'L' : 'R', x + BAR_W / 2, plotH + 4)
    }

    // scale
    const scaleX = 2 * BAR_W + GAP + 10
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.fillStyle = rgba(colors.muted, 1)
    for (const db of [0, -12, -24, -36, -48]) {
      const y = plotH - ((db - DB_MIN) / -DB_MIN) * plotH + 1
      g.fillRect(2 * BAR_W + GAP + 2, Math.round(y), 5, 1)
      g.fillText(db === 0 ? '0' : `\u2212${-db}`, scaleX, Math.min(h - LABEL_H - 6, Math.max(6, y)))
    }
    const pk = Math.max(s.hold[0], s.hold[1])
    g.textBaseline = 'top'
    g.fillStyle = rgba(pk > -3 ? colors.warn : colors.ink, 1)
    g.fillText(pk <= DB_MIN + 0.5 ? '\u2212\u221E dB' : `${pk < 0 ? '\u2212' : ''}${Math.abs(pk).toFixed(1)}`, scaleX, plotH + 4)
    g.textAlign = 'left'
    return moving
  })

  return <canvas ref={canvasRef} className={`block ${className}`} role="img" aria-label="Output level meter" />
}
