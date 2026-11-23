# ACE-Step 1.5 — LEGO research and quality gate

**Purpose:** Decide whether we should spend Modal GPU credits integrating ACE-Step into Song Studio. No marketing claims or public generation before listening tests.

**Status:** Desk research only. We have NOT deployed ACE-Step to Modal, measured cost, or successfully generated a LEGO instrument inside The Digital Works.

## Verified upstream facts

Official upstream repository: https://github.com/ace-step/ACE-Step-1.5

- ACE-Step 1.5 supports task types \`text2music\`, \`repaint\`, \`cover\`, \`extract\`, \`lego\`, \`complete\` on the **Base** model family. Do **not** select XL Turbo for LEGO.
- LEGO requires an **existing source/backing audio** (\`src_audio\`), an \`instruction\` naming a target instrument family, and a \`caption\` describing the part.
- Upstream track families: \`vocals\`, \`backing_vocals\`, \`drums\`, \`bass\`, \`guitar\`, \`keyboard\`, \`percussion\`, \`strings\`, \`synth\`, \`fx\`, \`brass\`, \`woodwinds\`.
- Saxophone is *not* a dedicated family. Try \`brass\` or \`woodwinds\` with e.g. "intimate tenor saxophone" in the text.
- Extract attempts to isolate one family from a mix. Do not assume the output is clean enough for commercial stems.
- \`repainting_start\` and \`repainting_end\` permit time regions where supported.
- Output of the core model is **audio**, not native editable MIDI data.
- Duration in the inference API is specified in seconds (10–600 for text2music), but LEGO duration can be locked to source audio length by the handler. Verify actual behavior with pinned model release.
- Base default quality settings differ from Turbo; official guidance suggests 32–64 inference steps for Base, with latency/cost trade-offs.
- 5Hz LM is optional for basic text-to-music but can be used for planning. Do not depend on the Gradio public demo for our backend.

Official evidence:
- https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/INFERENCE.md
- https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md
- https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/UI_SUPPORT.md
- https://github.com/ace-step/ACE-Step-1.5/blob/main/acestep/constants.py

## A material risk: LEGO audio quality

A GitHub issue reported the Base + 4B LM LEGO workflow could produce incoherent/jumbled results rather than a musically fitting bass stem (issue #369, February 2026, closed). One user's report is not a conclusive benchmark, but this is enough to **require real listening tests** before we invest in a complete interface around it.

Issue: https://github.com/ace-step/ACE-Step-1.5/issues/369

### Proposed acceptance tests — run one at a time, private only

Make or own the input audio. Do not upload third-party copyrighted songs unless rights allow processing.

**Backing A — 8 bars, 120 BPM, 4/4 (16 seconds)**

- Simple, chordal disco backing, e.g. Am–F–C–G, clean drums and pad.
- True 8-bar length; start and end on bar boundaries. Keep a WAV master.
- We can create this from a local synthesizer or an independently licensed/generated backing, without any expensive model API.

For each test, record the exact model commit/weights revision, runtime config, GPU, elapsed times and source audio duration.

| ID | Task | Target / prompt | What must be heard |
|---|---|---|---|
| L01 | LEGO | \`guitar\`: "tight, rhythmic clean funk guitar stabs in A minor, follow the groove" | Guitar sounds guitar-like, fits pulse and chordal context |
| L02 | LEGO | \`bass\`: "warm syncopated fingered electric bass line with tasteful movement, follow chords" | Actual musical bassline, not bass noise or source bleed |
| L03 | LEGO | \`drums\`: "crisp organic deep-house drums, four on the floor, tasteful syncopated hats" | Drums with stable time and audible musical structure |
| L04 | LEGO | \`brass\`: "expressive mellow tenor saxophone lead, phrased melody, no brass section" | Convincing sax-like melody, stays in key and rhythm |
| L05 | LEGO | \`synth\`: "warm evolving analog synth countermelody with gentle modulation" | Clear synth, fits backing without clashing |
| E01 | EXTRACT | Isolate guitar or drums from a mixed test track | Isolated element usable, with manageable leakage/artifacts |
| R01 | REPAINT | 4-bar selected region of a generated track | Only intended region is changed or transition is acceptably smooth |
| C01 | COMPLETE | Add an instrument to intentionally sparse backing | Coherent addition that is musically useful |

**Compare at least two seeds per high-priority test** (L01–L04) if budget allows. One successful cherry-picked output is insufficient evidence of reliability.

### Listening scorecard (human ears, scale 1–5)

1. Instrument identity (is it recognizably sax, guitar, bass, etc.?).
2. Harmonic fit (stays within intended key/chords).
3. Groove and timing (aligns to bar grid).
4. Audio cleanliness (no major hiss, clipping, bleed or metallic mush).
5. Musical usefulness (would you keep it in an actual track?).

**Go/no-go rule:** Core LEGO tasks (guitar, bass, drums and sax-like brass) must each score at least 3/5 on instrument identity and 3/5 on usefulness in two separate trials, with no repeatable severe time drift. Otherwise do NOT ship LEGO as the headline feature. Instead consider focused providers, audio stem workflows or a different model.

A model can generate realistic full songs yet fail to create useful independent instrument stems. Test separately.

## Model choice and hosting

- Quality hypothesis: \`acestep-v15-xl-base\`; cost fallback: standard \`acestep-v15-base\`.
- Pin model revision/weights and Python dependency versions. Never use an unpinned \`main\` for a production reproducibility benchmark.
- Modal Starter advertises **$30/month of included compute**; it is a usage allowance, not a free unlimited GPU. Hosting a custom Python model container consumes compute credits; Modal Model APIs are not covered.
- Set a workspace budget and confirm how it operates **before** any deployment. Limits, GPU eligibility and availability can differ by account.
- Keep a single private GPU worker, scaled down to zero when idle. Time and VRAM are measured, not assumed.
- Test 24 GB vs 48 GB GPUs based on model requirements; don't claim that 24 GB is enough for every XL/5Hz LM configuration.
- Record cold-start wall time, warm-start generation time, GPU seconds, total container seconds and billable cost.

Official Modal pricing: https://modal.com/pricing
Official Modal spend guidance: https://modal.com/changelog/improved-usage-limits-in-the-dashboard

## Safe backend contract (design, not deployed)

The browser should never receive a Modal API token. Browser -> authenticated Cloudflare Worker -> private Modal job.

Suggested job request:
\`\`\`json
{
  "task": "lego",
  "model": "acestep-v15-xl-base",
  "instrumentFamily": "guitar",
  "prompt": "tight clean funk rhythm guitar ...",
  "sourceAssetId": "private-file-reference",
  "region": {"startBar": 0, "lengthBars": 8},
  "project": {"bpm": 120, "meter": [4, 4], "key": "A minor"},
  "seed": 1234
}
\`\`\`

This is **our own planned API format**, not an ACE-Step official API payload.

Response: queued job ID; status stages; on completion, a private audio asset URL with expiry plus usage/latency metadata. Validate upload size, duration, content type, owner auth, concurrency and budget limits. Tokens/secrets are server-side only.

## What is still unknown

- Whether XL Base LEGO creates truly usable 16-second guitar/sax/bass/drum parts.
- Whether source duration locks task length in the selected release.
- Required VRAM and first-run model download time on chosen Modal GPU.
- Actual output audio format, channel layout and isolated-stem quality.
- Cold-start cost, warm generation throughput and total cost per accepted clip.
- Whether music-generated output needs further licensing attribution under the chosen model/checkpoints/dependencies.

**This file is a test plan, not a success report.** Do not spend on a cloud benchmark without the owner's explicit opt-in.


## Additional model research — November 23, 2026

The key question is not simply whether a model outputs a separate instrument file. It is whether it **actually follows the shared musical context** (chords, key, tempo, groove and arrangement) when creating that file.

### Candidate A — MixAudio (Neutune): strongest recent evidence for context-following

Research paper: https://arxiv.org/abs/2610.09637

The October 2026 paper describes a model that uses two different audio inputs:
- A short **per-instrument prompt recording** guides that instrument's timbre and playing style.
- A shared **context mix** of existing song stems, with key and beat positions, guides harmony and tempo.

The model can generate one or multiple missing stems for a section. In controlled context-swap experiments, the generated harmony followed the substituted context for MixAudio much more clearly than for the ACE-Step 1.5 2B baseline. In a 17-listener study of 48 cases, average context-fit ratings were 3.36/5 for MixAudio and 2.39/5 for ACE. These are research results on the paper's data and setup, not a guarantee of the same results on our genres or prompts.

Important limits:
- MixAudio is not currently a public downloadable model in the sources checked.
- Neutune offers MixAudio products and an API, but the public API page describes track generation; it does not establish that stem-level MixAudio generation is available to third-party developers.
- Ask Neutune specifically whether their API exposes *Add/Generate individual instrument stem from context audio*, accepted instruments, rights, pricing, output stems, and commercial resale rights. Do not assume it does.

Links:
- https://www.neutune.com/
- https://mix.audio/
- https://www.jenmusic.ai/api (not MixAudio; do not confuse the two APIs)

Related commercial reference: Neutune announced NeuSynth in November 2026, a DAW stem generator that uses up to 60 seconds of context and can produce 1–6 instrument layers with four variation sets. The announcement says macOS first and Windows coming later. It is a product to study, not an open checkpoint we can host.
- https://www.kvraudio.com/news/neutune-announces-neusynth---a-stem-generator-that-works-inside-your-daw-69724

### Candidate B — Stemphonic: strongest all-at-once architecture

Paper: https://arxiv.org/abs/2602.09891
Demo: https://stemphonic-demo.vercel.app/

Stemphonic is a 2026 diffusion/flow research system designed to generate a variable number of synchronized stems in one inference pass. It uses shared initial noise across stems and separate text instructions per instrument. It also describes conditional multi-stem generation using existing context stems, plus controls for when each stem is active.

Why it matters:
- It can generate multiple parts together instead of hoping separate random calls happen to match.
- It supports both global song instructions and instrument-specific roles.
- Its conditional setup is aligned with the idea of keeping chosen parts and generating missing ones.

Limits:
- The public material found provides a paper and demo; no ready-to-deploy public inference package or model weights were found.
- The paper reports experiments using an 80 GB A100. This is not proof that 80 GB is the minimum inference VRAM, but we must not assume it fits a cheap Modal GPU.
- Do not plan a Modal deployment until authors confirm checkpoint availability, inference requirements, licensing and commercial terms.

### Candidate C — MSG-LD / Multi-Track MusicLDM: practical open-research candidate

Repositories and demo:
- https://github.com/karchkha/MSG-LD
- https://github.com/chynggi/MSG-LD-Pytorch2
- https://msg-ld.github.io/

This research family models related tracks jointly and can perform arrangement generation by inpainting selected missing tracks while conditioning on the others. The published setup exposes four instrument tracks: bass, drums, guitar and piano. The repository provides inference instructions and pretrained checkpoint downloads.

Why test it:
- It has code and published checkpoints, unlike some newer papers.
- It is directly about generating missing parts that fit existing tracks.
- It may be a useful open benchmark for bass/drums/guitar/piano.

Limits:
- Only four predefined stem categories in the published arrangement configuration; it does not solve arbitrary saxophone, flute or every instrument.
- Research code and dependencies need an environment audit; README refers to Python 3.9 and separate vocoder/VAE components.
- The model is research-era and trained on multitrack datasets such as Slakh2100. Do not assume performance on natural recordings or commercial rights without checking each component and dataset license.
- Treat it as an experiment, not a product decision.

### Candidate D — MusicGen-Stem: available weights, but not our commercial answer

- https://simonrouard.github.io/musicgenstem/
- https://huggingface.co/facebook/musicgen-stem-6cb
- https://github.com/simonrouard/audiocraft/tree/multistem

It learns relationships among three streams (bass, drums and other) and demonstrates iterative stem replacement using the remaining stems as context. The weights are published, but the Hugging Face model carries CC-BY-NC-4.0, so it is not suitable for a commercial product without separate permission. A 2026 issue also reports a broken regeneration path and silent bass output in the multistem code branch. It can be inspected for research, but do not spend GPU credits on it as our launch backend.

### Candidate E — STAGE: focused accompaniment research

- https://github.com/giorgioskij/stage
- https://arxiv.org/abs/2504.05690

STAGE fine-tunes MusicGen to generate a single instrumental accompaniment conditioned on a mix, text and optionally a metronome-like rhythm reference. The paper reports improved coherence against baselines, but the repository explicitly calls itself research-oriented and not production-ready. The public repo focuses on drums/bass rather than a wide instrument catalog. Useful as a narrow benchmark if setup is manageable, not a complete studio backend.

### Candidate F — JEN-1 Composer: interesting official multi-track demos/API

- https://www.jenmusic.ai/research
- https://www.jenmusic.ai/api
- https://arxiv.org/abs/2310.19180

The official research page shows four generated tracks (drum, bass, melody and an additional instrument) and conditional examples where a user supplies one, two or three stems and the model generates the missing tracks. This demonstrates the human-in-the-loop workflow we want.

Limits:
- The public API page confirms a paid full-track generation API, but does not establish that the research Composer's conditional individual-stem feature is available in the public API.
- Public API pricing starts at $0.04 for a 1–60 second generated track; don't assume that rate applies to multi-stem Composer operations.
- The free plan has 20 monthly credits but does not include downloadable stems; the published stem download feature is on paid plans.
- This is an external benchmark/API conversation, not an open self-hostable model.

## Recommended strategy for The Digital Works

Do not pick one model based on its name, demo screenshot or the fact that it outputs WAV files.

**Best architecture to aim for:**
1. A persistent song context: BPM, meter, key, chord progression, bar/section map and beat grid.
2. A harmonic anchor (piano/guitar/keys/pad or a user-imported chord track) so later parts have real chords to follow.
3. A context mix containing all accepted tracks. Every new generation receives the same song context plus the current accepted mix, not only the immediately previous instrument.
4. Where supported, a separate short reference recording for the target instrument's timbre/playing style.
5. Generate 2–4 takes, audition them against the exact context, accept one, and only then add it to the mix for the next request.
6. Rejected takes never change the project. Replacing a part preserves the original take and lets the user A/B them.

**Suggested order for an initial experiment:**
- Create a rights-cleared 8-bar backing in a known key and BPM, including chords and a click/guide.
- Add bass conditioned on chords + guide.
- Add drums conditioned on the existing arrangement (or test drums first if the genre's groove is the primary anchor).
- Add guitar/keys, then a lead melody or sax-like brass/woodwind.
- Repeat one test after changing the backing's chord progression or transposing it. A real context-aware model should respond to the changed context; if the generated harmony stays the same, it is not following the song reliably.

**Score every candidate separately for:**
- harmonic fit (notes/chords agree);
- rhythmic fit (beat and bar alignment);
- instrument identity/timbre;
- audio quality;
- usefulness in the mix.

The most important test is a context swap: change the supplied backing's chords or tempo, regenerate with the same target instrument prompt, and see whether the part follows the new context.

## Purchase decision

**Do not buy the $30 Modal allowance yet just to try ACE-Step LEGO.**

First:
- finish the browser editor (Stage 1, zero GPU cost);
- audition Stemphonic and JEN-1 Composer public examples;
- ask Neutune whether stem-level MixAudio/NeuSynth developer access exists and obtain exact API pricing;
- inspect MSG-LD checkpoint/license/setup;
- only then run a tiny, explicitly approved cloud benchmark comparing the best available candidates.

The $30 credit is a testing budget, not proof that a useful model will fit or that a complete production service can be hosted for free.
