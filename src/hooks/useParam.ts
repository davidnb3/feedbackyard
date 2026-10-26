import { useCallback } from 'react'
import { getKnob } from '../audio/paramRegistry'
import type { KnobDef } from '../audio/types'
import { useParamStore } from '../store/paramStore'

/** Value, setter and definition of a knob parameter. Re-renders only when this value changes. */
export function useKnobParam(id: string): { def: KnobDef; value: number; set(v: number): void; reset(): void } {
  const def = getKnob(id)
  const value = useParamStore((s) => s.values[id] ?? def.def)
  const set = useCallback((v: number) => useParamStore.getState().set(id, v), [id])
  const reset = useCallback(() => useParamStore.getState().reset(id), [id])
  return { def, value, set, reset }
}
