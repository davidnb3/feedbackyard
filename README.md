# FEEDBACKYARD

A browser instrument for **internal audio feedback loops**.

You know the trick: send a return track into itself and let it howl. FEEDBACKYARD is that, as a small sci-fi control panel. You steer the loop with knobs, record what comes out, and download the takes as WAV files to chop up in your DAW.

> **Heads up:** feedback can get loud, fast. Start with the master low and use PANIC (or `Esc`) if things run away.

## Why

- Feedback loops make sounds you can't design on purpose: screeches, drones, metallic ringing, collapsing noise.
- It is not a music tool. It is a **raw material generator** for sound design.
- Everything is a knob, so you steer instead of program. Randomness and chaos do the rest.
- It runs in a browser tab. No installs, no plugins, no audio libraries.

## What it does

1. A **source** (oscillator, noise, wanderer, or a one-shot kick) feeds the loop.
2. The loop runs **delay, pitch shift, filter, saturation and reverb**, then feeds itself back.
3. A tap of the loop goes to the output, through a limiter and a safety clipper.
4. You **record** the output and download each take as a 24-bit stereo WAV.

```
sources -> input -> [ delay -> pitch -> filter -> saturator -> DC blocker -> reverb -> feedback ] -+
                        ^                                                                          |
                        +--------------------------------------------------------------------------+
loop tap -> dry/wet -> master -> panic -> limiter -> safety clip -> scope / meters / recorder / speakers
```

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL in a desktop Chromium browser (Chrome, Edge, Brave).

1. Accept the first-use warning.
2. Turn the **Master** knob down first if you are on headphones.
3. Press **START**, then **KICK** to excite the loop.
4. Move knobs, hit **RANDOMIZE**, press **REC** when it gets interesting.

```bash
npm run build   # type-check + production build
npm run lint
```

## The transport bar

| Control | What it does |
| --- | --- |
| **START / STOP** | Starts or stops the audio engine. |
| **KICK** | Fires a one-shot burst or click into the loop. |
| **PANIC** | Cuts feedback, fades out, clears the loop and stops. `Esc` does the same. |
| **RANDOMIZE** | Glides all unlocked knobs to new values inside safe ranges. |
| **MUTATE** | Nudges unlocked knobs a little from where they are. |
| **UNDO** | Goes back one step in the history (last 10). |
| **REC** | Records the output. Stopping the recording does not stop the loop. |

## The knobs, region by region

**Using knobs:** drag up or down, mouse wheel, or arrow keys. Hold `Shift` while dragging for fine control. Double-click resets to default. The small lock icon on each knob keeps it out of RANDOMIZE and MUTATE.

### 01 Source

Each source has an on/off switch. Mix and match.

**Oscillator**
- **Wave**: sine, square, saw or triangle.
- **Freq**: pitch of the oscillator, 20 Hz to 4 kHz.
- **Level**: how much goes into the loop.

**Noise**
- **Color**: white (bright), pink (balanced) or brown (dark and rumbly).
- **Level**: how much goes into the loop.

**Wanderer**
- **Center**: the pitch it wanders around.
- **Spread**: how far it wanders, in octaves.
- **Level**: how much goes into the loop.

**Exciter** (fires on KICK)
- **Shape**: a noisy burst or a sharp click.
- **Level**: strength of the kick.

### 02 Loop

The heart of the instrument. The ring gauge shows how much energy the loop is feeding back. The `COMB` readout shows the comb-filter pitch set by the delay time.

- **Filter**: low-pass, band-pass or high-pass.
- **Feedback**: how much comes back around. Past 100% the loop grows until saturation catches it.
- **Delay**: loop length, 3 ms to 4 s. Short is pitched and metallic, long is echoey. Sweeping it bends pitch.
- **Drive**: tanh saturation. Adds grit and keeps the loop from blowing up.
- **Cutoff**: filter frequency, 40 Hz to 16 kHz. Every pass gets filtered again, so small moves are big.
- **Reso**: filter resonance. High values make the loop sing at the cutoff.
- **Pitch**: pitch shift on every pass, plus or minus 12 semitones. Repeats climb or fall in pitch.

### 03 Mod / Chaos

- **LFO rate**: speed of the LFO, 0.05 to 20 Hz.
- **LFO>delay**: how much the LFO wobbles the delay time (pitch warble).
- **LFO>filter**: how much the LFO sweeps the filter cutoff.
- **Chaos**: how far the main knobs randomly drift on their own. At zero they sit still. Small ghost markers on the knobs show where they really are.
- **Drift rate**: how fast that drifting happens.

### 04 FX

- **Reverb**: amount of reverb inside the loop. It smears and thickens each pass.
- **Size**: reverb room size.
- **Damp**: how fast the reverb loses high frequencies.

### 05 Scope / Spectrum

Display only. The top view is the waveform, the bottom view is the spectrum. Use it to see what the loop is doing.

### 06 Output

- **Dry/Wet**: blend between the raw source (dry) and the loop (wet).
- **Master**: output level, -60 to 0 dB. Default is a safe -14 dB.
- **Meter, LIMIT, CLIP**: stereo level, limiter activity and clipping warnings.

### 07 Record / Takes

- **REC** records what you hear, up to 10 minutes per take.
- Each take gets a waveform, **PLAY**, **WAV** (download) and **x** (delete).
- Files are 24-bit stereo PCM WAV, ready to drag into Ableton or any DAW.
- Takes live in memory. Download what you want to keep before closing the tab.

### 08 Memory

- **Save**: store the current knob positions in one of 4 slots.
- **Recall**: glide back to a saved slot. Slots persist in your browser.
- **History**: how many UNDO steps are available.

## Themes

Switch between **GRN** (green), **CYN** (cyan) and **AMB** (amber) at the top right. Red-orange is always reserved for clip, panic and record.

## Safety

- A tanh saturator and a DC blocker live inside the loop, so it cannot grow forever.
- The output passes through a limiter and a safety clipper before the speakers.
- Every audio processor checks for NaN and infinity and rebuilds the loop if something breaks.
- Master defaults to -14 dB and parameter changes are smoothed to avoid clicks.
- PANIC always works.

## Known limits

- Desktop Chromium only.
- The shortest delay is about 3 ms. Browsers need at least 128 samples in a feedback cycle.
- The pitch shifter is granular, so it adds artifacts. That is part of the sound.
- Takes are kept in memory and lost on reload.
- Snapshots include the master level.

## Tech

Vite, React 18, TypeScript, Tailwind CSS 3, Zustand and the Web Audio API with AudioWorklets. No audio libraries. The WAV encoder is hand-written.

```
public/worklets/        AudioWorklet processors (plain JS)
src/audio/              AudioEngine and one class per DSP stage
src/audio/sources/      Sound sources and the source registry
src/store/              Zustand stores
src/components/         HUD UI (ui, stages, layout)
src/utils/dsp-math.ts   Param mapping, randomize, mutate
```

Every parameter is declared once as a `ParamDef` in `src/audio/core-params.ts` (or inside a source). The UI, randomize, snapshots and the engine all read from that one definition. To add a new source, add one class and one registry entry. See `PLAN.md` for the full design.
