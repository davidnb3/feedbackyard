// fy-recorder: captures the master output (stereo) as raw float samples.
// Control: port.postMessage({ cmd: 'start' | 'stop' }). Posts { type: 'chunk', l, r } blocks while
// recording and { type: 'done' } after a stop has flushed. The audio output is silence.
const CHUNK = 4096

class FyRecorder extends AudioWorkletProcessor {
  constructor() {
    super()
    this.alive = true
    this.recording = false
    this.fill = 0
    this.l = new Float32Array(CHUNK)
    this.r = new Float32Array(CHUNK)
    this.port.onmessage = (e) => {
      const cmd = e.data && e.data.cmd
      if (e.data === 'dispose') this.alive = false
      else if (cmd === 'start') {
        this.fill = 0
        this.recording = true
      } else if (cmd === 'stop') {
        this.flush()
        this.recording = false
        this.port.postMessage({ type: 'done' })
      }
    }
  }

  flush() {
    if (this.fill === 0) return
    const l = this.l.slice(0, this.fill)
    const r = this.r.slice(0, this.fill)
    this.port.postMessage({ type: 'chunk', l, r }, [l.buffer, r.buffer])
    this.fill = 0
  }

  process(inputs) {
    if (!this.recording) return this.alive
    const input = inputs[0]
    const a = input[0]
    const b = input[1] || input[0]
    if (!a) return this.alive
    for (let i = 0; i < a.length; i++) {
      const x = a[i]
      const y = b[i]
      this.l[this.fill] = Number.isFinite(x) ? x : 0
      this.r[this.fill] = Number.isFinite(y) ? y : 0
      this.fill++
      if (this.fill === CHUNK) this.flush()
    }
    return this.alive
  }
}

registerProcessor('fy-recorder', FyRecorder)
