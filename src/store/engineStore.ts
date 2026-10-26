import { create } from 'zustand'
import { engine, type EngineStatus } from '../audio/AudioEngine'
import { useParamStore } from './paramStore'

const WARNED_KEY = 'feedbackyard.warned.v1'

export interface Notice {
  id: number
  kind: 'info' | 'warn'
  text: string
}

interface EngineStore {
  status: EngineStatus
  recording: boolean
  warningAcknowledged: boolean
  notice: Notice | null
  acknowledgeWarning(): void
  start(): Promise<void>
  stop(): Promise<void>
  toggle(): Promise<void>
  dismissNotice(): void
}

function loadWarned(): boolean {
  try {
    return localStorage.getItem(WARNED_KEY) === '1'
  } catch {
    return false
  }
}

let noticeId = 0
let noticeTimer: ReturnType<typeof setTimeout> | null = null

export const useEngineStore = create<EngineStore>((set, get) => ({
  status: engine.status,
  recording: false,
  warningAcknowledged: loadWarned(),
  notice: null,

  acknowledgeWarning: () => {
    try {
      localStorage.setItem(WARNED_KEY, '1')
    } catch {
      /* storage unavailable */
    }
    set({ warningAcknowledged: true })
  },

  start: () => engine.start(useParamStore.getState().snapshot()),
  stop: () => engine.stop(),
  toggle: () => (get().status === 'running' ? get().stop() : get().start()),
  dismissNotice: () => set({ notice: null }),
}))

function showNotice(kind: Notice['kind'], text: string): void {
  if (noticeTimer) clearTimeout(noticeTimer)
  useEngineStore.setState({ notice: { id: ++noticeId, kind, text } })
  noticeTimer = setTimeout(() => useEngineStore.setState({ notice: null }), 5000)
}

engine.subscribe((e) => {
  switch (e.type) {
    case 'status':
      useEngineStore.setState({ status: e.status })
      break
    case 'recording':
      useEngineStore.setState({ recording: e.on })
      break
    case 'panic':
      showNotice('warn', 'PANIC: FEEDBACK CUT, LOOP CLEARED')
      break
    case 'fault':
      showNotice('warn', `NaN IN ${e.node.toUpperCase()}: LOOP RESET AUTOMATICALLY`)
      break
    case 'error':
      showNotice('warn', `AUDIO ERROR: ${e.message}`)
      break
    default:
      break
  }
})
