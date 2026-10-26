// fy-saturator: tanh soft clip. Keeps the feedback loop bounded (output is always within +-1).
// Posts { type: 'fault', node: 'saturator' } and outputs silence if it ever sees NaN or Infinity.
class FySaturator extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'drive', defaultValue: 1.5, minValue: 0.05, maxValue: 24, automationRate: 'k-rate' }]
  }

  constructor() {
    super()
    this.alive = true
    this.lastFault = -10
    this.port.onmessage = (e) => {
      if (e.data === 'dispose') this.alive = false
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    const drive = parameters.drive[0]
    let fault = false

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
        } else {
          out[i] = Math.tanh(drive * x)
        }
      }
    }

    if (fault && currentTime - this.lastFault > 0.5) {
      this.lastFault = currentTime
      this.port.postMessage({ type: 'fault', node: 'saturator' })
    }
    return this.alive
  }
}

registerProcessor('fy-saturator', FySaturator)
