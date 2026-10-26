import { useEffect, useRef, useState } from 'react'
import { MAX_RECORD_SECONDS } from '../../audio/AudioEngine'
import type { RecordedTake } from '../../audio/Recorder'
import { useHudCanvas } from '../../hooks/useHudCanvas'
import { useEngineStore } from '../../store/engineStore'
import { useTakesStore } from '../../store/takesStore'
import { gainToDb } from '../../utils/dsp-math'
import { rgba } from '../../utils/theme'
import { downloadTake, formatDuration, getTakeUrl } from '../../utils/wav'
import { PlayIcon, StopIcon } from '../ui/Deco'
import { HudButton } from '../ui/HudButton'
import { Panel } from '../ui/Panel'
import { RecTimer } from '../ui/RecTimer'

const REC_SEGMENTS = 36

/** Horizontal segmented level bar for the take being recorded. */
function RecBar() {
  const level = useRef(0)
  const [canvasRef] = useHudCanvas(({ g, w, h, frame, colors }) => {
    const recording = useEngineStore.getState().recording
    const target = recording && frame.active ? Math.min(1, Math.max(0, (gainToDb(Math.max(frame.peakL, frame.peakR)) + 54) / 54)) : 0
    level.current = target > level.current ? target : Math.max(target, level.current - 0.025)
    const segW = w / REC_SEGMENTS
    const lit = Math.round(level.current * REC_SEGMENTS)
    for (let i = 0; i < REC_SEGMENTS; i++) {
      g.fillStyle = i < lit ? rgba(colors.warn, i > REC_SEGMENTS * 0.8 ? 1 : 0.85) : rgba(colors.line, 0.55)
      g.fillRect(Math.round(i * segW), 0, Math.max(1, Math.floor(segW) - 2), h)
    }
    return level.current > 0.01
  })
  return <canvas ref={canvasRef} className="block h-3 w-full" role="img" aria-label="Recording level" />
}

function Waveform({ take }: { take: RecordedTake }) {
  const [canvasRef] = useHudCanvas(({ g, w, h, colors }) => {
    const bins = take.peaks.length
    const bw = w / bins
    // Display-only normalisation so quiet takes still show their shape (audio is untouched).
    let top = 0
    for (let i = 0; i < bins; i++) top = Math.max(top, take.peaks[i])
    const scale = top > 1e-5 ? Math.min(1 / top, 400) : 1
    g.fillStyle = rgba(colors.accent, 0.85)
    for (let i = 0; i < bins; i++) {
      const bh = Math.max(1, Math.round(Math.min(1, take.peaks[i] * scale) * (h - 2)))
      g.fillRect(Math.round(i * bw), Math.round((h - bh) / 2), Math.max(1, Math.floor(bw) - 1), bh)
    }
  }, false)
  return <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label={`Waveform of take ${take.number}`} />
}

function TakeRow({ take }: { take: RecordedTake }) {
  const remove = useTakesStore((s) => s.remove)
  const audio = useRef<HTMLAudioElement | null>(null)
  const head = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    let a = audio.current
    if (!a) {
      a = new Audio(getTakeUrl(take))
      a.addEventListener('play', () => setPlaying(true))
      a.addEventListener('pause', () => setPlaying(false))
      a.addEventListener('ended', () => setPlaying(false))
      audio.current = a
    }
    if (a.paused) {
      document.querySelectorAll('audio').forEach((el) => el.pause())
      if (a.ended) a.currentTime = 0
      void a.play()
    } else {
      a.pause()
    }
  }

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const a = audio.current
      if (a && head.current) head.current.style.left = `${Math.min(100, (a.currentTime / take.duration) * 100)}%`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, take.duration])

  useEffect(
    () => () => {
      audio.current?.pause()
    },
    [],
  )

  return (
    <li className="grid grid-cols-[64px_minmax(120px,1fr)_72px_auto] items-center gap-3 border-b border-line/60 py-1.5 last:border-b-0">
      <span className="text-label font-bold uppercase text-accent">Take {String(take.number).padStart(2, '0')}</span>
      <div className="relative h-8 border border-line">
        <Waveform take={take} />
        <div ref={head} className="pointer-events-none absolute inset-y-0 w-px bg-ink" style={{ left: 0, opacity: playing ? 1 : 0 }} />
      </div>
      <span className="tabular-nums text-readout text-ink">{formatDuration(take.duration)}</span>
      <div className="flex items-center gap-2">
        <HudButton
          size="sm"
          variant="ghost"
          active={playing}
          aria-label={playing ? `Stop take ${take.number}` : `Play take ${take.number}`}
          onClick={toggle}
          icon={playing ? <StopIcon /> : <PlayIcon />}
        >
          {playing ? 'Stop' : 'Play'}
        </HudButton>
        <HudButton size="sm" aria-label={`Download take ${take.number} as WAV`} onClick={() => downloadTake(take)}>
          WAV
        </HudButton>
        <HudButton size="sm" variant="ghost" aria-label={`Delete take ${take.number}`} onClick={() => remove(take.id)}>
          &times;
        </HudButton>
      </div>
    </li>
  )
}

export function RecordPanel({ className = '' }: { className?: string }) {
  const takes = useTakesStore((s) => s.takes)
  const recording = useEngineStore((s) => s.recording)

  return (
    <Panel title="Record / Takes" index="07" className={className} bodyClassName="flex gap-5">
      <div className="flex w-[210px] shrink-0 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${recording ? 'bg-warn shadow-[0_0_8px_rgb(var(--warn)/0.8)]' : 'border border-muted'}`} aria-hidden="true" />
            <span className={`text-label uppercase ${recording ? 'font-bold text-warn' : 'text-muted'}`}>{recording ? 'Recording' : 'Idle'}</span>
          </div>
          <RecTimer className={`mt-1 block font-display text-[24px] font-bold leading-none ${recording ? 'text-warn' : 'text-ink'}`} />
        </div>
        <div>
          <RecBar />
          <p className="mt-2 text-label uppercase text-muted">Max {formatDuration(MAX_RECORD_SECONDS).slice(0, 5)} per take</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {takes.length === 0 ? (
          <p className="pt-3 text-label uppercase text-muted">No takes yet. REC records what you hear; stopping keeps the loop running.</p>
        ) : (
          <ul aria-label="Recorded takes">
            {takes.map((t) => (
              <TakeRow key={t.id} take={t} />
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
