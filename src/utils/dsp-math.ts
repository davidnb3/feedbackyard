import type { KnobDef, ParamDef, ParamState } from '../audio/types'

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const dbToGain = (db: number) => (db <= -60 ? 0 : Math.pow(10, db / 20))
export const gainToDb = (g: number) => (g <= 1e-6 ? -120 : 20 * Math.log10(g))

/** Real value -> 0..1 position on the knob. */
export function toNorm(def: KnobDef, value: number): number {
  const v = clamp(value, def.min, def.max)
  if (def.curve === 'exp') {
    return Math.log(v / def.min) / Math.log(def.max / def.min)
  }
  return (v - def.min) / (def.max - def.min)
}

/** 0..1 knob position -> real value. */
export function fromNorm(def: KnobDef, n: number): number {
  const t = clamp(n, 0, 1)
  if (def.curve === 'exp') {
    return def.min * Math.pow(def.max / def.min, t)
  }
  return def.min + (def.max - def.min) * t
}

/** Standard normal sample (Box-Muller). */
export function gaussian(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function randomInRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo)
}

export function randomBounds(def: KnobDef): readonly [number, number] {
  return def.rand ?? [def.min, def.max]
}

export function isRandomizable(def: ParamDef): def is KnobDef {
  return def.kind === 'knob' && def.randomize !== false
}

/** A random value inside the safe bounds, uniform in knob (normalized) space. */
export function randomValue(def: KnobDef): number {
  const [lo, hi] = randomBounds(def)
  return fromNorm(def, randomInRange(toNorm(def, lo), toNorm(def, hi)))
}

/** A small random nudge around `value`, clamped to the safe bounds (or the current value if outside). */
export function mutateValue(def: KnobDef, value: number, amount = 0.08): number {
  const [lo, hi] = randomBounds(def)
  const n = toNorm(def, value) + gaussian() * amount
  const next = fromNorm(def, n)
  return clamp(next, Math.min(lo, value), Math.max(hi, value))
}

export function formatValue(def: KnobDef, value: number): string {
  switch (def.fmt) {
    case 'hz':
      return value >= 1000 ? `${(value / 1000).toFixed(2)} kHz` : value >= 100 ? `${value.toFixed(0)} Hz` : `${value.toFixed(1)} Hz`
    case 'time':
      return value >= 1 ? `${value.toFixed(2)} s` : value >= 0.01 ? `${(value * 1000).toFixed(0)} ms` : `${(value * 1000).toFixed(1)} ms`
    case 'pct':
      return `${(value * 100).toFixed(0)}%`
    case 'st': {
      const s = value >= 0 ? '+' : '\u2212'
      return `${s}${Math.abs(value).toFixed(1)} st`
    }
    case 'db':
      return value <= def.min + 0.05 ? '\u2212\u221E dB' : `${value < 0 ? '\u2212' : ''}${Math.abs(value).toFixed(1)} dB`
    case 'ratio':
      return `${value.toFixed(2)}x`
    case 'oct':
      return `${value.toFixed(1)} oct`
    default:
      return value.toFixed(2)
  }
}

/** Interpolate two param values in normalized space (so exp knobs glide evenly). */
export function mixValue(def: KnobDef, a: number, b: number, t: number): number {
  return fromNorm(def, lerp(toNorm(def, a), toNorm(def, b), t))
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export function cloneState(s: ParamState): ParamState {
  return { values: { ...s.values }, enabled: { ...s.enabled } }
}
