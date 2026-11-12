---
paths:
  - "src/audio/sources/**"
---

# Adding a sound source

Adding a source means **one new class and one registry entry**. Nothing else changes: the source selector, the knobs, randomize, snapshots and engine routing are all generated from the registry.

Current sources in `SOURCE_REGISTRY`: oscillator (default on), noise (off), wanderer (off), exciter / kick (one-shot, fired by KICK), file (a user-loaded sound, looped).

1. Create `src/audio/sources/MySource.ts`:
   - `class MySource extends BaseSource` (see `BaseSource.ts`). Create nodes in the constructor, connect them into `this.level`, implement `start()`, `stop()`, `setParam(key, value)`, and optionally `trigger()`.
   - Export a `mySourceDef: SourceDef` with `id`, `label`, `defaultEnabled`, `params` (a list of `ParamDef`s whose ids are prefixed `"<id>."`) and `create(ctx)`.
2. Add `mySourceDef` to `SOURCE_REGISTRY` in `src/audio/sources/index.ts`.

Rules:

- Source output goes through `BaseSource.level`, then the `gate`. Never connect past the source's `output`.
- Use `smooth()` for every `AudioParam` change.
- Nothing in the source may bypass the safety chain. The source feeds the loop input and the dry path only.
- A **microphone** source (later version) must come with an explicit feedback-safety warning in its UI, since it can loop acoustically through the speakers.
- **File source** (`FileSource.ts`, `file: true` on its def): `AudioEngine.loadFile` decodes with an `OfflineAudioContext`, peak-normalizes, keeps the `AudioBuffer` (so loading works before START) and hands it to `Source.loadBuffer`. The source loops it with an `AudioBufferSourceNode`; a buffer or direction change swaps in a new node behind a short crossfade. Max 2 minutes. The buffer is lost on reload.
- A source with `file: true` gets a load button and drop target in its card automatically. Do not hand-build upload UI elsewhere.
- Do not add microphone UI until that version is requested.
