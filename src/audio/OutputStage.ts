import { dbToGain } from '../utils/dsp-math'
import { smooth } from './smooth'
import { createStereoWorklet, forceStereo, type FaultHandler } from './worklets'

type F32 = Float32Array<ArrayBuffer>

export interface MeterReadout {
  peakL: number
  peakR: number
  rmsL: number
  rmsR: number
}

/**
 * dry/wet -> master -> panic gain -> limiter -> safety clip -> (analysers, recorder, destination).
 * The safety chain order here must not change. See .cursor/rules/audio-safety.mdc.
 */
export class OutputStage {
  readonly dryIn: GainNode
  readonly wetIn: GainNode
  /** The final node before the destination; the recorder taps this. */
  readonly clipNode: AudioWorkletNode
  readonly analyser: AnalyserNode
  readonly timeBuf: F32
  readonly freqBuf: F32

  private readonly master: GainNode
  private readonly panicGain: GainNode
  private readonly limiter: DynamicsCompressorNode
  private readonly anL: AnalyserNode
  private readonly anR: AnalyserNode
  private readonly bufL: F32
  private readonly bufR: F32
  clipUntil = 0

  constructor(
    private readonly ctx: AudioContext,
    onFault: FaultHandler,
  ) {
    this.dryIn = forceStereo(ctx.createGain())
    this.wetIn = forceStereo(ctx.createGain())
    const sum = forceStereo(ctx.createGain())
    this.master = forceStereo(ctx.createGain())
    this.panicGain = forceStereo(ctx.createGain())

    this.limiter = ctx.createDynamicsCompressor()
    this.limiter.threshold.value = -8
    this.limiter.knee.value = 4
    this.limiter.ratio.value = 20
    this.limiter.attack.value = 0.002
    this.limiter.release.value = 0.12
    forceStereo(this.limiter)

    this.clipNode = createStereoWorklet(ctx, 'fy-safety-clip', onFault)
    this.clipNode.port.onmessage = (e: MessageEvent) => {
      const type = e.data && e.data.type
      if (type === 'clip') this.clipUntil = performance.now() + 700
      else if (type === 'fault') onFault(String(e.data.node ?? 'safety-clip'))
    }

    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 4096
    this.analyser.smoothingTimeConstant = 0.6
    this.analyser.minDecibels = -110
    this.analyser.maxDecibels = -10
    const split = ctx.createChannelSplitter(2)
    this.anL = ctx.createAnalyser()
    this.anR = ctx.createAnalyser()
    this.anL.fftSize = 1024
    this.anR.fftSize = 1024
    this.timeBuf = new Float32Array(this.analyser.fftSize)
    this.freqBuf = new Float32Array(this.analyser.frequencyBinCount)
    this.bufL = new Float32Array(1024)
    this.bufR = new Float32Array(1024)

    // Start silent and conservative. The engine applies the real values and fades in.
    this.master.gain.value = 0
    this.panicGain.gain.value = 0

    this.dryIn.connect(sum)
    this.wetIn.connect(sum)
    sum.connect(this.master)
    this.master.connect(this.panicGain)
    this.panicGain.connect(this.limiter)
    this.limiter.connect(this.clipNode)
    this.clipNode.connect(ctx.destination)
    this.clipNode.connect(this.analyser)
    this.clipNode.connect(split)
    split.connect(this.anL, 0)
    split.connect(this.anR, 1)
  }

  /** Equal-power dry/wet. 0 = all dry, 1 = all wet. */
  setMix(mix: number): void {
    smooth(this.ctx, this.dryIn.gain, Math.cos(mix * Math.PI * 0.5), 0.03)
    smooth(this.ctx, this.wetIn.gain, Math.sin(mix * Math.PI * 0.5), 0.03)
  }

  setMaster(db: number, jump = false): void {
    const g = dbToGain(db)
    if (jump) this.master.gain.value = g
    else smooth(this.ctx, this.master.gain, g, 0.04)
  }

  setMixNow(mix: number): void {
    this.dryIn.gain.value = Math.cos(mix * Math.PI * 0.5)
    this.wetIn.gain.value = Math.sin(mix * Math.PI * 0.5)
  }

  /** Fast fade to silence. `tau` is the time constant in seconds (PANIC uses a very short one). */
  fadeOut(tau: number): void {
    const t = this.ctx.currentTime
    this.panicGain.gain.cancelScheduledValues(t)
    this.panicGain.gain.setTargetAtTime(0, t, tau)
  }

  fadeIn(tau: number): void {
    const t = this.ctx.currentTime
    this.panicGain.gain.cancelScheduledValues(t)
    this.panicGain.gain.setTargetAtTime(1, t + 0.03, tau)
  }

  get limiterReduction(): number {
    return this.limiter.reduction
  }

  read(): MeterReadout {
    this.anL.getFloatTimeDomainData(this.bufL)
    this.anR.getFloatTimeDomainData(this.bufR)
    const stats = (buf: F32): [number, number] => {
      let peak = 0
      let sq = 0
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i]
        const a = v < 0 ? -v : v
        if (a > peak) peak = a
        sq += v * v
      }
      return [peak, Math.sqrt(sq / buf.length)]
    }
    const [peakL, rmsL] = stats(this.bufL)
    const [peakR, rmsR] = stats(this.bufR)
    return { peakL, peakR, rmsL, rmsR }
  }

  readScopeAndSpectrum(): void {
    this.analyser.getFloatTimeDomainData(this.timeBuf)
    this.analyser.getFloatFrequencyData(this.freqBuf)
  }
}
