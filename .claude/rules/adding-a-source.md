---
paths:
  - "src/audio/sources/**"
---

# Adding a sound source

Adding a source means **one new class and one registry entry**. Nothing else changes: the source selector, the knobs, randomize, snapshots and engine routing are all generated from the registry.

Current sources in `SOURCE_REGISTRY`: oscillator (default on), noise (off), wanderer (off), exciter / kick (one-shot, fired by KICK).

1. Create `src/audio/sources/MySource.ts`:
   - `class MySource extends BaseSource` (see `BaseSource.ts`). Create nodes in the constructor, connect them into `this.level`, implement `start()`, `stop()`, `setParam(key, value)`, and optionally `trigger()`.
   - Export a `mySourceDef: SourceDef` with `id`, `label`, `defaultEnabled`, `params` (a list of `ParamDef`s whose ids are prefixed `"<id>."`) and `create(ctx)`.
2. Add `mySourceDef` to `SOURCE_REGISTRY` in `src/audio/sources/index.ts`.

Rules:

- Source output goes through `BaseSource.level`, then the `gate`. Never connect past the source's `output`.
- Use `smooth()` for every `AudioParam` change.
- Nothing in the source may bypass the safety chain. The source feeds the loop input and the dry path only.
- A **microphone** source (later version) must come with an explicit feedback-safety warning in its UI, since it can loop acoustically through the speakers. A **file player** must decode into an `AudioBuffer` and loop it with an `AudioBufferSourceNode`.
- Do not add upload or microphone UI until that version is requested.
