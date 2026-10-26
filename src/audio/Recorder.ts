import { createStereoWorklet } from './worklets'

export interface RecordedTake {
  id: string
  number: number
  createdAt: number
  sampleRate: number
  left: Float32Array
  right: Float32Array
  /** seconds */
  duration: number
  /** Waveform preview: 0..1 peak per bin. */
  peaks: Float32Array
}

const PEAK_BINS = 240

function concat(chunks: Float32Array[], total: number): Float32Array {
  const out = new Float32Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

function computePeaks(left: Float32Array, right: Float32Array): Float32Array {
  const bins = new Float32Array(PEAK_BINS)
  const per = Math.max(1, Math.floor(left.length / PEAK_BINS))
  for (let b = 0; b < PEAK_BINS; b++) {
    let peak = 0
    const start = b * per
    const end = Math.min(left.length, start + per)
    for (let i = start; i < end; i++) {
      const a = Math.max(Math.abs(left[i]), Math.abs(right[i]))
      if (a > peak) peak = a
    }
    bins[b] = Math.min(1, peak)
  }
  return bins
}

/** Records the master output (post safety clip) through the fy-recorder worklet. */
export class Recorder {
  readonly node: AudioWorkletNode
  recording = false
  private chunksL: Float32Array[] = []
  private chunksR: Float32Array[] = []
  private frames = 0
  private startedAt = 0
  private counter = 0
  private onDone: (() => void) | null = null

  constructor(private readonly ctx: AudioContext) {
    this.node = createStereoWorklet(ctx, 'fy-recorder')
    this.node.port.onmessage = (e: MessageEvent) => {
      const d = e.data
      if (!d) return
      if (d.type === 'chunk') {
        this.chunksL.push(d.l as Float32Array)
        this.chunksR.push(d.r as Float32Array)
        this.frames += (d.l as Float32Array).length
      } else if (d.type === 'done') {
        this.onDone?.()
      }
    }
  }

  start(): void {
    this.chunksL = []
    this.chunksR = []
    this.frames = 0
    this.startedAt = this.ctx.currentTime
    this.recording = true
    this.node.port.postMessage({ cmd: 'start' })
  }

  /** Seconds recorded so far. */
  elapsed(): number {
    return this.recording ? Math.max(0, this.ctx.currentTime - this.startedAt) : 0
  }

  async stop(): Promise<RecordedTake | null> {
    if (!this.recording) return null
    // Wait for the worklet to flush its last partial block; give up after a moment.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 600)
      this.onDone = () => {
        clearTimeout(timer)
        resolve()
      }
      this.node.port.postMessage({ cmd: 'stop' })
    })
    this.onDone = null
    this.recording = false
    if (this.frames === 0) return null

    const left = concat(this.chunksL, this.frames)
    const right = concat(this.chunksR, this.frames)
    this.chunksL = []
    this.chunksR = []
    this.counter += 1
    return {
      id: `take-${Date.now()}-${this.counter}`,
      number: this.counter,
      createdAt: Date.now(),
      sampleRate: this.ctx.sampleRate,
      left,
      right,
      duration: left.length / this.ctx.sampleRate,
      peaks: computePeaks(left, right),
    }
  }

  dispose(): void {
    this.node.port.postMessage('dispose')
    this.node.disconnect()
  }
}
