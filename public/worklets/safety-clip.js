// fy-safety-clip: the very last stage before the destination.
// Hard clips at -1 dBFS, replaces NaN/Infinity with silence, and reports clipping and faults.
const CEILING = 0.891

class FySafetyClip extends AudioWorkletProcessor {
  constructor() {
    super()
    this.alive = true
    this.lastFault = -10
    this.lastClip = -10
    this.port.onmessage = (e) => {
      if (e.data === 'dispose') this.alive = false
    }
  }

  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    let fault = false
    let clipped = false

    for (let c = 0; c < output.length; c++) {
      const out = output[c]
      const inp = input[c] || input[0]
      if (!inp) {
        out.fill(0)
        continue
      }
      for (let i = 0; i < out.length; i++) {
        const x = inp[i]
        if (!Number.isFinite(x)) {
          out[i] = 0
          fault = true
        } else if (x > CEILING) {
          out[i] = CEILING
          clipped = true
        } else if (x < -CEILING) {
          out[i] = -CEILING
          clipped = true
        } else {
          out[i] = x
        }
      }
    }

    if (clipped && currentTime - this.lastClip > 0.05) {
      this.lastClip = currentTime
      this.port.postMessage({ type: 'clip' })
    }
    if (fault && currentTime - this.lastFault > 0.5) {
      this.lastFault = currentTime
      this.port.postMessage({ type: 'fault', node: 'safety-clip' })
    }
    return this.alive
  }
}

registerProcessor('fy-safety-clip', FySafetyClip)
