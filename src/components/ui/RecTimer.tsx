import { useEffect, useRef } from 'react'
import { engine } from '../../audio/AudioEngine'
import { formatDuration } from '../../utils/wav'

/** Recording clock. Updated through a ref in rAF, never React state. */
export function RecTimer({ className = '', idle = '00:00.0' }: { className?: string; idle?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = ref.current
      if (el) {
        const text = engine.isRecording ? formatDuration(engine.recordingElapsed()) : idle
        if (el.textContent !== text) el.textContent = text
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [idle])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {idle}
    </span>
  )
}
