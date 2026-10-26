import { ChaosEngine } from './ChaosEngine'
import { LoopStage, LOOP_KEYS, type LoopKey } from './LoopStage'
import { ModStage } from './ModStage'
import { OutputStage } from './OutputStage'
import { ALL_PARAMS, KNOB_PARAMS, defaultState, getParam } from './paramRegistry'
import { Recorder, type RecordedTake } from './Recorder'
import { SourceStage } from './SourceStage'
import { SOURCE_REGISTRY } from './sources'
import type { ParamState } from './types'
import { loadWorklets } from './worklets'

export type EngineStatus = 'idle' | 'starting' | 'running' | 'stopping'

export type EngineEvent =
  | { type: 'status'; status: EngineStatus }
  | { type: 'fault'; node: string }
  | { type: 'panic' }
  | { type: 'take'; take: RecordedTake }
  | { type: 'recording'; on: boolean }
  | { type: 'error'; message: string }

type F32 = Float32Array<ArrayBuffer>

/** One analysed frame of the master output. Shared by every visual so it is computed once per rAF. */
export interface Frame {
  active: boolean
  time: F32
  freq: F32
  peakL: number
  peakR: number
  rmsL: number
  rmsR: number
  /** dB, 0 or negative (how much the limiter is pulling down). */
  limiterReduction: number
  clip: boolean
  sampleRate: number
}

const EMPTY_FRAME: Frame = {
  active: false,
  time: new Float32Array(4096),
  freq: new Float32Array(2048).fill(-120),
  peakL: 0,
  peakR: 0,
  rmsL: 0,
  rmsR: 0,
  limiterReduction: 0,
  clip: false,
  sampleRate: 48000,
}

export const MAX_RECORD_SECONDS = 10 * 60

const TICK_MS = 50
const LOOP_KEY_SET = new Set<string>(LOOP_KEYS)
const CHAOS_IDS = KNOB_PARAMS.filter((k) => k.chaos).map((k) => k.id)

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * The audio engine singleton. It owns the AudioContext and every DSP stage. It is NOT React
 * state: the param store forwards changes with `setBase`, and visuals pull data with `readFrame`.
 */
class AudioEngine {
  status: EngineStatus = 'idle'

  private ctx: AudioContext | null = null
  private sources: SourceStage | null = null
  private mod: ModStage | null = null
  private loop: LoopStage | null = null
  private out: OutputStage | null = null
  private recorder: Recorder | null = null
  private readonly chaos = new ChaosEngine()

  private readonly base = new Map<string, number>()
  private readonly enabled = new Map<string, boolean>()
  private readonly locked = new Set<string>()
  /** The value actually applied, including chaos drift. Read by the knobs' ghost markers. */
  private readonly live = new Map<string, number>()

  private listeners = new Set<(e: EngineEvent) => void>()
  private ticker: ReturnType<typeof setInterval> | null = null
  private shuttingDown = false
  private recovering = false
  private frame: Frame = EMPTY_FRAME
  private lastStamp = -1

  constructor() {
    const d = defaultState()
    for (const [id, v] of Object.entries(d.values)) this.base.set(id, v)
    for (const [id, on] of Object.entries(d.enabled)) this.enabled.set(id, on)
  }

  // ---- events -----------------------------------------------------------------------------

  subscribe(fn: (e: EngineEvent) => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit(e: EngineEvent): void {
    this.listeners.forEach((fn) => fn(e))
  }

  private setStatus(status: EngineStatus): void {
    this.status = status
    this.emit({ type: 'status', status })
  }

  // ---- transport --------------------------------------------------------------------------

  /** Must be called from a user gesture (a click). */
  async start(state: ParamState): Promise<void> {
    if (this.status !== 'idle') return
    this.setStatus('starting')
    try {
      for (const [id, v] of Object.entries(state.values)) this.base.set(id, v)
      for (const [id, on] of Object.entries(state.enabled)) this.enabled.set(id, on)

      if (!this.ctx) {
        // Created synchronously, inside the click, so the browser allows audio.
        this.ctx = new AudioContext({ latencyHint: 'interactive' })
        await this.build(this.ctx)
      }
      this.shuttingDown = false
      this.chaos.reset()
      this.applyAll()
      await this.ctx.resume()
      this.out?.fadeIn(0.12)
      this.startTicker()
      this.setStatus('running')
    } catch (err) {
      console.error(err)
      this.emit({ type: 'error', message: err instanceof Error ? err.message : 'Audio failed to start' })
      this.setStatus('idle')
    }
  }

  private async build(ctx: AudioContext): Promise<void> {
    await loadWorklets(ctx)
    const onFault = (node: string) => this.handleFault(node)

    this.out = new OutputStage(ctx, onFault)
    this.mod = new ModStage(ctx)
    this.sources = new SourceStage(ctx)
    this.loop = new LoopStage(ctx, this.mod, onFault)
    this.recorder = new Recorder(ctx)

    this.sources.output.connect(this.loop.input)
    this.sources.output.connect(this.out.dryIn)
    this.loop.tap.connect(this.out.wetIn)
    this.out.clipNode.connect(this.recorder.node)
    this.recorder.node.connect(ctx.destination)
  }

  /** Fade out, flush any recording, clear the loop, and suspend the context. */
  private async shutdown(tau: number, waitMs: number): Promise<void> {
    if (this.shuttingDown || !this.ctx) return
    this.shuttingDown = true
    this.setStatus('stopping')
    this.out?.fadeOut(tau)
    await sleep(waitMs)
    try {
      await this.finishRecording()
      this.loop?.reset()
      this.chaos.reset()
      this.stopTicker()
      await this.ctx.suspend()
    } finally {
      this.shuttingDown = false
      this.setStatus('idle')
    }
  }

  async stop(): Promise<void> {
    if (this.status !== 'running') return
    await this.shutdown(0.06, 320)
  }

  /**
   * Instantly cut the feedback and fade out, then clear the delay lines and stop. The cut is
   * synchronous; the cleanup happens right after.
   */
  panic(): void {
    if (!this.ctx || this.status === 'idle') return
    this.out?.fadeOut(0.012)
    this.loop?.cutFeedback()
    this.emit({ type: 'panic' })
    void this.shutdown(0.012, 140)
  }

  kick(): void {
    if (this.status === 'running') this.sources?.trigger()
  }

  /** A worklet saw NaN/Infinity. Rebuild the loop behind a short fade and carry on. */
  private handleFault(node: string): void {
    if (this.recovering || this.status !== 'running' || !this.loop || !this.out) return
    this.recovering = true
    this.emit({ type: 'fault', node })
    this.out.fadeOut(0.01)
    setTimeout(() => {
      this.loop?.reset()
      this.chaos.reset()
      this.out?.fadeIn(0.15)
      setTimeout(() => {
        this.recovering = false
      }, 400)
    }, 90)
  }

  // ---- parameters -------------------------------------------------------------------------

  setBase(id: string, value: number): void {
    this.base.set(id, value)
    this.applyParam(id)
  }

  setEnabled(sourceId: string, on: boolean): void {
    this.enabled.set(sourceId, on)
    this.sources?.setEnabled(sourceId, on)
  }

  setLocked(id: string, locked: boolean): void {
    if (locked) this.locked.add(id)
    else this.locked.delete(id)
    this.applyParam(id)
  }

  /** The value currently applied (base plus chaos drift). */
  getLive(id: string): number | undefined {
    return this.live.get(id)
  }

  private effective(id: string): number {
    const def = getParam(id)
    const base = this.base.get(id) ?? def.def
    if (def.kind === 'knob' && def.chaos && this.chaos.amount > 0 && !this.locked.has(id) && this.status === 'running') {
      return this.chaos.apply(def, base)
    }
    return base
  }

  private applyAll(): void {
    for (const p of ALL_PARAMS) this.applyParam(p.id)
    for (const s of SOURCE_REGISTRY) this.sources?.setEnabled(s.id, s.trigger ? true : (this.enabled.get(s.id) ?? s.defaultEnabled))
    const out = this.out
    if (out) {
      out.setMaster(this.base.get('master') ?? -14, true)
      out.setMixNow(this.base.get('mix') ?? 0.9)
    }
  }

  private applyParam(id: string): void {
    const def = getParam(id)
    const v = this.effective(id)
    this.live.set(id, v)
    if (!this.ctx) return

    if (LOOP_KEY_SET.has(id)) {
      this.loop?.set(id as LoopKey, v)
      if (id === 'delayTime') this.mod?.setDelayTime(v)
      return
    }
    switch (id) {
      case 'lfoRate':
        this.mod?.setRate(v)
        break
      case 'lfoDelay':
        this.mod?.setDelayDepth(v)
        break
      case 'lfoFilter':
        this.mod?.setFilterDepth(v)
        break
      case 'mix':
        this.out?.setMix(v)
        break
      case 'master':
        this.out?.setMaster(v)
        break
      case 'chaos':
        this.chaos.amount = v
        // Chaos going back to zero must put every drifting parameter back on its knob value.
        for (const cid of CHAOS_IDS) this.applyParam(cid)
        break
      case 'drift':
        this.chaos.rate = v
        break
      default:
        if (def.id.includes('.')) this.sources?.setParam(id, v)
    }
  }

  // ---- ticker: chaos drift, recording limit ------------------------------------------------

  private startTicker(): void {
    if (this.ticker) return
    this.ticker = setInterval(() => this.tick(), TICK_MS)
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  }

  private tick(): void {
    if (this.status !== 'running') return
    if (this.chaos.amount > 0) {
      const ids = CHAOS_IDS.filter((id) => !this.locked.has(id))
      this.chaos.step(TICK_MS / 1000, ids)
      for (const id of ids) this.applyParam(id)
    }
    if (this.recorder?.recording && this.recorder.elapsed() >= MAX_RECORD_SECONDS) {
      void this.stopRecording()
    }
  }

  // ---- recording --------------------------------------------------------------------------

  get isRecording(): boolean {
    return this.recorder?.recording ?? false
  }

  recordingElapsed(): number {
    return this.recorder?.elapsed() ?? 0
  }

  startRecording(): boolean {
    if (this.status !== 'running' || !this.recorder || this.recorder.recording) return false
    this.recorder.start()
    this.emit({ type: 'recording', on: true })
    return true
  }

  async stopRecording(): Promise<RecordedTake | null> {
    const rec = this.recorder
    if (!rec || !rec.recording) return null
    const take = await rec.stop()
    this.emit({ type: 'recording', on: false })
    if (take) this.emit({ type: 'take', take })
    return take
  }

  private async finishRecording(): Promise<void> {
    if (this.recorder?.recording) await this.stopRecording()
  }

  // ---- visuals ----------------------------------------------------------------------------

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 48000
  }

  /** Analyse the master once per animation frame (`stamp` = the rAF timestamp). */
  readFrame(stamp: number): Frame {
    if (stamp === this.lastStamp) return this.frame
    this.lastStamp = stamp
    const out = this.out
    if (!out || !this.ctx || this.ctx.state !== 'running') {
      this.frame = EMPTY_FRAME
      return this.frame
    }
    out.readScopeAndSpectrum()
    const m = out.read()
    this.frame = {
      active: true,
      time: out.timeBuf,
      freq: out.freqBuf,
      ...m,
      limiterReduction: out.limiterReduction,
      clip: performance.now() < out.clipUntil,
      sampleRate: this.ctx.sampleRate,
    }
    return this.frame
  }
}

export const engine = new AudioEngine()

if (import.meta.env.DEV) {
  ;(window as unknown as { __engine: AudioEngine }).__engine = engine
}
