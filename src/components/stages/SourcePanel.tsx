import { useRef, useState, type DragEvent } from 'react'
import { SOURCE_REGISTRY } from '../../audio/sources'
import type { SourceDef } from '../../audio/types'
import { useEngineStore } from '../../store/engineStore'
import { useParamStore } from '../../store/paramStore'
import { Knob } from '../ui/Knob'
import { Panel } from '../ui/Panel'
import { SegmentedSelect } from '../ui/SegmentedSelect'

/** Load button for the file source. The whole card is also a drop target (see SourceCard). */
function FileButton({ onFile }: { onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const fileName = useEngineStore((s) => s.fileName)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        title={fileName ?? 'Load an audio file, or drop one on this card'}
        className="ml-2 h-7 min-w-0 flex-1 truncate border border-line px-2 text-label uppercase text-ink hover:border-accent hover:text-accent"
      >
        {fileName ?? 'Load / drop file'}
      </button>
    </>
  )
}

/**
 * One card per registered source, generated from SOURCE_REGISTRY. A new source shows up here
 * automatically once it is added to the registry. A source with `file: true` also gets a load
 * button and drop target.
 */
function SourceCard({ def }: { def: SourceDef }) {
  const enabled = useParamStore((s) => s.enabled[def.id] ?? def.defaultEnabled)
  const setEnabled = useParamStore((s) => s.setEnabled)
  const choices = def.params.filter((p) => p.kind === 'choice')
  const knobs = def.params.filter((p) => p.kind === 'knob')
  const live = def.trigger || enabled
  const loadFile = useEngineStore((s) => s.loadFile)
  const [dragging, setDragging] = useState(false)
  const fileProps = def.file
    ? {
        onDragOver: (e: DragEvent) => {
          e.preventDefault()
          setDragging(true)
        },
        onDragLeave: () => setDragging(false),
        onDrop: (e: DragEvent) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) void loadFile(f)
        },
      }
    : {}

  return (
    <div
      {...fileProps}
      className={`flex flex-col border p-3 transition-colors short:p-2 ${def.file ? 'col-span-2' : ''} ${dragging ? 'border-accent' : live ? 'border-line' : 'border-line/60'}`}
    >
      <div className="flex h-6 items-center justify-between">
        {def.trigger ? (
          <span className="flex items-center gap-2 text-label font-bold uppercase text-accent">
            <span className="h-3 w-3 border border-accent" aria-hidden="true">
              <span className="m-[2px] block h-[6px] w-[6px] bg-accent" />
            </span>
            {def.label}
          </span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`${def.label} on/off`}
            onClick={() => setEnabled(def.id, !enabled)}
            className="group flex items-center gap-2 text-label font-bold uppercase"
          >
            <span className={`grid h-3 w-3 place-items-center border ${enabled ? 'border-accent' : 'border-muted'}`} aria-hidden="true">
              <span className={`block h-[6px] w-[6px] ${enabled ? 'bg-accent' : 'bg-transparent'}`} />
            </span>
            <span className={enabled ? 'text-accent' : 'text-muted group-hover:text-ink'}>{def.label}</span>
          </button>
        )}
        <span className="text-label uppercase text-muted">{def.trigger ? 'one-shot' : enabled ? 'on' : 'off'}</span>
      </div>

      <div className="mt-2 flex h-7 items-center short:mt-1">
        {choices.map((c) => (
          <SegmentedSelect key={c.id} id={c.id} />
        ))}
        {def.file && <FileButton onFile={(f) => void loadFile(f)} />}
      </div>

      <div className={`mt-2 flex justify-between transition-opacity short:mt-1 ${live ? '' : 'opacity-45'}`}>
        {knobs.map((k) => (
          <Knob key={k.id} id={k.id} size="xs" />
        ))}
      </div>
    </div>
  )
}

export function SourcePanel({ className = '' }: { className?: string }) {
  return (
    <Panel title="Source" index="01" className={className}>
      <div className="grid grid-cols-2 gap-3 short:gap-2">
        {SOURCE_REGISTRY.map((def) => (
          <SourceCard key={def.id} def={def} />
        ))}
      </div>
    </Panel>
  )
}
