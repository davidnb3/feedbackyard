// fy-dc-blocker: one-pole high-pass, y[n] = x[n] - x[n-1] + R * y[n-1].
// Removes DC offset that would otherwise accumulate in the feedback loop.
class FyDcBlocker extends AudioWorkletProcessor {
  constructor() {
    super()
    this.alive = true
    this.lastFault = -10
    this.r = 0.995
    this.x1 = [0, 0]
    this.y1 = [0, 0]
    this.port.onmessage = (e) => {
      if (e.data === 'dispose') this.alive = false
    }
  }

  process(inputs, outputs) {
    const input = inputs[0]
    const output = outputs[0]
    const r = this.r
    let fault = false

    for (let c = 0; c < output.length; c++) {
      const out = output[c]
      const inp = input[c] || input[0]
      if (!inp) {
        out.fill(0)
        continue
      }
      let x1 = this.x1[c]
      let y1 = this.y1[c]
      for (let i = 0; i < out.length; i++) {
        const x = inp[i]
        let y = x - x1 + r * y1
        if (!Number.isFinite(y)) {
          y = 0
          x1 = 0
          y1 = 0
          fault = true
        } else {
          x1 = x
          y1 = y
        }
        out[i] = y
      }
      this.x1[c] = x1
      this.y1[c] = y1
    }

    if (fault && currentTime - this.lastFault > 0.5) {
      this.lastFault = currentTime
      this.port.postMessage({ type: 'fault', node: 'dc-blocker' })
    }
    return this.alive
  }
}

registerProcessor('fy-dc-blocker', FyDcBlocker)
