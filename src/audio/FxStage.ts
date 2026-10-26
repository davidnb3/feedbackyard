import { smooth } from './smooth'
import { createStereoWorklet, disposeWorklet, workletParam, type FaultHandler } from './worklets'

/** Reverb/diffusion (stereo Freeverb worklet). Lives inside the loop; mix 0 is a clean pass-through. */
export class FxStage {
  readonly node: AudioWorkletNode

  constructor(
    private readonly ctx: AudioContext,
    onFault: FaultHandler,
  ) {
    this.node = createStereoWorklet(ctx, 'fy-reverb', onFault)
  }

  setMix(v: number): void {
    smooth(this.ctx, workletParam(this.node, 'mix'), v, 0.03)
  }

  setSize(v: number): void {
    smooth(this.ctx, workletParam(this.node, 'size'), v, 0.05)
  }

  setDamp(v: number): void {
    smooth(this.ctx, workletParam(this.node, 'damp'), v, 0.05)
  }

  /** Initial values on a fresh node (no audio has passed through it yet). */
  init(mix: number, size: number, damp: number): void {
    workletParam(this.node, 'mix').value = mix
    workletParam(this.node, 'size').value = size
    workletParam(this.node, 'damp').value = damp
  }

  dispose(): void {
    disposeWorklet(this.node)
  }
}
