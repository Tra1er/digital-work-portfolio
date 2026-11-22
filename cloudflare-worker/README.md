# The Digital Works — Cloudflare AI Worker

This Worker is the private server-side API for the Creator Lab image generator.

- Models: `@cf/black-forest-labs/flux-2-klein-9b` (quality default) and `@cf/black-forest-labs/flux-2-klein-4b` (faster option)
- Website origin allowed to call generation: `https://tra1er.github.io`
- Human verification: Cloudflare Turnstile (server-side Siteverify)
- Rate limit: 3 generation requests per minute per source IP (approximate, per Cloudflare location)
- API route: `POST /api/generate`
- Health route: `GET /health`

## Deploy from GitHub

1. In the Cloudflare dashboard, open **Workers & Pages**.
2. Choose **Create application** and connect **GitHub**.
3. Authorize Cloudflare's GitHub app if prompted.
4. Select `Tra1er/digital-work-portfolio`.
5. Set the Worker name to `digital-works-ai`.
6. Set the root directory to `cloudflare-worker`.
7. Leave the build command blank. Set deploy command to `npx wrangler deploy`.
8. Save and deploy. The Wrangler configuration creates the Workers AI binding and rate-limit binding.
9. Confirm the Worker is named `digital-works-ai` and note its `workers.dev` URL.

Cloudflare requires the Worker name to match the Wrangler `name` in this directory. See the official [Workers Builds documentation](https://developers.cloudflare.com/workers/ci-cd/builds/).

## Create Turnstile keys

1. In Cloudflare, open **Turnstile** and add a widget.
2. Name it `Digital Works Creator Lab`.
3. Add the allowed hostname `tra1er.github.io` (hostname only; no scheme or path).
4. Choose Managed mode and create the widget.
5. Copy the **Site Key**. It is public and will be placed in the Creator Lab page.
6. Copy the **Secret Key**. Keep it private.

In the Worker dashboard, open **Settings → Variables and Secrets → Add**. Add a runtime secret named `TURNSTILE_SECRET` and paste the Turnstile Secret Key. Never put the secret in GitHub or the browser.

## Connect the website

After deployment, update these two public configuration values in `studio/index.html` and `studio/studio.js`:

- `window.DW_TURNSTILE_SITE_KEY`: the Turnstile **Site Key**.
- `FLUX_API_URL`: the full Worker URL ending in `/api/generate`.

The browser may know the Site Key and Worker URL. It must never know the Turnstile Secret Key or any Cloudflare API token.

## Test

1. Open `https://WORKER-URL/health`. It should return JSON with `ok: true` and the model identifier.
2. Open the Creator Lab on `https://tra1er.github.io/digital-work-portfolio/studio/`.
3. Complete the Turnstile widget and generate one small test image.
4. Check Worker Logs and Workers AI usage in the Cloudflare dashboard.

## Cost and abuse safeguards

Workers AI currently includes 10,000 free Neurons per day. On the Workers Free plan, requests fail after the free daily allowance is exhausted. On the Workers Paid plan, usage above the free allocation is billed. If the goal is to stay at $0, keep the account on Workers Free and do not upgrade for this experiment.

The free allowance is shared across Workers AI use on the account. The Worker does not promise unlimited generation. The configured rate limit is approximate and per Cloudflare location; Turnstile adds a server-verified human check. For a 1024×1024 output, current published pricing implies roughly 7 images/day with Klein 9B or roughly 96/day with Klein 4B, before other account usage. These are estimates, not guarantees. The hard Workers AI daily free allocation is the final limit on the Free plan.

Do not publish or share account API tokens, Turnstile Secret Keys, or personal credentials. If a secret is accidentally exposed, rotate it in Cloudflare immediately.


## Song Studio private preview

The Worker also exposes private AI music generation routes for the Song Studio prototype. Lyria 3.5 uses the existing `AI` binding with model ID `google/lyria-3.5`; it does not need a separate Gemini API key.

- Status route: `GET /api/music/status`
- Generation route: `POST /api/music/generate`
- Providers: Cloudflare-hosted Google Lyria 3.5 and Eleven Music v2.5
- Separate music rate limit: 2 requests per minute per source IP (approximate, per Cloudflare location)
- Turnstile action: `music-generate`
- The music API is owner-preview-only. Public generation is intentionally not enabled; user accounts, credits, and abuse controls must be built before public access.

### Required runtime secrets

Add these under **Workers & Pages → digital-works-ai → Settings → Variables and Secrets**. Use type **Secret** for every value.

| Secret name | Purpose |
| --- | --- |
| `ELEVENLABS_API_KEY` | ElevenLabs API key with Music API access |
| `SONG_STUDIO_PREVIEW_KEY` | Private owner-only key entered in the Song Studio page |

The existing `TURNSTILE_SECRET` is reused. Never place any of these secrets in GitHub or browser JavaScript.

### Cost and testing safeguards

- Cloudflare currently lists `google/lyria-3.5` at **$0.08 per track**. No free music-generation tier is listed; each generation can incur a charge.
- Eleven Music API requires a paid subscriber. Usage limits and downloads depend on the subscription; check the provider dashboard before testing.
- No music generation occurs until the owner adds provider secrets, configures the private preview key, and explicitly confirms paid usage in the page.
- The owner preview key is an interim gate, not a substitute for account authentication and per-user credit accounting. Do not enable public generation with this prototype.
- Each generation is a real provider request and may incur charges. Test one short benchmark at a time.

See `../song-studio/README.md` for the setup sequence.
