import { clamp, fromNorm, gaussian, randomBounds, toNorm } from '../utils/dsp-math'
import type { KnobDef } from './types'

/**
 * Makes parameters wander on their own: a mean-reverting random walk (Ornstein-Uhlenbeck) per
 * parameter, applied as an offset around the knob's base value in normalized space. The offset
 * never pushes a value outside the parameter's safe bounds (or past where the knob already is).
 */
export class ChaosEngine {
  /** 0..1 */
  amount = 0
  /** Roughly how many times per second a parameter changes direction. */
  rate = 0.25
  private readonly x = new Map<string, number>()

  step(dt: number, ids: Iterable<string>): void {
    const theta = this.rate
    const sigma = Math.sqrt(2 * theta * dt) * 0.55
    for (const id of ids) {
      const prev = this.x.get(id) ?? 0
      const next = prev - theta * prev * dt + sigma * gaussian()
      this.x.set(id, clamp(next, -1, 1))
    }
  }

  apply(def: KnobDef, base: number, id = def.id): number {
    if (this.amount <= 0 || !def.chaos) return base
    const x = this.x.get(id) ?? 0
    const n = toNorm(def, base) + this.amount * def.chaos * x * 0.8
    const [lo, hi] = randomBounds(def)
    return clamp(fromNorm(def, n), Math.min(lo, base), Math.max(hi, base))
  }

  reset(): void {
    this.x.clear()
  }
}
