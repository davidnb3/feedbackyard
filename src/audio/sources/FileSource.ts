import { smooth } from '../smooth'
import type { SourceDef } from '../types'
import { BaseSource } from './BaseSource'

const MIN_WINDOW = 0.01
const FADE = 0.01

interface Voice {
  node: AudioBufferSourceNode
  env: GainNode
}

/**
 * Loops a user-loaded sound. START / SIZE pick a loop window inside the file (tiny windows are
 * granular), PITCH detunes it, DIR plays it reversed. Any change of buffer or direction swaps in
 * a fresh node behind a short crossfade, because an AudioBufferSourceNode can only start once.
 */
export class FileSource extends BaseSource {
  private voice: Voice | null = null
  private forward: AudioBuffer | null = null
  private reversed: AudioBuffer | null = null
  private running = false
  private dir = 0
  private startFrac = 0
  private sizeFrac = 1
  private pitch = 0

  start(): void {
    this.running = true
    this.rebuild()
  }

  stop(): void {
    this.running = false
    this.release()
  }

  loadBuffer(buffer: AudioBuffer): void {
    this.forward = buffer
    this.reversed = null
    this.rebuild()
  }

  protected applyParam(key: string, value: number): void {
    switch (key) {
      case 'dir': {
        const dir = Math.round(value)
        if (dir === this.dir) return
        this.dir = dir
        this.rebuild()
        break
      }
      case 'start':
        this.startFrac = value
        this.applyWindow()
        break
      case 'size':
        this.sizeFrac = value
        this.applyWindow()
        break
      case 'pitch':
        this.pitch = value
        if (this.voice) smooth(this.ctx, this.voice.node.detune, value * 100, 0.02)
        break
    }
  }

  private buffer(): AudioBuffer | null {
    if (!this.forward) return null
    if (this.dir === 0) return this.forward
    if (!this.reversed) {
      const f = this.forward
      const r = this.ctx.createBuffer(f.numberOfChannels, f.length, f.sampleRate)
      for (let c = 0; c < f.numberOfChannels; c++) r.getChannelData(c).set(f.getChannelData(c).slice().reverse())
      this.reversed = r
    }
    return this.reversed
  }

  private window(buf: AudioBuffer): [number, number] {
    const d = buf.duration
    const len = Math.max(this.sizeFrac, MIN_WINDOW) * d
    const start = Math.min(this.startFrac * d, d - Math.min(len, d))
    return [start, Math.min(d, start + len)]
  }

  private applyWindow(): void {
    const node = this.voice?.node
    if (!node?.buffer) return
    const [start, end] = this.window(node.buffer)
    // Keep loopStart < loopEnd at every step, otherwise the browser loops the whole file.
    if (start >= node.loopEnd) {
      node.loopEnd = end
      node.loopStart = start
    } else {
      node.loopStart = start
      node.loopEnd = end
    }
  }

  private rebuild(): void {
    this.release()
    const buf = this.running ? this.buffer() : null
    if (!buf) return
    const node = this.ctx.createBufferSource()
    node.buffer = buf
    node.loop = true
    node.detune.value = this.pitch * 100
    const [start, end] = this.window(buf)
    node.loopStart = start
    node.loopEnd = end
    const env = this.ctx.createGain()
    env.gain.value = 0
    node.connect(env)
    env.connect(this.level)
    node.start(0, start)
    smooth(this.ctx, env.gain, 1, FADE)
    this.voice = { node, env }
  }

  private release(): void {
    const v = this.voice
    if (!v) return
    this.voice = null
    smooth(this.ctx, v.env.gain, 0, FADE)
    const end = this.ctx.currentTime + FADE * 8
    try {
      v.node.stop(end)
    } catch {
      /* already stopped */
    }
    v.node.onended = () => {
      v.node.disconnect()
      v.env.disconnect()
    }
  }
}

export const fileDef: SourceDef = {
  id: 'file',
  label: 'File',
  defaultEnabled: false,
  file: true,
  params: [
    { kind: 'choice', id: 'file.dir', label: 'Direction', group: 'source', options: ['FWD', 'REV'], def: 0 },
    {
      kind: 'knob', id: 'file.start', label: 'Start', group: 'source',
      min: 0, max: 1, def: 0, curve: 'lin', fmt: 'pct', rand: [0, 0.9], chaos: 0.5,
    },
    {
      kind: 'knob', id: 'file.size', label: 'Size', group: 'source',
      min: MIN_WINDOW, max: 1, def: 1, curve: 'exp', fmt: 'pct', rand: [0.02, 1], chaos: 0.4,
    },
    {
      kind: 'knob', id: 'file.pitch', label: 'Pitch', group: 'source',
      min: -24, max: 24, def: 0, curve: 'lin', fmt: 'st', rand: [-12, 12], chaos: 0.3, bipolar: true,
    },
    {
      kind: 'knob', id: 'file.level', label: 'Level', group: 'source',
      min: 0, max: 1, def: 0.5, curve: 'lin', fmt: 'pct', rand: [0.2, 0.7],
    },
  ],
  create: (ctx) => new FileSource(ctx),
}
