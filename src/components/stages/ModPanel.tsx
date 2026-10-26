import { Knob } from '../ui/Knob'
import { Panel } from '../ui/Panel'
import { HatchBlock } from '../ui/Deco'

export function ModPanel({ className = '' }: { className?: string }) {
  return (
    <Panel title="Mod / Chaos" index="03" className={className}>
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="grid grid-cols-3 gap-x-1">
          <Knob id="lfoRate" />
          <Knob id="lfoDelay" />
          <Knob id="lfoFilter" />
        </div>
        <div className="flex items-center gap-3 text-accent/70" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <HatchBlock width={36} height={6} stripe={3} />
        </div>
        <div className="grid grid-cols-3 items-end gap-x-1">
          <div className="col-span-2 flex justify-center">
            <Knob id="chaos" size="lg" />
          </div>
          <Knob id="drift" />
        </div>
      </div>
    </Panel>
  )
}
