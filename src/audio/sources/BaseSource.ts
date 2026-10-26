import { smooth } from '../smooth'
import type { Source } from '../types'

/**
 * Shared plumbing for sources: `level` (the source's own level knob) feeds `gate` (the on/off
 * switch), which is the public `output`. Subclasses connect their nodes into `this.level`.
 */
export abstract class BaseSource implements Source {
  readonly output: GainNode
  protected readonly level: GainNode
  private readonly gate: GainNode

  constructor(protected readonly ctx: AudioContext) {
    this.level = ctx.createGain()
    this.level.gain.value = 0
    this.gate = ctx.createGain()
    this.gate.gain.value = 0
    this.level.connect(this.gate)
    this.output = this.gate
  }

  abstract start(): void
  abstract stop(): void
  protected abstract applyParam(key: string, value: number): void

  setEnabled(on: boolean): void {
    smooth(this.ctx, this.gate.gain, on ? 1 : 0, 0.02)
  }

  setParam(key: string, value: number): void {
    if (key === 'level') smooth(this.ctx, this.level.gain, value, 0.02)
    else this.applyParam(key, value)
  }

  dispose(): void {
    this.stop()
    this.level.disconnect()
    this.gate.disconnect()
  }
}
