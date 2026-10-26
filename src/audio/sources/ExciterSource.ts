import type { SourceDef } from '../types'
import { BaseSource } from './BaseSource'

/** One-shot kick: a short noise burst or a click, injected into the running loop. */
export class ExciterSource extends BaseSource {
  private readonly burst: AudioBuffer
  private readonly click: AudioBuffer
  private type = 0

  constructor(ctx: AudioContext) {
    super(ctx)
    const sr = ctx.sampleRate
    const len = Math.round(sr * 0.06)
    this.burst = ctx.createBuffer(1, len, sr)
    const b = this.burst.getChannelData(0)
    for (let i = 0; i < len; i++) {
      const t = i / sr
      const env = Math.min(1, t / 0.001) * Math.exp(-t / 0.012)
      b[i] = (Math.random() * 2 - 1) * env
    }
    this.click = ctx.createBuffer(1, 16, sr)
    this.click.getChannelData(0).set([1, -0.8, 0.55, -0.35, 0.2, -0.1, 0.05])
  }

  start(): void {
    /* one-shot source: nothing runs until trigger() */
  }

  stop(): void {
    /* nothing to stop */
  }

  trigger(): void {
    const node = this.ctx.createBufferSource()
    node.buffer = this.type === 1 ? this.click : this.burst
    node.connect(this.level)
    node.onended = () => node.disconnect()
    node.start()
  }

  protected applyParam(key: string, value: number): void {
    if (key === 'type') this.type = Math.round(value)
  }
}

export const exciterDef: SourceDef = {
  id: 'kick',
  label: 'Exciter',
  defaultEnabled: true,
  trigger: true,
  params: [
    { kind: 'choice', id: 'kick.type', label: 'Shape', group: 'source', options: ['BURST', 'CLICK'], def: 0 },
    {
      kind: 'knob', id: 'kick.level', label: 'Level', group: 'source',
      min: 0, max: 1, def: 0.8, curve: 'lin', fmt: 'pct', randomize: false,
    },
  ],
  create: (ctx) => new ExciterSource(ctx),
}
