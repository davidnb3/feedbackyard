import { gaussian } from '../../utils/dsp-math'
import { smooth } from '../smooth'
import type { SourceDef } from '../types'
import { BaseSource } from './BaseSource'

const STEP_MS = 40

/**
 * A sawtooth whose pitch follows a mean-reverting random walk (Ornstein-Uhlenbeck) around a
 * center frequency. `spread` is how many octaves it may wander.
 */
export class WanderingOscSource extends BaseSource {
  private readonly osc: OscillatorNode
  private timer: ReturnType<typeof setInterval> | null = null
  private center = 180
  private spread = 1.2
  private x = 0

  constructor(ctx: AudioContext) {
    super(ctx)
    this.osc = ctx.createOscillator()
    this.osc.type = 'sawtooth'
    this.osc.connect(this.level)
  }

  start(): void {
    this.osc.start()
    this.timer = setInterval(() => this.step(), STEP_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    try {
      this.osc.stop()
    } catch {
      /* never started or already stopped */
    }
  }

  private step(): void {
    const dt = STEP_MS / 1000
    const theta = 1.2
    this.x += -theta * this.x * dt + Math.sqrt(2 * theta * dt) * 0.55 * gaussian()
    this.x = Math.max(-1, Math.min(1, this.x))
    smooth(this.ctx, this.osc.frequency, this.center * Math.pow(2, this.spread * this.x), 0.06)
  }

  protected applyParam(key: string, value: number): void {
    if (key === 'freq') this.center = value
    else if (key === 'spread') this.spread = value
  }
}

export const wanderingOscDef: SourceDef = {
  id: 'wander',
  label: 'Wanderer',
  defaultEnabled: false,
  params: [
    {
      kind: 'knob', id: 'wander.freq', label: 'Center', group: 'source',
      min: 30, max: 2000, def: 180, curve: 'exp', fmt: 'hz', rand: [50, 900], chaos: 0.3,
    },
    {
      kind: 'knob', id: 'wander.spread', label: 'Spread', group: 'source',
      min: 0, max: 4, def: 1.2, curve: 'lin', fmt: 'oct', rand: [0.3, 3], chaos: 0.3,
    },
    {
      kind: 'knob', id: 'wander.level', label: 'Level', group: 'source',
      min: 0, max: 1, def: 0.25, curve: 'lin', fmt: 'pct', rand: [0.1, 0.5],
    },
  ],
  create: (ctx) => new WanderingOscSource(ctx),
}
