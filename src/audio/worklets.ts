/** Worklet files in public/worklets, loaded once per AudioContext. */
export const WORKLET_FILES = [
  'saturator.js',
  'dc-blocker.js',
  'safety-clip.js',
  'pitch-shifter.js',
  'reverb.js',
  'recorder.js',
] as const

export function loadWorklets(ctx: AudioContext): Promise<void[]> {
  const base = import.meta.env.BASE_URL
  return Promise.all(WORKLET_FILES.map((file) => ctx.audioWorklet.addModule(`${base}worklets/${file}`)))
}

export type FaultHandler = (node: string) => void

/** A stereo-in, stereo-out worklet node that reports `{ type: 'fault' }` messages. */
export function createStereoWorklet(ctx: AudioContext, name: string, onFault?: FaultHandler): AudioWorkletNode {
  const node = new AudioWorkletNode(ctx, name, {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
  })
  node.port.onmessage = (e: MessageEvent) => {
    if (e.data && e.data.type === 'fault') onFault?.(String(e.data.node ?? name))
  }
  return node
}

export function workletParam(node: AudioWorkletNode, name: string): AudioParam {
  const p = node.parameters.get(name)
  if (!p) throw new Error(`Worklet param missing: ${name}`)
  return p
}

export function disposeWorklet(node: AudioWorkletNode): void {
  node.port.postMessage('dispose')
  node.port.onmessage = null
  node.disconnect()
}

/** Force a node to carry two channels, so mono sources are upmixed and stereo is preserved. */
export function forceStereo<T extends AudioNode>(node: T): T {
  node.channelCount = 2
  node.channelCountMode = 'explicit'
  node.channelInterpretation = 'speakers'
  return node
}
