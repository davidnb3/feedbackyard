import { Chevrons } from '../ui/Deco'
import { Knob } from '../ui/Knob'
import { Panel } from '../ui/Panel'

export function FxPanel({ className = '' }: { className?: string }) {
  return (
    <Panel title="FX" index="04" className={className}>
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="grid grid-cols-3 gap-x-1">
          <Knob id="reverbMix" />
          <Knob id="reverbSize" />
          <Knob id="reverbDamp" />
        </div>
        <div className="flex items-center gap-3 text-accent/70" aria-hidden="true">
          <Chevrons count={6} size={10} dir="left" />
          <span className="h-px flex-1 bg-line" />
        </div>
      </div>
    </Panel>
  )
}
