import { SOURCE_REGISTRY } from './sources'
import type { Source } from './types'
import { forceStereo } from './worklets'

/** Owns every registered source and mixes them into one stereo bus. */
export class SourceStage {
  readonly output: GainNode
  private readonly sources = new Map<string, Source>()

  constructor(ctx: AudioContext) {
    this.output = forceStereo(ctx.createGain())
    for (const def of SOURCE_REGISTRY) {
      const source = def.create(ctx)
      source.output.connect(this.output)
      source.start()
      this.sources.set(def.id, source)
    }
  }

  /** `paramId` is the full id, for example "osc.freq". */
  setParam(paramId: string, value: number): void {
    const dot = paramId.indexOf('.')
    if (dot < 0) return
    this.sources.get(paramId.slice(0, dot))?.setParam(paramId.slice(dot + 1), value)
  }

  setEnabled(sourceId: string, on: boolean): void {
    this.sources.get(sourceId)?.setEnabled(on)
  }

  trigger(): void {
    this.sources.forEach((s) => s.trigger?.())
  }

  dispose(): void {
    this.sources.forEach((s) => s.dispose())
    this.sources.clear()
    this.output.disconnect()
  }
}
