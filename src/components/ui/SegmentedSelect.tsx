import { getParam } from '../../audio/paramRegistry'
import { useParamStore } from '../../store/paramStore'

/** Segmented radio group for a `choice` parameter (wave shape, noise color, filter type, ...). */
export function SegmentedSelect({ id, className = '' }: { id: string; className?: string }) {
  const def = getParam(id)
  if (def.kind !== 'choice') throw new Error(`${id} is not a choice param`)
  const value = useParamStore((s) => s.values[id] ?? def.def)
  const set = useParamStore((s) => s.set)

  return (
    <div role="radiogroup" aria-label={def.label} className={`inline-flex border border-line ${className}`}>
      {def.options.map((option, i) => {
        const selected = Math.round(value) === i
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => set(id, i)}
            className={`h-7 px-2.5 text-label uppercase transition-colors ${
              selected ? 'bg-accent font-bold text-bg' : 'text-muted hover:bg-accent/10 hover:text-ink'
            } ${i > 0 ? 'border-l border-line' : ''}`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
