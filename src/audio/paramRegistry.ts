import { CORE_PARAMS } from './core-params'
import { SOURCE_REGISTRY } from './sources'
import type { KnobDef, ParamDef, ParamState } from './types'

export const ALL_PARAMS: readonly ParamDef[] = [...CORE_PARAMS, ...SOURCE_REGISTRY.flatMap((s) => s.params)]

export const PARAM_BY_ID: ReadonlyMap<string, ParamDef> = new Map(ALL_PARAMS.map((p) => [p.id, p]))

export const KNOB_PARAMS: readonly KnobDef[] = ALL_PARAMS.filter((p): p is KnobDef => p.kind === 'knob')

export function getParam(id: string): ParamDef {
  const def = PARAM_BY_ID.get(id)
  if (!def) throw new Error(`Unknown param: ${id}`)
  return def
}

export function getKnob(id: string): KnobDef {
  const def = getParam(id)
  if (def.kind !== 'knob') throw new Error(`Param is not a knob: ${id}`)
  return def
}

export function defaultState(): ParamState {
  return {
    values: Object.fromEntries(ALL_PARAMS.map((p) => [p.id, p.def])),
    enabled: Object.fromEntries(SOURCE_REGISTRY.map((s) => [s.id, s.defaultEnabled])),
  }
}
