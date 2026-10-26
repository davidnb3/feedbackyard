import { useRef } from 'react'
import { useHudCanvas } from '../../hooks/useHudCanvas'
import { rgba } from '../../utils/theme'

const BARS = 56
const F_MIN = 30
const F_MAX = 16000
const DB_FLOOR = -100
const DB_CEIL = -30
const AXIS = 16
const MONO = '11px "JetBrains Mono", ui-monospace, monospace'

/** Log-frequency spectrum as thin vertical bars with a bright cap. */
export function Spectrum({ className = '' }: { className?: string }) {
  const levels = useRef(new Float32Array(BARS))

  const [canvasRef] = useHudCanvas(({ g, w, h, frame, colors }) => {
    const lv = levels.current
    const plotH = h - AXIS
    const binHz = frame.sampleRate / (frame.freq.length * 2)
    const fMax = Math.min(F_MAX, frame.sampleRate / 2)
    let any = false

    for (let i = 0; i < BARS; i++) {
      let target = 0
      if (frame.active) {
        const f0 = F_MIN * Math.pow(fMax / F_MIN, i / BARS)
        const f1 = F_MIN * Math.pow(fMax / F_MIN, (i + 1) / BARS)
        const b0 = Math.max(1, Math.floor(f0 / binHz))
        const b1 = Math.max(b0, Math.min(frame.freq.length - 1, Math.floor(f1 / binHz)))
        let db = DB_FLOOR
        for (let b = b0; b <= b1; b++) if (frame.freq[b] > db) db = frame.freq[b]
        target = Math.min(1, Math.max(0, (db - DB_FLOOR) / (DB_CEIL - DB_FLOOR)))
      }
      lv[i] = target > lv[i] ? lv[i] + (target - lv[i]) * 0.6 : Math.max(target, lv[i] - 0.03)
      if (lv[i] > 0.004) any = true
    }

    // axis
    g.strokeStyle = rgba(colors.line, 1)
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(0, plotH + 0.5)
    g.lineTo(w, plotH + 0.5)
    g.stroke()
    g.font = MONO
    g.textBaseline = 'top'
    g.fillStyle = rgba(colors.muted, 1)
    for (const [f, label] of [[100, '100'], [1000, '1k'], [10000, '10k']] as const) {
      if (f > fMax) continue
      const x = Math.round((Math.log(f / F_MIN) / Math.log(fMax / F_MIN)) * w)
      g.textAlign = 'center'
      g.fillText(label, Math.min(w - 12, Math.max(12, x)), plotH + 3)
      g.fillRect(x, plotH - 3, 1, 3)
    }

    const bw = w / BARS
    for (let i = 0; i < BARS; i++) {
      const bh = Math.round(lv[i] * (plotH - 2))
      const x = Math.round(i * bw) + 1
      const width = Math.max(1, Math.round(bw) - 3)
      if (bh <= 0) {
        g.fillStyle = rgba(colors.line, 1)
        g.fillRect(x, plotH - 2, width, 2)
        continue
      }
      g.fillStyle = rgba(colors.accent, 0.8)
      g.fillRect(x, plotH - bh, width, bh)
      g.fillStyle = rgba(colors.ink, 1)
      g.fillRect(x, plotH - bh, width, 2)
    }
    g.textAlign = 'left'
    return any
  })

  return <canvas ref={canvasRef} className={`block h-full w-full ${className}`} role="img" aria-label="Spectrum of the master output" />
}
