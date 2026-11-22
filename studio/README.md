# Creator Lab — The Digital Works

**Live URL (expected GitHub Pages path):** https://tra1er.github.io/digital-work-portfolio/studio/

Creator Lab is a mobile-first toolkit inside the existing Digital Works website, built as simple static HTML, CSS and JavaScript. No build steps or paid dependencies for browser-only tools.

## Shipped tools

| Tool | What it does | External service? |
| --- | --- | --- |
| AI Image Studio (beta) | Text-to-image via FLUX.2 Klein 9B (quality) or 4B (fast) on Cloudflare Workers AI | Yes: prompt sent to Cloudflare Workers AI |
| Prompt Composer | Composes detailed prompts with configurable inputs | No |
| Photo Editor | Brightness, contrast, saturation, grayscale and PNG export | No |
| Image Optimizer | Resize/export JPEG, PNG or WebP and show resulting size | No |
| Palette Extractor | Extract five dominant quantized colors from a local image | No |
| Gradient Maker | Preview and copy CSS gradients | No |
| Social Banner | Create a 1200 × 630 graphic and export PNG | No |
| SVG Shape Maker | Create and download vector blobs | No |
| Shadow Builder | Preview and copy box-shadow CSS | No |

## AI caveats and safety

- Image generation now uses a Cloudflare Worker backend and FLUX.2 Klein 9B (higher quality, fewer free generations) or Klein 4B (faster, more free generations). It requires deploying `cloudflare-worker/` and configuring Turnstile. Follow `cloudflare-worker/README.md`.
- The browser sends prompts to our Cloudflare Worker, which calls Cloudflare Workers AI. Never put Cloudflare API tokens or Turnstile secrets in GitHub or public JavaScript.
- The published free allowance is 10,000 Neurons/day across the account. At 1024×1024, current model pricing implies approximately 7 Klein 9B images or 96 Klein 4B images per day before other account usage. This is a pricing estimate, not a guarantee.
- All uploaded images for local image and design tools stay in the browser; text prompts for AI generation are sent to Cloudflare.
- No analytics scripts or ad scripts. Fonts do load from Google Fonts, a third party. System-font fallback works without them.
- Check provider terms and functionality before promising availability or using paid advertising.

## File structure

- index.html — content and interactive workspaces
- studio.css — responsive layout and mobile navigation
- studio.js — tool implementations and integration
- README.md — notes, QA, launch plan
- `../cloudflare-worker/` — separate Worker API, Wrangler configuration and deployment guide

The portfolio navigation links to the new studio folder. Existing GitHub Pages source is expected to publish it alongside the main website.

## Manual tests before promotion

1. Open the site on a small Android phone. Swipe the horizontal tool bar and switch between all nine tools.
2. Upload and export an image in Photo Editor, Image Optimizer, and Palette Extractor.
3. Copy a composed prompt, CSS gradient, SVG and shadow.
4. Download a social banner and SVG shape.
5. Deploy `cloudflare-worker/` and configure Turnstile using its README.
6. Test one Klein 9B image and one Klein 4B image; compare quality, latency and actual neuron usage.
7. Confirm links to products, services and home work.
8. Confirm GitHub Pages and the Worker serve the latest commits. A successful GitHub commit is not a browser/production test.

## Realistic business path

The free toolkit is a potential discovery channel, not automatic income. It links to The Digital Works' contact email and Ko-fi page. Avoid fake testimonials or sales claims.

A first growth experiment: share one genuinely useful tool in communities where self-promotion is permitted; submit the site to reputable free-tool directories; ask people for feedback; measure what they actually use. After finding a useful niche, build a focused landing page and a small paid customization/template/service related to it. Do not pay for ads without evidence of demand.
