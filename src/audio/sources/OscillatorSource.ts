import { smooth } from '../smooth'
import type { SourceDef } from '../types'
import { BaseSource } from './BaseSource'

const TYPES: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle']

export class OscillatorSource extends BaseSource {
  private readonly osc: OscillatorNode

  constructor(ctx: AudioContext) {
    super(ctx)
    this.osc = ctx.createOscillator()
    this.osc.connect(this.level)
  }

  start(): void {
    this.osc.start()
  }

  stop(): void {
    try {
      this.osc.stop()
    } catch {
      /* never started or already stopped */
    }
  }

  protected applyParam(key: string, value: number): void {
    if (key === 'type') this.osc.type = TYPES[Math.round(value)] ?? 'sine'
    else if (key === 'freq') smooth(this.ctx, this.osc.frequency, value, 0.02)
  }
}

export const oscillatorDef: SourceDef = {
  id: 'osc',
  label: 'Oscillator',
  defaultEnabled: true,
  params: [
    { kind: 'choice', id: 'osc.type', label: 'Wave', group: 'source', options: ['SIN', 'SQR', 'SAW', 'TRI'], def: 0 },
    {
      kind: 'knob', id: 'osc.freq', label: 'Freq', group: 'source',
      min: 20, max: 4000, def: 110, curve: 'exp', fmt: 'hz', rand: [40, 1200], chaos: 0.4,
    },
    {
      kind: 'knob', id: 'osc.level', label: 'Level', group: 'source',
      min: 0, max: 1, def: 0.3, curve: 'lin', fmt: 'pct', rand: [0.15, 0.6],
    },
  ],
  create: (ctx) => new OscillatorSource(ctx),
}
