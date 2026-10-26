export type ParamGroup = 'source' | 'loop' | 'mod' | 'fx' | 'output'
export type Curve = 'lin' | 'exp'
export type ValueFormat = 'hz' | 'time' | 'pct' | 'st' | 'db' | 'num' | 'ratio' | 'oct'

export interface KnobDef {
  kind: 'knob'
  id: string
  label: string
  group: ParamGroup
  min: number
  max: number
  def: number
  curve: Curve
  fmt: ValueFormat
  /** Safe bounds used by RANDOMIZE, MUTATE and CHAOS. Defaults to [min, max]. */
  rand?: readonly [number, number]
  /** false = RANDOMIZE and MUTATE leave it alone. Default true. */
  randomize?: boolean
  /** How strongly CHAOS drifts this parameter (0 or undefined = not at all). */
  chaos?: number
  bipolar?: boolean
  /** Values above this are drawn in the warning color (for example feedback past unity). */
  danger?: number
}

export interface ChoiceDef {
  kind: 'choice'
  id: string
  label: string
  group: ParamGroup
  options: readonly string[]
  def: number
}

export type ParamDef = KnobDef | ChoiceDef

/** A sound source that feeds the loop. Created once per engine, lives as long as the context. */
export interface Source {
  readonly output: AudioNode
  start(): void
  stop(): void
  setEnabled(on: boolean): void
  /** `key` is the param id without the "<sourceId>." prefix. */
  setParam(key: string, value: number): void
  /** Optional one-shot (for example the kick exciter). */
  trigger?(): void
  dispose(): void
}

export interface SourceDef {
  id: string
  label: string
  defaultEnabled: boolean
  /** true = has a trigger() and no on/off switch (the exciter). */
  trigger?: boolean
  /** Param ids must be prefixed with "<id>.". */
  params: readonly ParamDef[]
  create(ctx: AudioContext): Source
}

export interface ParamState {
  values: Record<string, number>
  enabled: Record<string, boolean>
}
