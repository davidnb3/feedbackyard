import type { ParamDef } from './types'

/**
 * Every non-source parameter. This is the single source of truth for ranges, curves, safe
 * randomize bounds and chaos amounts. The UI, the store and the engine all derive from here.
 */
export const CORE_PARAMS: readonly ParamDef[] = [
  // LOOP
  {
    kind: 'knob', id: 'feedback', label: 'Feedback', group: 'loop',
    min: 0, max: 1.2, def: 0.78, curve: 'lin', fmt: 'pct', rand: [0.35, 1.04], chaos: 0.22, danger: 1,
  },
  {
    kind: 'knob', id: 'delayTime', label: 'Delay', group: 'loop',
    min: 0.003, max: 4, def: 0.22, curve: 'exp', fmt: 'time', rand: [0.004, 1.4], chaos: 0.35,
  },
  {
    kind: 'knob', id: 'cutoff', label: 'Cutoff', group: 'loop',
    min: 40, max: 16000, def: 1800, curve: 'exp', fmt: 'hz', rand: [140, 9000], chaos: 0.5,
  },
  {
    kind: 'knob', id: 'resonance', label: 'Reso', group: 'loop',
    min: 0, max: 1, def: 0.35, curve: 'lin', fmt: 'pct', rand: [0.05, 0.85], chaos: 0.4,
  },
  {
    kind: 'knob', id: 'drive', label: 'Drive', group: 'loop',
    min: 0.5, max: 10, def: 1.5, curve: 'exp', fmt: 'ratio', rand: [0.8, 5], chaos: 0.3,
  },
  {
    kind: 'knob', id: 'pitch', label: 'Pitch', group: 'loop',
    min: -12, max: 12, def: 0, curve: 'lin', fmt: 'st', rand: [-5, 5], chaos: 0.3, bipolar: true,
  },
  { kind: 'choice', id: 'filterType', label: 'Filter', group: 'loop', options: ['LP', 'BP', 'HP'], def: 0 },

  // MOD / CHAOS
  {
    kind: 'knob', id: 'lfoRate', label: 'LFO rate', group: 'mod',
    min: 0.05, max: 20, def: 0.35, curve: 'exp', fmt: 'hz', rand: [0.1, 8], chaos: 0.4,
  },
  {
    kind: 'knob', id: 'lfoDelay', label: 'LFO>delay', group: 'mod',
    min: 0, max: 1, def: 0.12, curve: 'lin', fmt: 'pct', rand: [0, 0.6], chaos: 0.3,
  },
  {
    kind: 'knob', id: 'lfoFilter', label: 'LFO>filter', group: 'mod',
    min: 0, max: 1, def: 0.1, curve: 'lin', fmt: 'pct', rand: [0, 0.7], chaos: 0.3,
  },
  {
    kind: 'knob', id: 'chaos', label: 'Chaos', group: 'mod',
    min: 0, max: 1, def: 0, curve: 'lin', fmt: 'pct', randomize: false,
  },
  {
    kind: 'knob', id: 'drift', label: 'Drift rate', group: 'mod',
    min: 0.02, max: 2, def: 0.25, curve: 'exp', fmt: 'hz', randomize: false,
  },

  // FX
  {
    kind: 'knob', id: 'reverbMix', label: 'Reverb', group: 'fx',
    min: 0, max: 1, def: 0, curve: 'lin', fmt: 'pct', rand: [0, 0.6], chaos: 0.3,
  },
  {
    kind: 'knob', id: 'reverbSize', label: 'Size', group: 'fx',
    min: 0, max: 1, def: 0.55, curve: 'lin', fmt: 'pct', rand: [0.2, 0.95],
  },
  {
    kind: 'knob', id: 'reverbDamp', label: 'Damp', group: 'fx',
    min: 0, max: 1, def: 0.45, curve: 'lin', fmt: 'pct', rand: [0.1, 0.9],
  },

  // OUTPUT
  {
    kind: 'knob', id: 'mix', label: 'Dry/Wet', group: 'output',
    min: 0, max: 1, def: 0.9, curve: 'lin', fmt: 'pct', rand: [0.6, 1],
  },
  {
    kind: 'knob', id: 'master', label: 'Master', group: 'output',
    min: -60, max: 0, def: -14, curve: 'lin', fmt: 'db', randomize: false,
  },
]
