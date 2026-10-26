import { FxStage } from './FxStage'
import type { ModStage } from './ModStage'
import { getParam } from './paramRegistry'
import { smooth } from './smooth'
import {
  createStereoWorklet,
  disposeWorklet,
  forceStereo,
  workletParam,
  type FaultHandler,
} from './worklets'

export type LoopKey =
  | 'feedback'
  | 'delayTime'
  | 'cutoff'
  | 'resonance'
  | 'filterType'
  | 'drive'
  | 'pitch'
  | 'reverbMix'
  | 'reverbSize'
  | 'reverbDamp'

export const LOOP_KEYS: readonly LoopKey[] = [
  'feedback',
  'delayTime',
  'cutoff',
  'resonance',
  'filterType',
  'drive',
  'pitch',
  'reverbMix',
  'reverbSize',
  'reverbDamp',
]

const FILTER_TYPES: BiquadFilterType[] = ['lowpass', 'bandpass', 'highpass']
const MAX_DELAY = 5

interface Chain {
  sum: GainNode
  delay: DelayNode
  shifter: AudioWorkletNode
  filter: BiquadFilterNode
  saturator: AudioWorkletNode
  dcBlocker: AudioWorkletNode
  fx: FxStage
  feedback: GainNode
}

/**
 * The feedback loop:
 *
 *   input -> sum -> DelayNode -> pitch shifter -> filter -> saturator(tanh) -> DC blocker
 *         -> reverb -+-> tap  (to the output stage)
 *                    +-> feedback gain -> sum
 *
 * `input` and `tap` are stable nodes. Everything between them lives in a `Chain` that can be
 * thrown away and rebuilt (`reset`), which clears the delay line, the filter state and every
 * worklet, so a runaway or NaN can never survive PANIC or a recovery.
 */
export class LoopStage {
  readonly input: GainNode
  readonly tap: GainNode
  private chain: Chain | null = null
  private readonly p: Record<LoopKey, number>

  constructor(
    private readonly ctx: AudioContext,
    private readonly mod: ModStage,
    private readonly onFault: FaultHandler,
  ) {
    this.input = forceStereo(ctx.createGain())
    this.tap = forceStereo(ctx.createGain())
    this.p = Object.fromEntries(LOOP_KEYS.map((k) => [k, getParam(k).def])) as Record<LoopKey, number>
    this.build()
  }

  private build(): void {
    const ctx = this.ctx
    const sum = forceStereo(ctx.createGain())
    const delay = forceStereo(ctx.createDelay(MAX_DELAY))
    const shifter = createStereoWorklet(ctx, 'fy-pitch-shifter', this.onFault)
    const filter = forceStereo(ctx.createBiquadFilter())
    const saturator = createStereoWorklet(ctx, 'fy-saturator', this.onFault)
    const dcBlocker = createStereoWorklet(ctx, 'fy-dc-blocker', this.onFault)
    const fx = new FxStage(ctx, this.onFault)
    const feedback = forceStereo(ctx.createGain())

    this.input.connect(sum)
    sum.connect(delay)
    delay.connect(shifter)
    shifter.connect(filter)
    filter.connect(saturator)
    saturator.connect(dcBlocker)
    dcBlocker.connect(fx.node)
    fx.node.connect(this.tap)
    fx.node.connect(feedback)
    feedback.connect(sum)

    this.chain = { sum, delay, shifter, filter, saturator, dcBlocker, fx, feedback }
    this.mod.connectTargets(delay.delayTime, filter.detune)

    // A fresh chain has had no audio through it, so initial values may be set directly.
    const p = this.p
    feedback.gain.value = p.feedback
    delay.delayTime.value = p.delayTime
    filter.frequency.value = p.cutoff
    filter.type = FILTER_TYPES[Math.round(p.filterType)] ?? 'lowpass'
    filter.Q.value = this.filterQ()
    workletParam(saturator, 'drive').value = p.drive
    workletParam(shifter, 'pitch').value = p.pitch
    fx.init(p.reverbMix, p.reverbSize, p.reverbDamp)
  }

  private dispose(): void {
    const c = this.chain
    if (!c) return
    this.input.disconnect()
    c.fx.node.disconnect()
    c.fx.dispose()
    disposeWorklet(c.shifter)
    disposeWorklet(c.saturator)
    disposeWorklet(c.dcBlocker)
    c.sum.disconnect()
    c.delay.disconnect()
    c.filter.disconnect()
    c.feedback.disconnect()
    this.chain = null
  }

  /** Throw the whole loop away and build a silent, empty one. */
  reset(): void {
    this.dispose()
    this.build()
  }

  /** Cut the feedback as fast as the graph allows (used by PANIC). */
  cutFeedback(): void {
    const c = this.chain
    if (!c) return
    c.feedback.gain.cancelScheduledValues(this.ctx.currentTime)
    c.feedback.gain.setTargetAtTime(0, this.ctx.currentTime, 0.004)
  }

  private filterQ(): number {
    const res = this.p.resonance
    // Lowpass/highpass Q is in dB (resonance peak); bandpass Q is linear (narrowness).
    return FILTER_TYPES[Math.round(this.p.filterType)] === 'bandpass' ? 0.6 + res * res * 30 : res * 24
  }

  set(key: LoopKey, value: number): void {
    this.p[key] = value
    const c = this.chain
    if (!c) return
    const ctx = this.ctx
    switch (key) {
      case 'feedback':
        smooth(ctx, c.feedback.gain, value, 0.03)
        break
      case 'delayTime':
        // A slow time constant: moving the knob bends the pitch instead of clicking.
        smooth(ctx, c.delay.delayTime, value, 0.08)
        break
      case 'cutoff':
        smooth(ctx, c.filter.frequency, value, 0.03)
        break
      case 'resonance':
        smooth(ctx, c.filter.Q, this.filterQ(), 0.03)
        break
      case 'filterType':
        c.filter.type = FILTER_TYPES[Math.round(value)] ?? 'lowpass'
        smooth(ctx, c.filter.Q, this.filterQ(), 0.03)
        break
      case 'drive':
        smooth(ctx, workletParam(c.saturator, 'drive'), value, 0.03)
        break
      case 'pitch':
        smooth(ctx, workletParam(c.shifter, 'pitch'), value, 0.05)
        break
      case 'reverbMix':
        c.fx.setMix(value)
        break
      case 'reverbSize':
        c.fx.setSize(value)
        break
      case 'reverbDamp':
        c.fx.setDamp(value)
        break
    }
  }
}
