import { smooth } from '../smooth'
import type { SourceDef } from '../types'
import { BaseSource } from './BaseSource'

const SECONDS = 6

function normalize(data: Float32Array, peak = 0.9): void {
  let max = 0
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]))
  if (max > 0) for (let i = 0; i < data.length; i++) data[i] = (data[i] / max) * peak
}

function makeNoiseBuffers(ctx: BaseAudioContext): AudioBuffer[] {
  const len = Math.round(ctx.sampleRate * SECONDS)
  const white = ctx.createBuffer(1, len, ctx.sampleRate)
  const pink = ctx.createBuffer(1, len, ctx.sampleRate)
  const brown = ctx.createBuffer(1, len, ctx.sampleRate)
  const w = white.getChannelData(0)
  const p = pink.getChannelData(0)
  const b = brown.getChannelData(0)

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  let last = 0
  for (let i = 0; i < len; i++) {
    const x = Math.random() * 2 - 1
    w[i] = x
    // Paul Kellet's economy pink filter
    b0 = 0.99886 * b0 + x * 0.0555179
    b1 = 0.99332 * b1 + x * 0.0750759
    b2 = 0.969 * b2 + x * 0.153852
    b3 = 0.8665 * b3 + x * 0.3104856
    b4 = 0.55 * b4 + x * 0.5329522
    b5 = -0.7616 * b5 - x * 0.016898
    p[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362
    b6 = x * 0.115926
    // leaky integrator = brown noise
    last = (last + 0.02 * x) / 1.02
    b[i] = last
  }
  normalize(w)
  normalize(p)
  normalize(b)
  return [white, pink, brown]
}

/** White, pink and brown noise. All three loop continuously; the selected one is faded in. */
export class NoiseSource extends BaseSource {
  private readonly nodes: AudioBufferSourceNode[]
  private readonly selectors: GainNode[]

  constructor(ctx: AudioContext) {
    super(ctx)
    const buffers = makeNoiseBuffers(ctx)
    this.selectors = []
    this.nodes = buffers.map((buffer) => {
      const node = ctx.createBufferSource()
      node.buffer = buffer
      node.loop = true
      const sel = ctx.createGain()
      sel.gain.value = 0
      node.connect(sel)
      sel.connect(this.level)
      this.selectors.push(sel)
      return node
    })
  }

  start(): void {
    this.nodes.forEach((n) => n.start())
  }

  stop(): void {
    this.nodes.forEach((n) => {
      try {
        n.stop()
      } catch {
        /* never started or already stopped */
      }
    })
  }

  protected applyParam(key: string, value: number): void {
    if (key !== 'type') return
    const idx = Math.round(value)
    this.selectors.forEach((sel, i) => smooth(this.ctx, sel.gain, i === idx ? 1 : 0, 0.02))
  }
}

export const noiseDef: SourceDef = {
  id: 'noise',
  label: 'Noise',
  defaultEnabled: false,
  params: [
    { kind: 'choice', id: 'noise.type', label: 'Color', group: 'source', options: ['WHT', 'PNK', 'BRN'], def: 1 },
    {
      kind: 'knob', id: 'noise.level', label: 'Level', group: 'source',
      min: 0, max: 1, def: 0.25, curve: 'lin', fmt: 'pct', rand: [0.1, 0.6],
    },
  ],
  create: (ctx) => new NoiseSource(ctx),
}
