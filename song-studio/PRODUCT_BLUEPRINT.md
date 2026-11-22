# Song Studio — Product Blueprint (owner-first)

**Status:** Architecture / implementation brief. This document describes intended features, not features already shipped.

## The product in one sentence

A beautiful, approachable browser music workstation where a person can **compose and arrange clips like in a DAW**, then ask AI to make musical parts — a 16-bar drum groove, a guitar riff, a melodic saxophone line, a vocal harmony — that fit the backing audio.

Inspired by the **workflow** of FL Studio, Suno Studio and multitrack DAWs, not a replica of their branding or interfaces.

## Our first user

The owner, working on a standard laptop/PC or mobile browser. The owner has **16 GB system RAM and 8 GB GPU VRAM** and does not want to host AI models locally. GPU inference should run in the cloud. The browser editor runs locally without cloud GPU.

Not a public SaaS yet. Avoid a public launch or monetization before costs, reliability and rights are validated.

## What exists today (do not break)

- \`song-studio/index.html\`, \`styles.css\`, \`app.js\`
- Multi-file local audio import and waveform display.
- Synchronized whole-track playback, seek, stop/pause, mute/solo, volume.
- WAV mix export using Web Audio OfflineAudioContext.
- Private preview UI for Lyria and Eleven Music, behind an owner key, Turnstile and cost confirmation.
- \`cloudflare-worker\` also powers the unrelated FLUX image generator.
- No actual ACE-Step generation backend or deployed Modal code exists yet.

## Information architecture

### Studio shell
- Left: project browser, sound and AI generation sidebar, track/instrument options.
- Center: scrollable beat/bar ruler, clips on tracks, selection and editing tools.
- Bottom: transport (play, stop, record later), BPM, time signature, zoom, snap settings.
- Right or collapsible bottom drawer: inspector for selected clip, gain, fades, model settings, variations.
- On phones: responsive stacked panels and touch-safe gestures. Full keyboard-heavy editing is desktop-first, but mobile listening, launching generations and basic clip moves must work.

### Primary workflows
A. **Start a blank project** → set 120 BPM, 4/4, choose key → import audio → drag into a track → arrange, loop, mix → download WAV and save project.
B. **Start from a full AI song** (after provider validation) → add result as an audio clip → extract stems if supported/quality acceptable → edit.
C. **Create backing foundation** (audio, not MIDI) → select 8-16 bar region → ask AI for \`guitar\`, \`drums\`, \`bass\`, \`synth\`, \`keyboard\`, \`brass\` or \`woodwinds\` → audition 2–3 takes → accept a take to a separate track.
D. **Variation** → select a clip/region → create a new take with the same style and musical context → compare without overwriting the original.
E. **Export** → mix WAV, and eventually separate stems, project archive, MIDI where independently generated.

### Musical timing and loops (non-negotiable)
- Canonical timeline uses **960 ticks per quarter note (PPQ)**.
- Project tempo in quarter-note BPM. 120 BPM, 4/4 ⇒ 2 sec/bar; eight bars ⇒ 16 sec. For compound meters, explicitly clarify quarter-note BPM vs dotted-quarter musical feel.
- Every clip has \`startTick\`, \`lengthTicks\`, source audio asset ID, \`sourceOffsetSeconds\`, loop toggle, and per-clip gain.
- Snap choices include bar, 1/2 bar, 1/4 bar, 1/8 note, 1/16 note and off.
- Editing events must be deterministic; handle undo/redo. No drift from repeated float-second calculations.
- Changing project BPM shifts clip playback positions in seconds. **It does not time-stretch imported audio automatically**. Future stretching needs a dedicated algorithm and must be indicated clearly.
- Looping source audio does not make it magically seamless. Add auditionable loop points, gentle crossfades and source alignment validation. Judge whether beats match by listening, not by model claims.
- When importing audio without known tempo, ask the user to set/confirm source tempo; do not assume it matches project tempo.

### Track editing
- Unlimited local clip moves within practical browser memory limits; target 16–32 tracks initially, not unlimited untested claims.
- Add, rename, reorder tracks; mute, solo, volume, pan; color-code without depending on color alone.
- Add, move, duplicate, split, trim, loop and delete clips.
- Zoom / pan timeline, horizontal scrolling and playhead scrubbing.
- The waveform visualizes **actual decoded samples**, not decorative synthetic bars.
- Source files are processed locally until AI inference is explicitly requested.
- Audio transport must avoid scheduling duplicate sources or leaking AudioNodes when seeking/pausing/removing clips.
- Export must respect actual clip positions, loops, mutes, solos, gain, pan and time boundaries.

### Project persistence
- Save a versioned project JSON with settings, tracks, clips and audio asset references.
- Because a JSON file cannot contain the original MP3/WAV bytes, MVP either:
  - offer an explicit **project bundle** with audio assets, or
  - clearly disclose that JSON-only sessions require re-importing source audio.
- Do not claim that uploading a project JSON saves the actual audio if it does not.
- Long-term: private authenticated cloud projects, object storage, quota, deletion, access control.
- Draft \`core/arrangement.mjs\` is a dependency-free domain primitive with tests; it is not wired to the UI yet.

## AI generation: after a quality gate, not before
- Preferred candidate: ACE-Step 1.5 **Base** family with LEGO, Extract, Complete and Repaint support.
- XL Base is a quality candidate, not a guarantee; smaller Base may be quicker/cheaper. Validate both.
- Text-to-music, LEGO and Extract are different tasks: don't advertise text-only isolated guitar as if LEGO did it without a backing track.
- Official LEGO input requires **source audio**, **instruction specifying instrument family**, and **caption describing what to play**.
- Saxophone is a **brass or woodwinds** family prompt, not a dedicated saxophone category.
- The model returns audio, not editable MIDI note events. Piano-roll/MIDI creation needs a separate instrument/MIDI pipeline.
- Lyrics/vocals and high-quality multi-instrument separation are distinct features with independent tests.
- Start with a separate *private* GPU adapter and one **single request at a time**. Model may have cold starts; implement jobs with queued/running/completed/failed states and meaningful errors.
- Model weights and user recordings must never be stored in GitHub.

## Technical architecture

\`\`\`text
Browser (Song Studio)
  |
  +- Local audio engine + timeline UI (Web Audio API)
  +- Versioned project document (ticks, clips, tracks, audio assets)
  +- Browser-local save/export for MVP
  |
  +--> Cloudflare Worker (private authenticated API / spend checks)
         |
         +--> Modal job adapter (ACE-Step base model on cloud GPU)
                |
                +--> Job status + result audio
         |
         +--> Object storage for source/result audio (future, private)
\`\`\`

- No Modal token, model service auth credential or payment key in the browser.
- Existing Cloudflare Worker serves FLUX; don't disrupt it or expose its private music routes.
- If using direct browser-to-Modal uploads later, only short-lived, scoped URLs with auth and size caps; never publish an unauthenticated paid GPU endpoint.
- Keep heavy model startup and model checkpoints warm only when justified; idle workers should scale to zero where possible.
- Separate preview/test service from public monetized service.
- Integrate with Cloudflare authentication only when we have an account/permission model, not just a shared owner password for many public users.

## Design direction

- Distinctive dark graphite base with restrained lavender and muted pink accents; elegant, not neon purple everywhere.
- Useful information density like a real DAW, but understandable labels and clean progressive disclosure.
- Meaningful waveform clips, timeline ruler, readable controls and high contrast.
- Large desktop editor with minimal phone UI; touch targets at least ~44px.
- No fake waveform outputs, fake AI sample results, fake customer testimonials or decorative inactive controls.
- Explicit loading, progress, cancellation (when supported), and retry states.

## Phased build; completion gates

### M1: Offline DAW foundation — $0 GPU usage
- Real arrangement UI wired to tick-based document.
- Track/clip CRUD; move/trim/split/loop/duplicate; snap and ruler.
- Local import, playback (offset-aware), mute/solo, volume/pan, seek.
- WAV export matches the audible arrangement.
- Save/load with clear local audio persistence semantics.
- Unit tests (core) and manual playback QA.
- Preserve existing Creator Lab and image generation.

### M2: Private ACE-Step GPU benchmark
- Only after owner verifies a Modal Starter allowance, billing controls, and gives explicit consent.
- Containerized pinned model, one worker max, scale-to-zero, startup/timeout controls, per-request usage metrics.
- First generate a plain 16-second instrumental with the base model; validate decoded audio.
- LEGO test in 4/4 120 BPM with matching 8-bar backing (16 sec): guitar, drums, bass, brass/woodwinds prompts.
- Compare XL Base with smaller Base if GPU/budget requires; record VRAM, cold/warm latency and per-request compute.
- No public access or recurring background runs.

### M3: AI arrange UX
- Select a region → choose instrument → submit audio context → inspect real takes → audition → accept/reject.
- Label AI limitations, async job states, data upload consent, model origin and estimated cost.
- Conservative regional length limits, and cancel/retry support if provider permits.

### M4: More musical production
- Fade envelopes, crossfades, effect rack (EQ/reverb/compressor), buses, automation lanes, drum-machine step sequencer.
- MIDI piano roll only after building an actual MIDI note engine; it must not be a fake representation of audio.

### M5: Public beta / monetization
- Demand validation first; then proper auth, usage credits, paid plans, project storage, per-user quotas, abuse/rate controls and clear policy/rights disclosures.
- Owner account can bypass *app* quota but **cannot bypass GPU costs**. Global spend cap always wins.

## Definition of "ready to hand to Codex"

- The chosen first milestone and acceptance tests are explicit (see CODEX_HANDOFF.md).
- Model quality/performance risks are documented; no unearned claims.
- Existing code and deployment boundaries are known.
- A pure testable arrangement domain model is checked in to \`core/\`.
- Owner has not been asked to buy cloud infrastructure to perform M1.
