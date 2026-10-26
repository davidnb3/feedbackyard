import { useKnobParam } from '../../hooks/useParam'
import { Barcode, Chevrons, DotRow } from '../ui/Deco'
import { Knob } from '../ui/Knob'
import { Panel } from '../ui/Panel'
import { RingGauge } from '../ui/RingGauge'
import { SegmentedSelect } from '../ui/SegmentedSelect'

function CombReadout() {
  const { value } = useKnobParam('delayTime')
  const hz = 1 / value
  return (
    <span className="tabular-nums text-readout text-data">
      COMB {hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : hz >= 100 ? `${hz.toFixed(0)} Hz` : `${hz.toFixed(1)} Hz`}
    </span>
  )
}

export function LoopPanel({ className = '' }: { className?: string }) {
  return (
    <Panel
      title="Loop"
      index="02"
      className={className}
      right={
        <span className="flex items-center gap-2">
          <span className="text-label uppercase text-muted">Filter</span>
          <SegmentedSelect id="filterType" />
        </span>
      }
    >
      <div className="flex h-full flex-col justify-between gap-3">
        <div className="flex items-center gap-5">
          <RingGauge size={176} />
          <div className="grid flex-1 grid-cols-3 gap-x-1 gap-y-3">
            <Knob id="feedback" />
            <Knob id="delayTime" />
            <Knob id="drive" />
            <Knob id="cutoff" />
            <Knob id="resonance" />
            <Knob id="pitch" />
          </div>
        </div>

        <div className="flex items-center gap-4 text-accent/80">
          <Chevrons count={7} size={12} />
          <CombReadout />
          <span className="h-px flex-1 bg-line" aria-hidden="true" />
          <DotRow count={3} />
          <Barcode seed={7} bars={22} width={84} height={12} />
        </div>
      </div>
    </Panel>
  )
}
