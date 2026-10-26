# FEEDBACKYARD: Plan

A web app for playing with internal audio feedback loops: unstable, noisy, unpredictable sounds you steer with a few knobs, record, and reuse as raw material. It does not need to be musical.

Status: **awaiting approval**. After approval the order is: rule files, scaffold, implementation, browser verification, polish.

---

## 1. Stack

- Vite, React 18, TypeScript (strict), Tailwind CSS 3, Zustand
- Web Audio API and AudioWorklet. No audio libraries.
- No other runtime dependencies. WAV export is hand-written.
- Fonts self-hosted via `@fontsource`: a wide display face (Michroma or Syncopate, decided in the browser against the references) and JetBrains Mono
- ESLint (typescript-eslint, react-hooks) so that `npm run lint` passes
- Target: desktop Chromium

## 2. Project layout

```
public/worklets/        plain-JS AudioWorklet files
src/audio/              AudioEngine singleton + one class per DSP stage
src/store/              Zustand stores
src/hooks/              useParam, useRaf, useKnobInteraction, ...
src/components/ui/      Knob, Button, Panel, Meter, RingGauge, decorations
src/components/stages/  SourcePanel, LoopPanel, ModPanel, FxPanel, OutputPanel, RecordPanel
src/components/layout/  AppFrame, Header, Connectors, ThemeSwitch
src/utils/dsp-math.ts   param ranges, mapping curves, random/mutate helpers
.cursor/rules/          project context rules
```

## 3. Audio architecture

### Signal flow

```
sources -> input gain -> [ DelayNode -> pitch shifter -> filter -> saturator(tanh)
                           -> DC blocker -> FX (diffusion/reverb) -> feedback gain ]
                           ^                                                      |
                           +------------------------------------------------------+
loop tap -> dry/wet -> master gain -> compressor/limiter -> safety clipper -> analyser -> destination
                                                                         \-> recorder worklet
```

The `DelayNode` in the loop is what makes the cycle legal in Web Audio. The minimum delay is 128 samples (one render quantum), so the very short end of the range is comb-filter and resonance territory.

### Classes (`src/audio/`)

| Class | Responsibility |
|---|---|
| `AudioEngine` | Singleton. Owns the `AudioContext`, builds the graph, loads the worklets, and exposes `start`, `stop`, `kick`, `panic`, `setParam`. Every parameter change goes through `setTargetAtTime`. |
| `SourceStage` | Holds active sources, which can be combined. Has a `Source` interface (`connect`, `start`, `stop`, `setParam`, `dispose`) and a registry that maps id to class. |
| `OscillatorSource` | Sine, square, saw, triangle, with a frequency control |
| `NoiseSource` | White, pink and brown noise, from a generated looping buffer |
| `WanderingOscSource` | Oscillator whose frequency follows a random walk or noise |
| `ExciterSource` | Noise burst or click, triggered by KICK |
| `LoopStage` | Input gain, delay, pitch, filter, saturator, DC blocker, feedback gain |
| `ModStage` | LFO on delay time and filter (depth, rate), plus the chaos/drift engine |
| `FxStage` | Reverb or diffusion (allpass chain or generated-IR convolver) |
| `OutputStage` | Dry/wet, master gain, limiter, safety clip, analyser, tap for the recorder |
| `Recorder` | Captures the master via a recorder worklet and produces PCM takes |

### Adding a source later

A future file player or microphone input means one new class that implements `Source` and one entry in the source registry. The source selector reads from the registry. No upload or microphone UI is built now, not even a disabled placeholder.

### Worklets (`public/worklets/`)

- `saturator.js`: tanh soft clip with a drive parameter
- `dc-blocker.js`: one-pole high-pass
- `safety-clip.js`: final hard clip at about -1 dBFS
- `pitch-shifter.js`: granular shifter with two overlapping windowed grains
- `recorder.js`: PCM capture, posts blocks to the main thread
- Every processor checks for NaN or Infinity, outputs silence and posts a message to the engine. The engine then clears the loop by rebuilding the delay node and fading back in.

### Controls and ranges

| Section | Parameters |
|---|---|
| SOURCE | Source selection (multi), oscillator type, frequency, noise type, levels, KICK |
| LOOP | Feedback (up to about 1.15, tamed by saturation), delay time (about 1 ms to 4 s, smoothed), filter cutoff and resonance, drive, pitch/detune |
| MOD / CHAOS | LFO depth and rate (on delay time and filter), chaos/drift amount |
| FX | Reverb/diffusion amount |
| OUTPUT | Dry/wet, master level (conservative default) |

### Randomness

- **RANDOMIZE:** picks random values within per-parameter safe bounds and glides the knobs there, with the knobs visibly moving.
- **Lock toggle per knob:** locked knobs are skipped by randomize, mutate and chaos.
- **Chaos/drift knob:** smoothed random walks nudge unlocked parameters over time.
- **MUTATE:** small random nudges around the current state.
- **History:** undo of the last few states.
- **Snapshots:** save and recall a few slots in localStorage.

### Safety

- Limiter or compressor, then a safety clipper, before the destination
- DC blocker and a tanh saturator inside the loop
- Conservative default master level, `setTargetAtTime` on every change
- NaN/Infinity watchdog in every worklet, with automatic recovery
- Visible output meter and clip indicator
- PANIC: instantly cuts feedback, fades out and clears the delay lines
- First-use warning that feedback can be loud
- Audio starts only after a click

### Recording and export

- REC records the master with a timer and level meter. Stopping the recording does not stop the loop.
- Each take gets playback and a WAV download. WAV imports directly into Ableton and any other DAW, so no conversion is needed and there are no dependencies.
- The WAV is written by hand (RIFF header plus PCM) from the samples captured by the recorder worklet, at the AudioContext's native sample rate.
- The format is fixed at 24-bit PCM, with no selector. The master is limited and clipped below 0 dBFS, so float headroom isn't needed, and 24-bit is the standard DAW format. The file is built on demand from the stored float samples.
- Multiple takes per session, each downloadable. Files are named by timestamp and take number.

## 4. State (`src/store/`)

- `useParamStore`: value and lock per parameter, randomize, mutate, history
- `useEngineStore`: running, panic, clip, status
- `useTakesStore`: takes, recording state
- `useSnapshotStore`: slots, persisted to localStorage
- `useThemeStore`: accent palette (green by default), persisted
- Randomize, mutate and the history logic are pure functions in `src/utils/dsp-math.ts`.

## 5. UI direction

Retro-futuristic sci-fi HUD built with modern precision. Derived from the five reference screenshots.

### What the references give us

| Reference | What we use |
|---|---|
| Green "Retro Futuristic" sheet | The overall frame: stepped chamfered outline, circuit-style connector lines with dot terminals, barcode strip, hatch blocks, chevron row, trio of filled squares, line chart, wireframe globe. Type pairing of a bold small line with a thin extended large line. |
| Red/green reticle scene | Only the reticle: a ring with ticks, a dashed X and a red marker. Used for PANIC and danger states. The landscape art is not used. |
| Multi-color icon sheet | Chamfered "data panel" frames, bracket frames, corner ticks, segmented volume bar. The only place where glow is used, so glow stays on active elements only. |
| Cyan ring and bar sheet | Segmented ring variants (knob ring and loop-energy gauge), pill bars with chevrons, segmented vertical meters with hatch fills, waveform bar strip, line chart, dot grid |
| Cyan flat-fill sheet | Trapezoid notched panels, chevron rows, barcode strips, dot rows, asterisk and sparkle icons, spiral "fan" icon. Flat solid fills instead of glow. |

### Visual system

- **Color:** near-black background. One primary accent per theme and one warning color (orange-red) used only for clip, PANIC, REC and danger. A restrained secondary tint for non-critical data. Themes: phosphor green (default), cyan, amber-red. All colors are CSS variables mapped to Tailwind tokens, so the palette can be changed in one place.
- **Line work:** 1 px hairlines everywhere. Flat fills for emphasis. Glow only on active elements.
- **Grid:** all spacing and sizes on one base unit (4 px).
- **Typography:** wide display face for titles and big labels. Monospace for values, labels and readouts. Uppercase with generous tracking. No tiny text, with a minimum of about 11 px for secondary labels.
- **Panels:** chamfered or notched corners, bracket frames, corner ticks, connector lines with dot terminals between sections.
- **Decoration:** hatch blocks, chevron rows, barcode strips, dot rows. Used as structure and accents, not as wallpaper.

### Layout

A single-screen instrument with the sections SOURCE, LOOP, MOD / CHAOS, FX, OUTPUT and RECORD / TAKES. START/STOP, KICK, PANIC, RANDOMIZE and REC are large and unmistakable. The scope and spectrum sit in the centre or the top band, with the output meter and clip indicator next to OUTPUT.

### Knob

Custom SVG rotary: a segmented ring around a thin-outlined dial, with the value arc as the bold part and a mono numeric readout. Interactions: drag, wheel, arrow keys (shift for coarse), double-click to reset, visible focus state, lock toggle. Clarity beats decoration.

### Animation

- Oscilloscope trace, spectrum and segmented level meters, driven by the output signal
- A ring gauge reflecting feedback amount or loop energy
- Soft glow when a knob is turned or the loop is running
- The spiral fan icon turns slowly only while the loop runs
- Everything is idle and nearly static when the loop is stopped
- No scanlines, CRT distortion, random flicker or moving background
- Respects `prefers-reduced-motion`
- All meter and visual animation runs through refs and `requestAnimationFrame` (canvas or SVG), never React state

## 6. Cursor rules (`.cursor/rules/`)

Short, focused files:

1. `project-context.mdc`: what the app is, stack, layout and conventions (always applied)
2. `audio-safety.mdc`: DSP conventions: `setTargetAtTime` everywhere, safety chain, worklet NaN guard, no real audio at full volume while testing
3. `ui-design-system.mdc`: tokens, strokes, grid, type, glow and motion rules, `prefers-reduced-motion`
4. `adding-a-source.mdc`: how to add a new source class and registry entry

## 7. Verification

- `npm run build` (tsc and vite) and `npm run lint` pass
- In the browser, with the master level kept low:
  - start the loop and check the meters and visuals respond
  - test every knob, locks, RANDOMIZE, MUTATE and undo, snapshots, chaos
  - PANIC, then a recording with a WAV download (check the 24-bit header, size and duration, and that the samples round-trip)
  - theme switch and `prefers-reduced-motion`
- Screenshots compared against the reference images, then refinement
- Final summary: what works, what could not be tested (mainly how it sounds, and anything that needs ears), known limits

## 8. Known risks

- Granular pitch shifting inside a feedback loop can produce artifacts. In this app that is acceptable and often wanted, but the gain around the loop is bounded by the saturator and limiter.
- Delay times below 128 samples are not possible with the `DelayNode`, which is the lower bound of the comb-filter range.
- Whether it sounds good cannot be verified here. Only signal behavior can be checked, such as level, NaNs and spectrum.
- Long takes are held in memory as float samples (about 10 MB per minute of stereo at 44.1 kHz). The take length is capped (for example 10 minutes) with a visible warning near the cap.
