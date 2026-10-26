import { useRef } from 'react'
import { useHudCanvas } from '../../hooks/useHudCanvas'
import { rgba } from '../../utils/theme'

const WINDOW = 1024
const MONO = '11px "JetBrains Mono", ui-monospace, monospace'

/** Oscilloscope trace of the master output, triggered on a rising zero crossing, with auto-gain. */
export function Scope({ className = '' }: { className?: string }) {
  const gain = useRef(1)

  const [canvasRef] = useHudCanvas(({ g, w, h, frame, colors }) => {
    // graticule: hairlines, dotted subdivisions
    g.lineWidth = 1
    g.strokeStyle = rgba(colors.line, 0.75)
    g.setLineDash([2, 5])
    g.beginPath()
    for (let i = 1; i < 8; i++) {
      const x = Math.round((w / 8) * i) + 0.5
      g.moveTo(x, 0)
      g.lineTo(x, h)
    }
    for (const f of [0.25, 0.75]) {
      const y = Math.round(h * f) + 0.5
      g.moveTo(0, y)
      g.lineTo(w, y)
    }
    g.stroke()
    g.setLineDash([])
    g.strokeStyle = rgba(colors.line, 1)
    g.beginPath()
    g.moveTo(0, Math.round(h / 2) + 0.5)
    g.lineTo(w, Math.round(h / 2) + 0.5)
    g.stroke()

    g.font = MONO
    g.textBaseline = 'top'
    g.fillStyle = rgba(colors.muted, 1)

    if (!frame.active) {
      gain.current = 1
      g.textAlign = 'center'
      g.fillText('STANDBY', w / 2, h / 2 + 10)
      g.textAlign = 'left'
      return
    }

    const data = frame.time
    let start = 0
    for (let i = 1; i < data.length - WINDOW; i++) {
      if (data[i - 1] < 0 && data[i] >= 0) {
        start = i
        break
      }
    }
    let peak = 0
    for (let i = 0; i < WINDOW; i++) {
      const a = Math.abs(data[start + i])
      if (a > peak) peak = a
    }
    const target = Math.min(40, Math.max(1, 0.8 / Math.max(peak, 1e-4)))
    gain.current += (target - gain.current) * (target < gain.current ? 0.4 : 0.04)

    g.shadowColor = rgba(colors.accent, 0.6)
    g.shadowBlur = 6
    g.strokeStyle = rgba(colors.accent, 1)
    g.lineWidth = 1.5
    g.lineJoin = 'round'
    g.beginPath()
    const amp = (h / 2) * 0.9 * gain.current
    for (let x = 0; x <= w; x++) {
      const idx = start + Math.min(WINDOW - 1, Math.floor((x / w) * WINDOW))
      const y = Math.min(h - 2, Math.max(2, h / 2 - data[idx] * amp))
      if (x === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
    g.shadowBlur = 0

    g.textAlign = 'right'
    g.fillText(`AUTO \u00D7${gain.current.toFixed(1)}`, w - 8, 6)
    g.textAlign = 'left'
  })

  return <canvas ref={canvasRef} className={`block h-full w-full ${className}`} role="img" aria-label="Oscilloscope of the master output" />
}
