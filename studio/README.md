# Creator Lab — The Digital Works

**Live URL (expected GitHub Pages path):** https://tra1er.github.io/digital-work-portfolio/studio/

Creator Lab is a mobile-first toolkit inside the existing Digital Works website, built as simple static HTML, CSS and JavaScript. No build steps or paid dependencies for browser-only tools.

## Shipped tools

| Tool | What it does | External service? |
| --- | --- | --- |
| AI Image Studio (beta) | Text-to-image via Pollinations Classic guest endpoint, or account-authorized API | Yes: prompt sent to provider |
| Prompt Composer | Composes detailed prompts with configurable inputs | No |
| Photo Editor | Brightness, contrast, saturation, grayscale and PNG export | No |
| Image Optimizer | Resize/export JPEG, PNG or WebP and show resulting size | No |
| Palette Extractor | Extract five dominant quantized colors from a local image | No |
| Gradient Maker | Preview and copy CSS gradients | No |
| Social Banner | Create a 1200 × 630 graphic and export PNG | No |
| SVG Shape Maker | Create and download vector blobs | No |
| Shadow Builder | Preview and copy box-shadow CSS | No |

## AI caveats and safety

- Anonymous image service is best-effort, third-party, not guaranteed free or available forever; it may fail or be rate-limited. We do not scrape restricted services or bypass access controls.
- Authenticated Pollinations requests require user authorization and may consume user credits. The UI discloses this.
- Current account login uses Pollinations PKCE authorization-code flow without an app identifier, documented as an optional identifier by the provider, but this still requires real-device verification. To enable developer earnings, configure a proper publishable App Key and matching redirect URI from Pollinations.
- Never place a personal secret API key in GitHub, public JavaScript or URLs. The login flow only keeps user-authorized scoped credentials in sessionStorage; Disconnect clears them.
- All uploaded images for local image and design tools stay in the browser; image-generation prompts go to Pollinations.
- No analytics scripts or ad scripts. Fonts do load from Google Fonts, a third party. System-font fallback works without them.
- Check provider terms and functionality before promising availability or using paid advertising.

## File structure

- index.html — content and interactive workspaces
- studio.css — responsive layout and mobile navigation
- studio.js — tool implementations and integration
- README.md — notes, QA, launch plan

The portfolio navigation links to the new studio folder. Existing GitHub Pages source is expected to publish it alongside the main website.

## Manual tests before promotion

1. Open the site on a small Android phone. Swipe the horizontal tool bar and switch between all nine tools.
2. Upload and export an image in Photo Editor, Image Optimizer, and Palette Extractor.
3. Copy a composed prompt, CSS gradient, SVG and shadow.
4. Download a social banner and SVG shape.
5. Test guest generation once and respect provider limits.
6. Test account mode only with a user-authorized account, explicit consent and a tiny budget.
7. Confirm links to products, services and home work.
8. Confirm GitHub Pages serves latest content. A successful GitHub commit is not a browser/production test.

## Realistic business path

The free toolkit is a potential discovery channel, not automatic income. It links to The Digital Works' contact email and Ko-fi page. Avoid fake testimonials or sales claims.

A first growth experiment: share one genuinely useful tool in communities where self-promotion is permitted; submit the site to reputable free-tool directories; ask people for feedback; measure what they actually use. After finding a useful niche, build a focused landing page and a small paid customization/template/service related to it. Do not pay for ads without evidence of demand.
