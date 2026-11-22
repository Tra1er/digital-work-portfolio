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
