// fy-reverb: stereo Freeverb (8 parallel damped combs + 4 series allpasses per channel).
// Used inside the feedback loop as a diffusion stage. mix = 0 is a clean pass-through.
const COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]
const ALLPASS_TUNING = [556, 441, 341, 225]
const STEREO_SPREAD = 23

class FyReverb extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'mix', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'size', defaultValue: 0.55, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      { name: 'damp', defaultValue: 0.45, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ]
  }

  constructor() {
    super()
    this.alive = true
    this.lastFault = -10
    const scale = sampleRate / 44100
    this.combs = [[], []]
    this.allpasses = [[], []]
    for (let c = 0; c < 2; c++) {
      const spread = c === 1 ? STEREO_SPREAD : 0
      for (const t of COMB_TUNING) {
        this.combs[c].push({ buf: new Float32Array(Math.round((t + spread) * scale)), idx: 0, store: 0 })
      }
      for (const t of ALLPASS_TUNING) {
        this.allpasses[c].push({ buf: new Float32Array(Math.round((t + spread) * scale)), idx: 0 })
      }
    }
    this.mixSmooth = 0
    this.port.onmessage = (e) => {
      if (e.data === 'dispose') this.alive = false
    }
  }

  reset() {
    for (let c = 0; c < 2; c++) {
      for (const cb of this.combs[c]) {
        cb.buf.fill(0)
        cb.store = 0
      }
      for (const ap of this.allpasses[c]) ap.buf.fill(0)
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    const mixTarget = parameters.mix[0]
    const feedback = parameters.size[0] * 0.28 + 0.7
    const damp = parameters.damp[0] * 0.4
    // Classic Freeverb makeup gain (x3) grows ~8x between small and large sizes, which is far too
    // hot inside a feedback loop. Normalize by the comb decay so the wet level stays roughly constant.
    const wetComp = (3 * (1 - feedback)) / 0.32
    const nch = output.length
    const frames = output[0] ? output[0].length : 128
    let fault = false

    for (let i = 0; i < frames; i++) {
      const inL = input[0] ? input[0][i] : 0
      const inR = input[1] ? input[1][i] : inL
      if (!Number.isFinite(inL) || !Number.isFinite(inR)) {
        fault = true
        break
      }
      this.mixSmooth += (mixTarget - this.mixSmooth) * 0.002
      const mix = this.mixSmooth
      const dryGain = Math.cos(mix * Math.PI * 0.5)
      const wetGain = Math.sin(mix * Math.PI * 0.5)
      const feed = (inL + inR) * 0.015

      for (let c = 0; c < nch && c < 2; c++) {
        let sum = 0
        const combs = this.combs[c]
        for (let k = 0; k < combs.length; k++) {
          const cb = combs[k]
          const o = cb.buf[cb.idx]
          cb.store = o * (1 - damp) + cb.store * damp
          if (Math.abs(cb.store) < 1e-15) cb.store = 0
          cb.buf[cb.idx] = feed + cb.store * feedback
          cb.idx = cb.idx + 1 >= cb.buf.length ? 0 : cb.idx + 1
          sum += o
        }
        const aps = this.allpasses[c]
        for (let k = 0; k < aps.length; k++) {
          const ap = aps[k]
          const b = ap.buf[ap.idx]
          const y = -sum + b
          ap.buf[ap.idx] = sum + b * 0.5
          ap.idx = ap.idx + 1 >= ap.buf.length ? 0 : ap.idx + 1
          sum = y
        }
        const dry = c === 0 ? inL : inR
        const out = dry * dryGain + sum * wetComp * wetGain
        if (!Number.isFinite(out)) {
          fault = true
          output[c][i] = 0
        } else {
          output[c][i] = out
        }
      }
    }

    if (fault) {
      this.reset()
      for (let c = 0; c < nch; c++) output[c].fill(0)
      if (currentTime - this.lastFault > 0.5) {
        this.lastFault = currentTime
        this.port.postMessage({ type: 'fault', node: 'reverb' })
      }
    }
    return this.alive
  }
}

registerProcessor('fy-reverb', FyReverb)
