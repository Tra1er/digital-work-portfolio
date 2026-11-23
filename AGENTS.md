# Agent instructions — The Digital Works

This repository serves a real GitHub Pages site and a deployed Cloudflare Worker. Treat it as production-adjacent: **do not replace or break working tools.**

## Mission

Build **Song Studio**, a browser-based music production workstation with a real arrangement timeline and optional cloud AI-generated audio layers (ACE-Step 1.5 LEGO/Extract/Complete/Repaint) after quality and cost testing. Keep Creator Lab and the portfolio intact. Start with reliable browser editing; cloud inference is a separate milestone.

## Read first

1. `song-studio/CODEX_HANDOFF.md` — current work order, priorities and acceptance criteria.
2. `song-studio/PRODUCT_BLUEPRINT.md` — precise user experience, architecture and data invariants.
3. `song-studio/RESEARCH_ROADMAP_2026-11-23.md` — current hybrid MIDI/audio decision, model comparisons, cost safeguards and phased execution.
4. `song-studio/ACE_STEP_EVALUATION.md` — model capabilities and required quality gate.
5. `song-studio/README.md` — current prototype and existing backend.
6. `cloudflare-worker/README.md` — current Cloudflare setup and security boundaries.

## Do not do these without the owner's explicit approval

- Deploy to Modal, Cloudflare, GitHub Pages, or another paid/external provider.
- Start a GPU, download large model weights, invoke paid music APIs or consume cloud credits.
- Change Cloudflare billing, quotas, credentials, DNS or environment secrets.
- Make the existing private AI-generation API public or remove its human verification.
- Commit tokens, passwords, PII, generated user audio, secrets, or large model weights.
- Delete existing functioning apps or overwrite the live main branch.
- Advertise unfinished features as working, including real instrument isolation, audio stems, or seamless AI looping.

## Development rules

- Create a feature branch or worktree for substantial changes; use narrow pull requests.
- Prefer readable, composable, testable modules. Do not generate a giant monolithic single-page application.
- Browser editor must run without any API key or cloud connection.
- Keep audio samples local to the browser until a user explicitly requests an AI operation.
- The **arrangement clock** uses ticks (960 ticks per quarter note), not floating-point seconds as the canonical source of truth.
- Handle 4/4, 3/4 and 6/8 with explicit BPM interpretation; quantization and clip editing must be deterministic.
- Separate the song document, timeline rendering, audio-engine scheduling and cloud inference adapters.
- Never claim tempo/key matching, stem separation, beat-perfect loops or instrument accuracy without tests.
- Prefer progressive improvement to the existing prototype. Keep everything mobile-friendly, keyboard-accessible and responsive.
- Avoid rendering untrusted song/track names as unsafe HTML.
- Include graceful failure, loading states and spend controls for external operations.
- For every milestone: show changes, run tests, identify known limitations and provide exact local run instructions.

## Existing paths

- `song-studio/` — current prototype; do not break imports, waveforms, synchronized playback or WAV export.
- `song-studio/core/` — small dependency-free arrangement primitives and tests.
- `studio/` — separate Creator Lab, including FLUX image generation. Preserve it.
- `cloudflare-worker/` — deployed Worker with existing image endpoints and private music preview. Preserve it.
- `README.md` — portfolio landing information.

## Initial acceptance gate

Before any new cloud inference work, deliver:
1. Browser-visible, **real** 4/4 bar timeline with move/duplicate/trim/loop of clips and snap-to-grid.
2. Real imported audio playback with correct offsets, seek, mute/solo, level and WAV export.
3. Project state that can be saved/loaded locally (with audio-asset caveats made clear).
4. Automated tests for tick math and clip operations; a manual audio test checklist.
5. No broken existing paths or unexpected billable calls.

After that, use `ACE_STEP_EVALUATION.md` to determine whether the model is good enough to integrate.
