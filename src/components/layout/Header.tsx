import { engine } from '../../audio/AudioEngine'
import { useEngineStore } from '../../store/engineStore'
import { Barcode, Fan } from '../ui/Deco'
import { ThemeSwitch } from './ThemeSwitch'

const STATUS_TEXT = { idle: 'Idle', starting: 'Starting', running: 'Running', stopping: 'Stopping' } as const

export function Header() {
  const status = useEngineStore((s) => s.status)
  const running = status === 'running'

  return (
    <header className="flex items-center gap-4">
      <Fan size={30} spinning={running} className={running ? 'text-accent' : 'text-muted'} />
      <h1 className="font-display text-[17px] uppercase leading-none tracking-wide2">
        <span className="font-bold text-accent">Feedback</span>
        <span className="font-normal text-ink">yard</span>
      </h1>

      {/* connector line with dot terminals */}
      <div className="flex min-w-0 flex-1 items-center" aria-hidden="true">
        <span className="h-[5px] w-[5px] rounded-full bg-accent" />
        <span className="h-px flex-1 bg-line" />
        <span className="h-[5px] w-[5px] rounded-full bg-accent" />
      </div>

      <div className="flex items-center gap-5 text-label uppercase">
        <span className="flex items-center gap-2">
          <span className="text-muted">Engine</span>
          <span className={running ? 'font-bold text-accent glow-text-accent' : 'text-ink'}>{STATUS_TEXT[status]}</span>
        </span>
        <span className="flex items-center gap-2 text-muted">
          <span>{(engine.sampleRate / 1000).toFixed(1)} kHz</span>
          <span aria-hidden="true">/</span>
          <span>Stereo</span>
        </span>
        <Barcode seed={3} bars={20} width={64} height={12} className="text-accent/70" />
      </div>
      <ThemeSwitch />
    </header>
  )
}
