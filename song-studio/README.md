# The Digital Works — Song Studio prototype

Song Studio is an owner-only prototype with two parts:

1. A local multitrack audio workspace (import, waveform display, synchronized playback, per-track volume/mute/solo, and WAV mix export).
2. Optional real AI song generation through Google Lyria 3.5 or Eleven Music v2.5, routed through the existing Cloudflare Worker.

## Open the prototype

After GitHub Pages publishes the latest commit:

`https://tra1er.github.io/digital-work-portfolio/song-studio/`

The local audio editor works without API credentials. Import audio files from your device; audio decoding, playback, mixing and WAV export happen in the browser. The page does not upload imported audio.

## AI generation is deliberately locked

No model is called until all of the following are true:

- The owner connects the existing Cloudflare Workers AI binding for Lyria, or adds an ElevenLabs API key as a Cloudflare Worker runtime secret.
- The owner creates a private `SONG_STUDIO_PREVIEW_KEY` secret and enters the same key into the prototype.
- The Turnstile human check succeeds.
- The owner checks the paid-usage confirmation.

Required Cloudflare runtime secrets:

| Name | Where to get it |
| --- | --- |
| `ELEVENLABS_API_KEY` | ElevenLabs API key on a plan with Music API access |
| `SONG_STUDIO_PREVIEW_KEY` | A new random private password chosen by the owner |

The existing `TURNSTILE_SECRET` is reused. Do not send secrets in chat, commit them to GitHub, or put them in public JavaScript. Use the Cloudflare dashboard's **Settings → Variables and Secrets → Add → Secret** controls.

The prototype page uses the public Turnstile Site Key already configured for `tra1er.github.io`. The Worker validates the expected action `music-generate`.

## Provider notes

### Google Lyria 3.5

- Model: `lyria-3.5`
- Routed through the existing `env.AI` binding and the Cloudflare AI Gateway using model ID `google/lyria-3.5` (`gateway: { id: "default" }`).
- Cloudflare documents full-length MP3 songs and currently lists **$0.08 per track**.
- This is a third-party model, not part of the 10,000-neuron free Workers AI allowance. Cloudflare requires AI Gateway Unified Billing and prepaid credits. No free music-generation tier is listed.
- No separate Gemini API key is needed; Cloudflare manages provider credentials for this route.
- Duration is supplied as prompt guidance; the model may not honor an exact target duration.

Cloudflare AI Gateway setup before the first paid test:
1. Deploy the latest Worker code so Lyria calls `env.AI.run(..., { gateway: { id: "default" } })`.
2. In Cloudflare, open **AI → AI Gateway** and select the **default** gateway (it is created automatically on the first authenticated request if it does not exist).
3. Open the gateway's **Settings** and set **Workers AI Billing** to **Unified billing**.
4. Unified Billing requires prepaid credits. Check Cloudflare's displayed minimum top-up and fees before adding any money. Do not generate until you are comfortable with the displayed charge.
5. One Lyria 3.5 track is currently listed at $0.08; Cloudflare documents a 5% fee on credits purchased through Unified Billing.

Official Cloudflare docs: https://developers.cloudflare.com/ai-gateway/usage/worker-binding-methods/ and https://developers.cloudflare.com/ai-gateway/features/unified-billing/

Official docs: https://ai.google.dev/gemini-api/docs/music-generation  
Pricing: https://ai.google.dev/gemini-api/docs/pricing/

### Eleven Music v2.5

- Model: `music_v2_5`
- REST API: `POST https://api.elevenlabs.io/v1/music`
- API key header: `xi-api-key`
- Supports prompt-based songs and structured composition plans with section-specific lyrics, styles and durations.
- Music API access requires a paid subscriber. Usage and download limits depend on the plan.
- The current API docs describe section-aware composition and streaming. Some inpainting capabilities are restricted to Enterprise.

Official docs: https://elevenlabs.io/docs/overview/capabilities/music  
API reference: https://elevenlabs.io/docs/api-reference/music/compose  
Composition plans: https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans

## API routes

- `GET /api/music/status` — reports whether provider secrets exist; never returns secret values.
- `POST /api/music/generate` — owner-preview-only generation endpoint.
- `GET /health` — existing Worker health endpoint.

The Worker requires `MUSIC_RATE_LIMIT`, `TURNSTILE_SECRET`, and `SONG_STUDIO_PREVIEW_KEY` before music generation. Lyria uses the existing `AI` binding; Eleven Music requires its provider API secret.

## Important launch limitation

The preview key is a temporary owner-only gate. It is not a public authentication or billing system. Before opening music generation to visitors, implement user accounts, per-user credits, daily/global spend caps, storage policies, abuse controls and a payment/subscription system. Never expose provider API keys to the browser.

## First quality benchmark

Use the same prompt with both providers, one generation at a time:

1. Natural indie rock with expressive male vocals, live-feeling drums, melodic bass, layered guitars and a strong final chorus.
2. Cinematic instrumental with piano, evolving strings, organic percussion and a clear emotional crescendo.
3. Modern electronic with punchy drums, distinctive bass, layered analog synths and evolving transitions.
4. Intimate acoustic ballad with natural vocals, fingerpicked guitar and restrained piano.

Compare vocal naturalness, arrangement, musical coherence, prompt adherence, audio fidelity, generation latency and actual provider cost. Do not claim one model is better until listening to real outputs.

## Current prototype scope

Working locally in the browser:
- Import multiple audio files.
- Decode browser-supported audio.
- Display actual waveforms.
- Synchronized playback and seeking.
- Per-track volume, mute and solo.
- Render and download a stereo WAV mix.

Not yet implemented:
- Persistent cloud projects/accounts.
- Public user quotas and billing.
- Stem separation into independently editable generated tracks.
- Section regeneration/inpainting.
- MIDI note editing or instrument-level regeneration.

These are intentionally deferred until the model benchmark establishes which provider and workflow are worth investing in.


## Pre-Codex preparation (November 22, 2026)

The repository now includes a concrete product plan and the first unit-tested arrangement primitives:

- [Codex handoff](CODEX_HANDOFF.md) — exact Stage 1 prompt and acceptance checklist.
- [Product blueprint](PRODUCT_BLUEPRINT.md) — UI, timing, local editing, cloud architecture, design and milestone plan.
- [ACE-Step evaluation](ACE_STEP_EVALUATION.md) — official LEGO instrument families, source audio requirement, test prompts, quality gate and GPU budget cautions.
- [Pure arrangement engine](core/arrangement.mjs) — tick-based bars, snap, track/clip data, move, duplicate, resize, loop, remove and playback-plan conversion. **Not yet connected to the existing UI.**
- [Arrangement unit tests](core/arrangement.test.mjs) — run \`node --test song-studio/core/arrangement.test.mjs\` from the repository root with Node.js.
- [Repo agent instructions](../AGENTS.md) — mandatory safety boundaries for Codex.

The current live Song Studio has a basic **whole-track audio engine**, not an integrated clip-based timeline. A successful local arrangement-engine test does not mean the full DAW is already built.

**Cloudflare music provider status disclaimer:** \`lyria.configured=true\` means the Worker has an AI binding; it does **not** establish that prepaid AI Gateway credits, successful music generation or commercial production access are available.

**Recommended immediate next milestone:** offline Stage 1 timeline and audio scheduling, using the first prompt in CODEX_HANDOFF.md. No Modal account or GPU is needed for that milestone. Stage 2 should only be attempted after the owner consents to a private, capped test of ACE-Step LEGO on Modal.
