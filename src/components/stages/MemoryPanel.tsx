import { useParamStore } from '../../store/paramStore'
import { SLOT_COUNT, useSnapshotStore } from '../../store/snapshotStore'
import { HudButton } from '../ui/HudButton'
import { Panel } from '../ui/Panel'

const SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => i)

export function MemoryPanel({ className = '' }: { className?: string }) {
  const slots = useSnapshotStore((s) => s.slots)
  const save = useSnapshotStore((s) => s.save)
  const recall = useSnapshotStore((s) => s.recall)
  const depth = useParamStore((s) => s.history.length)

  return (
    <Panel title="Memory" index="08" className={className}>
      <div className="flex flex-col gap-3 short:gap-1.5">
        <div className="flex items-center gap-3">
          <span className="w-14 text-label uppercase text-muted">Save</span>
          {SLOTS.map((i) => (
            <HudButton key={i} size="sm" variant="ghost" aria-label={`Save snapshot ${i + 1}`} onClick={() => save(i)} className="w-12">
              {i + 1}
            </HudButton>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="w-14 text-label uppercase text-muted">Recall</span>
          {SLOTS.map((i) => (
            <HudButton
              key={i}
              size="sm"
              active={!!slots[i]}
              disabled={!slots[i]}
              aria-label={slots[i] ? `Recall snapshot ${i + 1}` : `Snapshot ${i + 1} is empty`}
              onClick={() => recall(i)}
              className="w-12"
            >
              {i + 1}
            </HudButton>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="w-14 text-label uppercase text-muted">History</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={`h-2 w-2 ${i < depth ? 'bg-accent' : 'border border-line'}`} />
            ))}
          </span>
          <span className="tabular-nums text-label uppercase text-muted">{depth}/10</span>
        </div>
      </div>
    </Panel>
  )
}
