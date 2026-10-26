import { create } from 'zustand'
import { engine } from '../audio/AudioEngine'
import { ALL_PARAMS, KNOB_PARAMS, defaultState, getKnob } from '../audio/paramRegistry'
import { SOURCE_REGISTRY } from '../audio/sources'
import type { ParamState } from '../audio/types'
import {
  clamp,
  cloneState,
  easeOutCubic,
  isRandomizable,
  mixValue,
  mutateValue,
  randomValue,
} from '../utils/dsp-math'
import { prefersReducedMotion } from '../utils/motion'

const HISTORY_LIMIT = 10

interface ParamStore extends ParamState {
  locks: Record<string, boolean>
  history: ParamState[]
  snapshot(): ParamState
  /** A direct user change (knob, select). */
  set(id: string, value: number): void
  setEnabled(sourceId: string, on: boolean): void
  toggleLock(id: string): void
  reset(id: string): void
  randomize(): void
  mutate(): void
  undo(): void
  /** Move to a saved state (snapshot recall). The current state goes on the undo stack. */
  recall(state: ParamState): void
}

let tweenId = 0

function cancelTween(): void {
  tweenId++
}

/** Animate knobs (in normalized space) from their current values to `targets`. */
function tweenTo(targets: Record<string, number>, ms: number): void {
  cancelTween()
  const mine = tweenId
  const start = performance.now()
  const from = { ...useParamStore.getState().values }
  const ids = Object.keys(targets)

  const commit = (values: Record<string, number>) => {
    useParamStore.setState((s) => ({ values: { ...s.values, ...values } }))
    for (const [id, v] of Object.entries(values)) engine.setBase(id, v)
  }

  if (ms <= 0 || prefersReducedMotion()) {
    commit(targets)
    return
  }

  const frame = (now: number) => {
    if (mine !== tweenId) return
    const t = clamp((now - start) / ms, 0, 1)
    const e = easeOutCubic(t)
    const next: Record<string, number> = {}
    for (const id of ids) next[id] = mixValue(getKnob(id), from[id] ?? targets[id], targets[id], e)
    commit(next)
    if (t < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function pushHistory(): void {
  const s = useParamStore.getState()
  const next = [...s.history, cloneState(s.snapshot())].slice(-HISTORY_LIMIT)
  useParamStore.setState({ history: next })
}

/** Apply a full state: choices and source switches instantly, knobs by tween. */
function moveTo(state: ParamState, ms: number): void {
  const current = useParamStore.getState()
  const knobs: Record<string, number> = {}
  const instant: Record<string, number> = {}
  for (const p of ALL_PARAMS) {
    const v = state.values[p.id]
    if (v === undefined) continue
    if (p.kind === 'knob') knobs[p.id] = v
    else instant[p.id] = v
  }
  const enabled = { ...current.enabled, ...state.enabled }
  useParamStore.setState((s) => ({ values: { ...s.values, ...instant }, enabled }))
  for (const [id, v] of Object.entries(instant)) engine.setBase(id, v)
  for (const s of SOURCE_REGISTRY) if (!s.trigger) engine.setEnabled(s.id, enabled[s.id] ?? s.defaultEnabled)
  tweenTo(knobs, ms)
}

const initial = defaultState()

export const useParamStore = create<ParamStore>((set, get) => ({
  values: initial.values,
  enabled: initial.enabled,
  locks: {},
  history: [],

  snapshot: () => ({ values: { ...get().values }, enabled: { ...get().enabled } }),

  set: (id, value) => {
    cancelTween()
    set((s) => ({ values: { ...s.values, [id]: value } }))
    engine.setBase(id, value)
  },

  setEnabled: (sourceId, on) => {
    set((s) => ({ enabled: { ...s.enabled, [sourceId]: on } }))
    engine.setEnabled(sourceId, on)
  },

  toggleLock: (id) => {
    const locked = !get().locks[id]
    set((s) => ({ locks: { ...s.locks, [id]: locked } }))
    engine.setLocked(id, locked)
  },

  reset: (id) => {
    const def = ALL_PARAMS.find((p) => p.id === id)
    if (def) get().set(id, def.def)
  },

  randomize: () => {
    pushHistory()
    const locks = get().locks
    const targets: Record<string, number> = {}
    for (const def of KNOB_PARAMS) {
      if (isRandomizable(def) && !locks[def.id]) targets[def.id] = randomValue(def)
    }
    tweenTo(targets, 700)
  },

  mutate: () => {
    pushHistory()
    const { locks, values } = get()
    const targets: Record<string, number> = {}
    for (const def of KNOB_PARAMS) {
      if (isRandomizable(def) && !locks[def.id]) targets[def.id] = mutateValue(def, values[def.id] ?? def.def)
    }
    tweenTo(targets, 260)
  },

  undo: () => {
    const history = get().history
    const last = history[history.length - 1]
    if (!last) return
    set({ history: history.slice(0, -1) })
    moveTo(last, 450)
  },

  recall: (state) => {
    pushHistory()
    moveTo(state, 450)
  },
}))

if (import.meta.env.DEV) {
  ;(window as unknown as { __params: typeof useParamStore }).__params = useParamStore
}
