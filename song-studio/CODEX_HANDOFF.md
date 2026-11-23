# Codex handoff — Song Studio, Stage 1 (offline editor)

**Copy the first prompt in this document to Codex when ready.** Do not begin GPU deployment before the owner confirms the Modal allowance and budget.

## Why this exists

The Digital Works currently has a functioning prototype at \`song-studio/\`, plus a live Creator Lab at \`studio/\`. We want a polished browser-based DAW with optional AI-generated musical layers later.

**Stage 1 is deliberately all-local: no Modal, no music API, no cloud credits, and no account/billing changes.**

## Repository references

- \`AGENTS.md\` — mandatory engineering / safety rules.
- \`song-studio/PRODUCT_BLUEPRINT.md\` — product flows and feature definitions.
- \`song-studio/ACE_STEP_EVALUATION.md\` — real model test gate; read but do not implement paid calls in Stage 1.
- \`song-studio/core/arrangement.mjs\` and \`arrangement.test.mjs\` — existing pure clip/tick utilities; run \`node --test song-studio/core/arrangement.test.mjs\`.
- \`song-studio/app.js\` — existing Web Audio editor implementation.
- \`cloudflare-worker/\` — a live service. Do not modify for Stage 1.
- \`studio/\` — working Creator Lab. Do not modify for Stage 1.

## Exact first Codex prompt

> I want you to implement Stage 1 of Song Studio, a real browser-based digital audio workstation. The repo is \`Tra1er/digital-work-portfolio\` and the source lives in \`song-studio/\`. Read \`AGENTS.md\`, \`song-studio/PRODUCT_BLUEPRINT.md\`, \`song-studio/ACE_STEP_EVALUATION.md\`, and this handoff before editing.
>
> Do NOT call an external model API, start a GPU, deploy to Modal, touch Cloudflare billing/secrets, or replace the existing image generator. Work on a separate feature branch/worktree. I do not authorize paid actions or public deployment.
>
> First, examine the existing Song Studio prototype. Then implement a real musical timeline and clip-based audio engine:
>
> 1. Project BPM and time signature, ruler with bar and beat markings, snap toggle/grid and zoom.
> 2. Multiple tracks with names, mute, solo, level, pan and reorder; maintain existing import support.
> 3. Real audio clips with stored asset IDs, start tick, length, source offset and loop setting, connected to \`core/arrangement.mjs\`. Drag/move, duplicate, split, trim, delete, loop; undo/redo.
> 4. Correct Web Audio transport for multiple clips: seek, play, stop, audio scheduling, source offsets, loop repeats, accurate start positions and no doubled playback when editing while playing.
> 5. Render actual waveforms for each clip. Be honest about gaps: imported audio isn't automatically tempo-stretched, and loops are not assumed seamless.
> 6. Export a stereo WAV matching the actual arrangement, including clip start times, trims, repeats, volume/pan, mute/solo. Protect memory on long exports.
> 7. Local project save/load. Include a clear warning that JSON-only saves don't embed source audio unless you implement a project bundle with assets.
> 8. Responsive dark graphite/lilac interface that works well on desktop and has usable mobile controls, without copying copyrighted branding/assets.
>
> Prefer small tested modules (document model, audio engine, canvas timeline, UI state) over a single giant app.js. Keep the current features functional throughout.
>
> Run \`node --test song-studio/core/arrangement.test.mjs\`, add new tests for clip operations/scheduling, and perform a real manual QA run with two imported WAV/MP3 assets. Include a concise final report showing files changed, checks passed and known limitations. Do not claim AI generation, stems or MIDI are implemented in this milestone.
>
> Do not merge into main or deploy without showing the changes for review.

## Completion checklist for Stage 1

- [ ] 4/4 at 120 BPM shows bars at 0, 2, 4, 6 seconds; eight bars end at 16 seconds.
- [ ] Snap-to-bar places imported clip at correct tick; disabling snap allows fine positioning.
- [ ] Moving a clip updates audible start position, not just the drawing.
- [ ] Split at playhead creates two segments with correct source offsets.
- [ ] Duplicate places a second clip and both play at their intended start times.
- [ ] Loop a two-bar clip over eight bars and hear repetitions at exact bar boundaries (source may need crossfade; document if not seamless).
- [ ] Repeated seek/play/pause/stop does not stack multiple duplicated AudioBufferSourceNodes.
- [ ] Mute, solo, gain, pan apply to playback **and exported WAV**.
- [ ] Exported WAV duration includes any clip ending after the original source length.
- [ ] Saved project can be reopened and either restores assets or accurately requests re-linking.
- [ ] No browser upload during normal local editing.
- [ ] Tests pass; existing portfolio, Creator Lab, Cloudflare image API and Song Studio private preview remain intact.
- [ ] No billable calls or GPU deployments were performed.

## Next instruction to Codex — ONLY after Stage 1 reviewed and validated

**Do not send the text below prematurely.** Before Stage 2, the owner verifies Modal's included credits, workspace budget and account requirements, and explicitly approves a capped paid-compute experiment.

> Implement a minimal private Modal ACE-Step 1.5 Base benchmark adapter on a separate branch. Read \`song-studio/ACE_STEP_EVALUATION.md\`. Pin dependency and model revisions. Test the standard Base before assuming XL Base fits in chosen VRAM. Protect access with server-side credentials, a single-worker concurrency cap and idle scale-to-zero. Never hardcode secrets. Provide a dry-run/local-mock mode before real generation. Show predicted resource and GPU cost before launching an actual run. Do not deploy or perform billable inference until I approve the exact experiment.
>
> After approval, run one minimal 16-second instrumental and one LEGO guitar part using an owner-supplied/rights-cleared backing track. Record audible result, cold/warm timings, VRAM and actual Modal usage. If results are poor or cost excessive, stop rather than building out a large fake AI Studio.

## How to start on Windows

1. Open ChatGPT desktop app and choose Codex, or use https://chatgpt.com/codex (if that option supports your workflow).
2. Sign into the same GitHub account and select/clone \`Tra1er/digital-work-portfolio\`.
3. Start in a new worktree/feature branch, not main.
4. Paste the **first Codex prompt** only.
5. Review diffs, run tests, and test playback in a browser before merging.
6. Give Codex only the minimal approvals each stage needs. Never paste Cloudflare/Modal secrets in chat or into committed source files.

## Summary of what is not yet done

No Modal deployment; no ACE-Step instrument generation with verified quality; no actual clip-based DAW integration; no audio-to-MIDI editing; no multiuser billing; no public free generation.

The aim is to replace these unknowns with tested, incremental features instead of a pretty but empty shell.


## Updated AI model decision (November 23, 2026)

The Stage 2 experiment must not automatically default to ACE-Step LEGO. The latest evaluation plan compares:
- MixAudio (strong context-following research result, but no public self-hostable weights found; investigate Neutune developer access).
- Stemphonic (all-at-once synchronized stems; research demo, no ready public inference weights found; reported A100 80GB experiments).
- MSG-LD / Multi-Track MusicLDM (open research code/checkpoints; four target stems: bass, drums, guitar, piano).
- MusicGen-Stem (non-commercial license and a reported regeneration bug; not a public-product candidate).
- STAGE and JEN-1 Composer (narrower/research or external API candidates).

Before any paid run, propose a fixed backing track with known key/chords/BPM and test whether a generated instrument changes appropriately when the context is transposed or its chord progression changes. A model that outputs a nice-sounding isolated WAV but ignores the context has failed our central requirement.
