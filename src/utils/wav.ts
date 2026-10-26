import type { RecordedTake } from '../audio/Recorder'

function writeString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
}

/** Hand-written 24-bit PCM stereo WAV (RIFF). Opens directly in Ableton and any other DAW. */
export function encodeWav24(left: Float32Array, right: Float32Array, sampleRate: number): Blob {
  const frames = left.length
  const channels = 2
  const bytesPerSample = 3
  const blockAlign = channels * bytesPerSample
  const dataSize = frames * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  const bytes = new Uint8Array(buffer)
  let o = 44
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      let x = c === 0 ? left[i] : right[i]
      x = x > 1 ? 1 : x < -1 ? -1 : x
      const n = Math.round(x < 0 ? x * 8388608 : x * 8388607)
      bytes[o++] = n & 0xff
      bytes[o++] = (n >> 8) & 0xff
      bytes[o++] = (n >> 16) & 0xff
    }
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

const urlCache = new WeakMap<RecordedTake, string>()

/** Object URL of the take's WAV (built on first use, cached). Used for playback and download. */
export function getTakeUrl(take: RecordedTake): string {
  let url = urlCache.get(take)
  if (!url) {
    url = URL.createObjectURL(encodeWav24(take.left, take.right, take.sampleRate))
    urlCache.set(take, url)
  }
  return url
}

export function revokeTakeUrl(take: RecordedTake): void {
  const url = urlCache.get(take)
  if (url) URL.revokeObjectURL(url)
  urlCache.delete(take)
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

export function takeFilename(take: RecordedTake): string {
  const d = new Date(take.createdAt)
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `feedbackyard-take-${pad(take.number)}-${stamp}.wav`
}

export function downloadTake(take: RecordedTake): void {
  const a = document.createElement('a')
  a.href = getTakeUrl(take)
  a.download = takeFilename(take)
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const rest = s - m * 60
  return `${pad(m)}:${rest.toFixed(1).padStart(4, '0')}`
}
