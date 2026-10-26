import { create } from 'zustand'
import { ALL_PARAMS, defaultState } from '../audio/paramRegistry'
import { SOURCE_REGISTRY } from '../audio/sources'
import type { ParamState } from '../audio/types'
import { clamp } from '../utils/dsp-math'
import { useParamStore } from './paramStore'

export const SLOT_COUNT = 4
const KEY = 'feedbackyard.snapshots.v1'

type Slot = ParamState | null

/** Turn untrusted JSON into a valid state: unknown ids dropped, values clamped, gaps filled. */
function sanitize(raw: unknown): ParamState | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { values?: Record<string, unknown>; enabled?: Record<string, unknown> }
  if (!r.values || typeof r.values !== 'object') return null
  const state = defaultState()
  for (const def of ALL_PARAMS) {
    const v = r.values[def.id]
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    state.values[def.id] =
      def.kind === 'knob' ? clamp(v, def.min, def.max) : clamp(Math.round(v), 0, def.options.length - 1)
  }
  for (const s of SOURCE_REGISTRY) {
    const on = r.enabled?.[s.id]
    if (typeof on === 'boolean') state.enabled[s.id] = on
  }
  return state
}

function load(): Slot[] {
  const empty: Slot[] = Array.from({ length: SLOT_COUNT }, () => null)
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return empty
    return empty.map((_, i) => sanitize(parsed[i]))
  } catch {
    return empty
  }
}

function persist(slots: Slot[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(slots))
  } catch {
    /* storage unavailable or full */
  }
}

interface SnapshotStore {
  slots: Slot[]
  save(index: number): void
  recall(index: number): void
  clear(index: number): void
}

export const useSnapshotStore = create<SnapshotStore>((set, get) => ({
  slots: load(),

  save: (index) => {
    const slots = get().slots.map((s, i) => (i === index ? useParamStore.getState().snapshot() : s))
    persist(slots)
    set({ slots })
  },

  recall: (index) => {
    const slot = get().slots[index]
    if (slot) useParamStore.getState().recall(slot)
  },

  clear: (index) => {
    const slots = get().slots.map((s, i) => (i === index ? null : s))
    persist(slots)
    set({ slots })
  },
}))
