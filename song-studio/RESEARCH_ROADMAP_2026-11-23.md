# The Digital Works — Song Studio 2.0 Research Decision & Build Roadmap
Research date: **2026-11-23** (public sources verified on this date)
Status: **A product plan, NOT a completed build. No GPU calls, paid APIs or cloud deployments were made to produce this document.**

## Quick decision for the owner

**Build the browser music studio, but make dependable MIDI+sample sequencing its musical foundation.** AI is modular, optional, and must earn inclusion through real listening and context-following tests.

This means we can already build and test a fun, useful multitrack editor without GPU credits. We should **not** spend Modal's $30 monthly compute allowance on a large ACE-Step deployment until the most important layer-generation workflow passes a tiny controlled benchmark.

Why: the owner tried Scenario's ACE-Step Edit Add Layer and disliked a horn/sax-type result. Reports on ACE-Step's official GitHub include substantial remaining quality and timing problems in LEGO, even after a March 2026 fix to source-audio conditioning.

## Owner's actual desired experience

- Start with a melody, chord progression or imported musical sketch.
- Choose a key, BPM, time signature and song sections.
- Generate several alternative *matching* drums, basslines, synths, piano, guitar and sax parts (later vocals).
- Each part is a separate editable track. Accept/reject an idea without overwriting the existing song.
- Repeat 4/8/16-bar loops, vary a chorus, add fills, reposition clips, use effects, edit MIDI notes and export a finished mix.
- Hear actual musical structure, not robotically random velocity or sine-wave placeholders.
- Prefer free owner-only usage in development; one day perhaps offer limited free public generation plus paid credits, but **not now**.
- PC hardware: 16 GB RAM / 8 GB VRAM. Do not require local model inference.

## Main architecture: three kinds of tracks

### A. MIDI track (default for reliable musical compatibility)
- Tracks contain editable notes, velocities, timings, instrument patches and MIDI automation.
- A project-level chord timeline, key/scale, song structure and tempo provide a shared musical score.
- Chord-aware note generation for bass, pads, synths, piano, guitar-like parts, and drums that follow the same bar/beat grid.
- Real MIDI editor: piano roll, note drag, transpose, quantize, velocity, undo, variations, MIDI export.
- Audio comes from a separate actual sample/synth engine. **MIDI generation does not itself produce believable guitar or sax timbre**.
- Start with guided theory rules and curated patterns that are truly useful, not falsely labeled as learned AI.
- Trial **Magenta MusicVAE** models for chord-conditioned 2-bar melodies, 1-bar multi-track, 4-bar melody/bass/drum trio, and GrooVAE drum humanization. These are older models with limited phrase length/style diversity; audition before shipping. Check code and weight licenses separately.
- Research **Text2midi** (https://github.com/AMAAI-Lab/Text2midi, MIT code) as a future text-to-editable-MIDI option. Authors' own reported chord-matching results are imperfect; do not assume full-song coherence.

### B. Sampled/audio instrument track
- Load rights-cleared WAV or sampled instruments. Render by musical note events where supported.
- Good **CC0** candidates: Versilian Community Sample Library (VCSL) and VSCO 2 Community Edition, useful for orchestral, keys, woodwinds, percussion etc. Sample collections vary in size and articulation. Build selected, lazy-loaded patches rather than downloading multi-GB packs to mobile.
- For convincing sax/guitar, test multi-sampled articulations (note attacks, release, vibrato, legato), not merely repeating a one-note sample. No promise that free samples are equivalent to expensive libraries or human performance.
- Browser real-time engine can use Web Audio API + Tone.js with instrument samplers, transport and effects. Validate sample library licensing and redistribution rights for every patch.

### C. AI audio generation track (optional, only after listening tests)
- Provider interface: create-song, create-layer-with-context, generate-variation, repaint-region, separate-stems.
- Every AI request receives: current accepted mix (and stems if supported), explicit key/chords/BPM/bar range, target role/register/style, and optional *rights-cleared* timbre reference.
- Only accept returned WAV into project after live audition. Preserve original and rejected takes for undo/history.
- The model needs to demonstrably follow context. A generated stem that sounds beautiful but is rhythmically unrelated **fails**.

## Evidence-led model comparison (as of 2026-11-23)

| Candidate | Musical control / outputs | Deployable and legal today? | Recommendation |
| --- | --- | --- | --- |
| ACE-Step 1.5 **Base/XL Base** | Full audio songs, vocals, LEGO single layer with source audio, Extract, Repaint, Complete | Public MIT code/weights; self-hostable, GPU required. LEGO quality **unreliable** in Nov 2026 reports | One small capped benchmark, NOT sole engine |
| **MixAudio** (Neutune, Oct 2026 research) | Audio reference for instrument timbre + audio context for harmony; can generate missing stem(s) | Strong research evidence, but no publicly verified self-hostable checkpoint or third-party layer-generation API | High-priority watch / ask for developer access; not an MVP dependency |
| **Stemphonic** (2026) | Joint multiple synchronized stems with conditioning | Paper/demo; no verified public inference weights/rights | Research benchmark, not production path |
| **MSG-LD** | Can inpaint missing bass, drums, guitar, piano while conditioning on existing stems | Public research code/checkpoints; old dependencies, limited instrument categories, commercial weight/data audit needed | Possible benchmark after ACE-Step |
| **Diff-A-Riff** (Sony) | Context-aware separate accompaniment generation and variations | Research demo, production API/weights rights not confirmed | Quality reference, not production path |
| **StemGen** | Context-conditioned music parts | Repository mostly examples/paper; no turnkey model deployment verified | Quality reference |
| **Magenta MusicVAE** | Chord-conditioned MIDI melodies, small multi-track phrases, GrooVAE | JavaScript checkpoints published; licence and output quality to verify per model | **Local MVP experimentation** |
| **Text2midi** | Text to editable MIDI multi-instrument compositions | GitHub MIT code, downloadable model; additional weights/checkpoint licensing to verify | Later, not required for first editor |
| **Demucs** | Separate an existing finished recording into stems | Public MIT implementation with 4-stem and experimental 6-stem models; rights to user audio still required | Later import/remix feature |
| **JASCO / MusicGen weights** | Music generation with chord/drum/melody conditioning | CC-BY-NC-4.0 weights | Exclude from commercial shipping without a separate licence |
| **Moises Studio / NeuSynth** | Commercial examples of context-aware instrument-stem generation | Products with their own plans/terms; no verified OEM API for this exact feature | Benchmark workflow, do not scrape their private services |
| **ACE-Step DAW upstream** | Browser DAW + claimed cumulative LEGO, MIDI piano roll and drum sequencer | WIP, **AGPL-3.0-or-later** software licence | Read as inspiration; don't copy into closed-source product without satisfying AGPL obligations |

Main references:
- ACE-Step https://github.com/ace-step/ACE-Step-1.5 ; model card https://huggingface.co/ACE-Step/acestep-v15-xl-base
- LEGO quality issue dated Nov 10, 2026 https://github.com/ace-step/ACE-Step-1.5/issues/1375
- LEGO source-latent bug (fixed Mar 11) https://github.com/ace-step/ACE-Step-1.5/pull/810
- Remaining CoT / source context issue https://github.com/ace-step/ACE-Step-1.5/issues/1286
- MixAudio research https://arxiv.org/abs/2610.09637
- Stemphonic https://arxiv.org/abs/2602.09891
- MSG-LD https://github.com/chynggi/MSG-LD-Pytorch2
- Sony Diff-A-Riff https://csl.sony.fr/news/diff-a-riff/
- Magenta.js https://magenta.github.io/magenta-js/music/
- Magenta MusicVAE checkpoints https://github.com/magenta/magenta-js/blob/master/music/checkpoints/README.md
- Tone.js https://tonejs.github.io/
- VCSL CC0 https://versilian-studios.com/vcsl/
- VSCO CE CC0 https://versilian-studios.com/vsco-community/
- Demucs https://github.com/facebookresearch/demucs
- ACE-Step DAW licence https://github.com/ace-step/ACE-Step-DAW/blob/main/LICENSE

## Why the MIDI and audio hybrid solves the central risk

Audio layer generation is probabilistic, so the next saxophone stem could be off-key or a jumbled instrument even with source context. MIDI composition can be **hard-constrained**:
- All parts use the same chord changes by bar and common project tempo.
- Bass notes can use chord tones, melodic passing tones and bass-register limits.
- Synth/piano melodies can be checked against current chord/scale and voice-leading constraints, while preserving deliberate tension.
- Drum patterns share exact beat placement; fills and rhythmic variations are generated without replacing a locked melody.
- Quantized MIDI is editable; samples and effects create the actual recorded sound.
- Natural-sounding performances require expressive phrasing and a good renderer. Simple velocity randomization is **not** adequate. Don't claim naturalness until auditioned.

The system must not claim it can automatically extract reliable MIDI from a complex polyphonic mix. A future feature may try Spotify Basic Pitch on *isolated monophonic* audio first.

## Product stages and acceptance criteria

### P0 — Freeze the existing foundations and review existing DAWs (zero GPU)
- Preserve the existing GitHub Pages portfolio, image generator and deployed Cloudflare Worker.
- Work on a feature branch; no direct release.
- Run existing \`song-studio/core/arrangement.test.mjs\` tests.
- Study ACE-Step DAW's architecture (React + Tone.js) but do not paste AGPL code into a potentially closed-source project.
- Determine whether building on existing \`song-studio/\` or an isolated rewrite in \`song-studio-v2/\` gives safer progress. No big-bang rewrite.
**Gate:** tests pass, existing site unaffected, no cloud spending.

### P1 — Real offline DAW (no AI hosting required)
- Responsive dark/lilac arrangement canvas with beat/bar ruler and zoom.
- Track creation, mute/solo/pan/gain, synchronized transport, project BPM and time signature.
- Import WAV/MP3, waveform based on actual samples, drag/split/trim/loop/duplicate/undo clips.
- WAV export exactly reflects audible arrangement; save/reopen or clearly relink assets.
- Real playable MIDI tracks: 16-step drum sequencer and piano roll; MIDI-to-audio through Tone.js/sampler.
- Use 960 ticks per quarter as canonical timeline representation, no accumulated timing drift.
**Gate:** import a melody, add 8 bars of drums/bass/piano, loop only the drums, alter bass notes, play all together and export a synchronized mix, with no model API calls.

### P2 — Smart musical context and local variations (no paid GPU)
- Song metadata: key/mode, BPM, time signature, section labels, chord changes per bar, track roles, constraints.
- Chord progression editor, optional key suggestions, musical grid for 4/8/16 bars.
- Pattern browser for bass/drums/chords, instrument samples with checked redistribution licences.
- First chord-aware generator: make two bassline candidates and two drum grooves around a melody/chord progression, with predictable locked harmony. Add MIDI variations, transpose, voice-leading, velocities/articulations, groove templates.
- Benchmark Magenta MusicVAE and GrooVAE locally as optional additional variation engines.
- User can keep a good section while regenerating just another 4- or 8-bar section.
**Gate:** 3 short arrangements that stay on beat and survive save/reopen; musical usefulness judged by human listening, not appearance.

### P3 — Controlled AI audio benchmark (optional, spend approved per experiment)
**Do NOT start this phase just because the previous phase is coded.**
- Verify Modal Starter's $30/mo compute allowance **in user's account**, plus monthly budget/cap behavior; no public GPU endpoint.
- Start with a 24GB/48GB suitable GPU after VRAM verification, max 1 container, concurrency 1, min containers 0, scale to zero.
- Pin ACE-Step version **including source-context fix**; confirm LM flags do not override source audio (#1286). Validate the exact runtime invocation in logs.
- Test a **16-second, 8-bar, 120 BPM, 4/4, known-chords source** that we own; generate *guitar*, *bass*, *drums* and *woodwinds/brass sax* with 2 seeds each **only while budget permits**.
- Critical context-swap test: keep prompt/seed but change backing chord progression (e.g. Am–F–C–G to Dm–Bb–F–C). Output should change musically to fit. Compare clicks/drift to grid.
- Measure per-request latency, cold start, GPU seconds, CPU/memory, raw billed cost, and acceptance rate per take. Stop if parts repeatedly are unusable.
- Optionally benchmark MSG-LD bass/drums/piano/guitar if its dependency/rights audit clears, but **do not assume it solves sax**.
**Gate:** no marketing claims until ≥2 acceptable takes per core target from distinct seeds; instrument identity, harmonic match, timing, cleanliness and usefulness each rated at least 4/5 for a premium claim. If poor, keep MIDI production and choose another audio model later.

### P4 — Private AI creative assistant and layer workflow (only after validated model)
- Browser asks Worker for AI action; Worker checks owner auth/credits; private job goes to Modal inference adapter.
- Generate a missing part *from current accepted context* and return actual separate audio.
- Offer 2–3 preview takes; accept/reject; do not alter existing tracks if rejected.
- Maintain version history and render context mix for each generation.
- Add automatic fade/loop assistance, optional polyphonic stems, audio-reference upload rights notice.
- Optional ACE-Step full song/vocals provider remains separate. Never pretend prompt-to-full-song is same as isolated LEGO.

### P5 — Effects, polishing and advanced editing
- Reverb, delay, compressor, EQ, track sends, clip fades and reliable offline export.
- Automation lanes, resampling, optional time-stretching, metronome and recording.
- Sample/instrument pack quality tests; focus on *good actual sound* rather than more UI options.
- MP3 rendering if a legally appropriate browser/server encoder is available; WAV first.

### P6 — Private beta, then potential commercial launch
- Auth/roles, server-side metered credit ledger, queue fairness, owner privileges with account spend caps.
- Paid users get higher quotas but no user ever receives hidden unlimited paid API access.
- Private project asset storage, rights and deletion policies, terms, licensed samples and model checkpoints.
- Monetization only after real GPU cost *per accepted usable clip* is known. A credit price must cover multiple failed/rejected takes, hosting, abuse, support and transaction fees.
- First market validation via musical demo clips and creators; do not launch before it produces results the owner actually likes.

## Cost model — illustrative, not a quoted per-song price

Modal pricing checked 2026-11-23: Starter $30/month compute allowance, L40S 48GB GPU **$0.000542 per billed second** (about **$1.95/hour**), plus CPU/memory charges; cold start, idle keepalive and file/model downloads can increase actual bills.

| Total billed GPU wall time | GPU-only cost |
| --- | ---: |
| 2 min | $0.065 |
| 5 min | $0.163 |
| 10 min | $0.325 |
| 30 min | $0.976 |

**These are usage examples, not estimates of ACE-Step generation speed.** An eight-layer song that requires two takes/layer means up to 16 generation requests plus setup/cold starts; do not turn this into a dollar-per-song estimate before actual benchmarking.

Modal source: https://modal.com/pricing . Set Workspace budget under Usage and Billing; check exact consequences of exceeding it before use. Inference phase should be owner-only with a total planned experiment cost of **at most $3–$5 of included credit initially**, only if the service allows an effective hard cap; if a zero-overage policy cannot be configured, do not deploy yet.

## Red flags and licensing

- *LLM says model supports LEGO* ≠ model actually respects chord/beat context.
- *Downloaded audio is its own file* ≠ it was good, isolated, tempo locked or real sax.
- *MIT GitHub code* ≠ all downloaded pretrained checkpoints, audio samples and datasets automatically permit commercial use.
- *Free trial* ≠ unlimited backend access; no scraping consumer music services.
- *GeneralUser GS* permits broad commercial use but its author acknowledges uncertain provenance of some source samples; prefer clearly sourced CC0 packs for redistribution.
- *Magenta MusicVAE* models are older and sometimes short-phrase only; MIDI may still be musically generic. It is a prototype, not magic.
- *Copyleft AGPL ACE-Step DAW* can require making source available to network users if using modified code; review before code reuse.
- *Full-song vocals* require a distinct model/UX. It's not required to build the MIDI+sample workstation.

## What Codex does next

**Codex Stage 1 (now):** implement P1 with live audio/midi editing and tests. Do not run external APIs, GPUs or spend credits.

**Codex Stage 2 (after P1):** implement P2 with song context, chords, editable bass/drum/piano variation generation and licensed sounds. Prove it works locally.

**Codex Stage 3 (only with separate explicit owner authorization):** run P3 isolated private benchmark adapter (one short real source-conditioned audio test). Do not deploy or spend automatically.

Codex should read **AGENTS.md**, **song-studio/CODEX_HANDOFF.md**, **song-studio/PRODUCT_BLUEPRINT.md** and **this file**, choose branch/worktree, run tests and request review before merge. Keep the old \`song-studio/\` public demo functional until a new app passes real playback QA.

## How we'll decide whether the project is good

The owner should be able to finish one **original 60–90 second track** starting from a short musical hook:
1. Add a beat that fits (editable).
2. Create 2 bass alternatives that follow chord changes.
3. Add a sampled synth or sax melody; move notes around and repeat a motif.
4. Change the chorus without erasing the verse.
5. Mix, save, reopen and export a listenable stereo WAV.
6. Optional AI-generated audio stem passes a blind comparison against the sampled/MIDI alternative; if not better, don't force it in.

The product succeeds when it makes music the owner actually likes—not when the UI has 30 flashy tools.
