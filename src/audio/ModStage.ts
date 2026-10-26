import { smooth } from './smooth'

/** Peak filter modulation in cents at depth 1 (two octaves each way). */
const FILTER_CENTS = 2400

/**
 * Two free-running LFOs: a sine on delay time and a triangle at a slightly off rate on the
 * filter, so the wobble never lines up. The LFO gains are stable nodes; the loop re-attaches them
 * to its AudioParams whenever it rebuilds (see `connectTargets`).
 */
export class ModStage {
  private readonly lfoDelay: OscillatorNode
  private readonly lfoFilter: OscillatorNode
  private readonly delayGain: GainNode
  private readonly filterGain: GainNode
  private depth = 0
  private delayTime = 0.2

  constructor(private readonly ctx: AudioContext) {
    this.lfoDelay = ctx.createOscillator()
    this.lfoDelay.type = 'sine'
    this.lfoFilter = ctx.createOscillator()
    this.lfoFilter.type = 'triangle'
    this.delayGain = ctx.createGain()
    this.delayGain.gain.value = 0
    this.filterGain = ctx.createGain()
    this.filterGain.gain.value = 0
    this.lfoDelay.connect(this.delayGain)
    this.lfoFilter.connect(this.filterGain)
    this.lfoDelay.start()
    this.lfoFilter.start()
  }

  connectTargets(delayTime: AudioParam, filterDetune: AudioParam): void {
    this.delayGain.disconnect()
    this.filterGain.disconnect()
    this.delayGain.connect(delayTime)
    this.filterGain.connect(filterDetune)
  }

  setRate(hz: number): void {
    smooth(this.ctx, this.lfoDelay.frequency, hz, 0.05)
    smooth(this.ctx, this.lfoFilter.frequency, hz * 0.73, 0.05)
  }

  /** Depth is proportional: at 1 the delay time swings +-50% around its base value. */
  setDelayDepth(depth: number): void {
    this.depth = depth
    this.updateDelayGain()
  }

  setDelayTime(seconds: number): void {
    this.delayTime = seconds
    this.updateDelayGain()
  }

  setFilterDepth(depth: number): void {
    smooth(this.ctx, this.filterGain.gain, depth * FILTER_CENTS, 0.05)
  }

  private updateDelayGain(): void {
    smooth(this.ctx, this.delayGain.gain, this.depth * 0.5 * this.delayTime, 0.05)
  }

  dispose(): void {
    this.lfoDelay.stop()
    this.lfoFilter.stop()
    this.lfoDelay.disconnect()
    this.lfoFilter.disconnect()
    this.delayGain.disconnect()
    this.filterGain.disconnect()
  }
}
