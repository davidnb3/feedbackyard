import { useEffect, useState } from 'react'
import { engine } from '../../audio/AudioEngine'
import { useEngineStore } from '../../store/engineStore'
import { useParamStore } from '../../store/paramStore'
import { AsteriskIcon, Chevrons, ReticleIcon } from '../ui/Deco'
import { HudButton } from '../ui/HudButton'
import { RecTimer } from '../ui/RecTimer'
import { WarningModal } from './WarningModal'

function Divider() {
  return <span className="h-10 w-px bg-line" aria-hidden="true" />
}

/** START/STOP, KICK, PANIC, RANDOMIZE (+ MUTATE, UNDO) and REC: the controls that must be unmistakable. */
export function TransportBar() {
  const status = useEngineStore((s) => s.status)
  const recording = useEngineStore((s) => s.recording)
  const acknowledged = useEngineStore((s) => s.warningAcknowledged)
  const acknowledge = useEngineStore((s) => s.acknowledgeWarning)
  const toggle = useEngineStore((s) => s.toggle)
  const canUndo = useParamStore((s) => s.history.length > 0)
  const [warnOpen, setWarnOpen] = useState(false)

  const running = status === 'running'
  const busy = status === 'starting' || status === 'stopping'

  // Esc is PANIC. The warning modal handles Esc itself (and prevents default).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) engine.panic()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onStartStop = () => {
    if (running) void toggle()
    else if (!acknowledged) setWarnOpen(true)
    else void toggle()
  }

  const onConfirmWarning = () => {
    acknowledge()
    setWarnOpen(false)
    void useEngineStore.getState().start()
  }

  const params = useParamStore.getState

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3" role="toolbar" aria-label="Transport">
      <HudButton
        size="xl"
        active={running}
        disabled={busy}
        onClick={onStartStop}
        className="min-w-[216px]"
        icon={<Chevrons count={3} size={16} />}
      >
        {status === 'starting' ? 'Starting' : status === 'stopping' ? 'Stopping' : running ? 'Stop' : 'Start'}
      </HudButton>
      <HudButton size="lg" disabled={!running} onClick={() => engine.kick()} icon={<span className="h-2.5 w-2.5 rotate-45 bg-current" />}>
        Kick
      </HudButton>
      <HudButton
        size="lg"
        variant="warn"
        disabled={status === 'idle'}
        onClick={() => engine.panic()}
        title="Cut the feedback, fade out and clear the loop (Esc)"
        icon={<ReticleIcon size={22} />}
      >
        Panic
      </HudButton>

      <Divider />

      <HudButton size="lg" onClick={() => params().randomize()} icon={<AsteriskIcon size={18} />}>
        Randomize
      </HudButton>
      <HudButton size="md" variant="ghost" onClick={() => params().mutate()} title="Small random nudges around the current state">
        Mutate
      </HudButton>
      <HudButton size="md" variant="ghost" disabled={!canUndo} onClick={() => params().undo()} title="Step back to the previous state">
        Undo
      </HudButton>

      <div className="flex-1" />

      <HudButton
        size="lg"
        variant="warn"
        active={recording}
        disabled={!running && !recording}
        onClick={() => (recording ? void engine.stopRecording() : engine.startRecording())}
        icon={<span className="h-3 w-3 rounded-full bg-current" />}
        trailing={recording ? <RecTimer idle="" className="min-w-[60px] text-left" /> : undefined}
        className="min-w-[132px]"
      >
        {recording ? 'Stop' : 'Rec'}
      </HudButton>

      {warnOpen && <WarningModal onConfirm={onConfirmWarning} onCancel={() => setWarnOpen(false)} />}
    </div>
  )
}
