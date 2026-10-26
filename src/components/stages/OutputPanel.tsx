import { FrameLamp } from '../ui/FrameLamp'
import { Knob } from '../ui/Knob'
import { LevelMeter } from '../ui/LevelMeter'
import { Panel } from '../ui/Panel'

export function OutputPanel({ className = '' }: { className?: string }) {
  return (
    <Panel title="Output" index="06" className={className}>
      <div className="flex h-full items-stretch justify-between gap-3">
        <div className="flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-x-1">
            <Knob id="mix" />
            <Knob id="master" />
          </div>
          <div className="flex items-center gap-5">
            <FrameLamp label="Limit" test={(f) => f.limiterReduction < -3} holdMs={350} />
            <FrameLamp label="Clip" test={(f) => f.clip} holdMs={900} />
          </div>
        </div>
        <LevelMeter className="h-full w-[132px] shrink-0" />
      </div>
    </Panel>
  )
}
