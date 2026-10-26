// fy-pitch-shifter: granular delay-line pitch shifter (two overlapping Hann-windowed taps).
// Used inside the feedback loop, so each pass shifts again and the sound spirals up or down.
// It is deliberately rough: artifacts are part of the sound. At ~0 semitones it is bypassed.
class FyPitchShifter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'pitch', defaultValue: 0, minValue: -24, maxValue: 24, automationRate: 'k-rate' }]
  }

  constructor() {
    super()
    this.alive = true
    this.lastFault = -10
    this.grain = Math.round(sampleRate * 0.05)
    let size = 1
    while (size < this.grain * 2 + 16) size <<= 1
    this.mask = size - 1
    this.bufs = [new Float32Array(size), new Float32Array(size)]
    this.w = 0
    this.phase = 0
    this.wet = 0
    this.port.onmessage = (e) => {
      if (e.data === 'dispose') this.alive = false
    }
  }

  reset() {
    this.bufs[0].fill(0)
    this.bufs[1].fill(0)
    this.phase = 0
    this.wet = 0
  }

  read(buf, pos) {
    const i0 = Math.floor(pos)
    const frac = pos - i0
    const a = buf[i0 & this.mask]
    const b = buf[(i0 + 1) & this.mask]
    return a + (b - a) * frac
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    const pitch = parameters.pitch[0]
    const ratio = Math.pow(2, pitch / 12)
    const inc = (1 - ratio) / this.grain
    const wetTarget = Math.abs(pitch) > 0.01 ? 1 : 0
    const grain = this.grain
    const mask = this.mask
    const nch = output.length
    const frames = output[0] ? output[0].length : 128
    let fault = false

    let w = this.w
    let phase = this.phase
    let wet = this.wet

    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < nch; c++) {
        const inp = input[c] || input[0]
        let x = inp ? inp[i] : 0
        if (!Number.isFinite(x)) {
          x = 0
          fault = true
        }
        this.bufs[c][w] = x
      }

      phase += inc
      phase -= Math.floor(phase)
      const p1 = phase + 0.5 >= 1 ? phase - 0.5 : phase + 0.5
      const d0 = phase * grain + 2
      const d1 = p1 * grain + 2
      const w0 = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase)
      const w1 = 1 - w0
      wet += (wetTarget - wet) * 0.002

      for (let c = 0; c < nch; c++) {
        const buf = this.bufs[c]
        const dry = buf[w]
        const shifted = w0 * this.read(buf, w - d0) + w1 * this.read(buf, w - d1)
        const y = dry * (1 - wet) + shifted * wet
        if (!Number.isFinite(y)) {
          output[c][i] = 0
          fault = true
        } else {
          output[c][i] = y
        }
      }
      w = (w + 1) & mask
    }

    this.w = w
    this.phase = phase
    this.wet = wet

    if (fault) {
      this.reset()
      if (currentTime - this.lastFault > 0.5) {
        this.lastFault = currentTime
        this.port.postMessage({ type: 'fault', node: 'pitch-shifter' })
      }
    }
    return this.alive
  }
}

registerProcessor('fy-pitch-shifter', FyPitchShifter)
