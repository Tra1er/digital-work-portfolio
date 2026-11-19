# Graphite Violet — Independent digital portfolio

An original, ready-to-deploy static portfolio using graphite, muted violet, careful typography, and real interactive demos. No third-party fonts, analytics, cookies, or frameworks.

## What is real and functional
- `index.html`: complete home, 3 demo links, 6 service categories, process, and client-brief builder.
- `services.html`: **68 possibilities**, filterable and searchable; clear statuses on planned vs demo-ready work.
- `tools/csv-cleaner/`: working local CSV/TSV cleanup demo, including JavaScript.
- `tools/subtitle-tool/`: working subtitle timing and format conversion demo.
- `tools/web-fixes/`: a **fictional** responsive web project demo, not a paying client's work.
- `assets/site.css`, `assets/site.js`, `assets/services.json`, optimized project screenshots, social preview and SVG favicon.

## Important: not a live shop yet
No payment checkout, real email contact address, testimonials, order processing, or client work history is claimed. The request form **only copies a brief**; it does not send or collect data. This avoids silently losing customer enquiries. A real contact link/marketplace listing should be added before promotion to strangers.

The existing CSV and subtitle demos were previously tested locally, but should be reviewed again with buyer samples and client permission before any paid delivery. The website demo is fictional and has no real payments or bookings.

## Deploy on GitHub Pages (new repository)
1. Create a **new public GitHub repository** (e.g. `digital-work-portfolio`) at https://github.com/new. Don't reuse an unrelated existing project.
2. Upload the contents of this folder to its root, preserving all subfolders. `index.html` must be at the root.
3. In the repository, visit **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then Save.
4. Wait for GitHub to display a real deployed URL and test the `services.html` page and all 3 demos. For a normal project repository, URL typically has the form `https://USERNAME.github.io/REPOSITORY/` — do not treat this as confirmed until published.
5. When a payment/communications channel is approved, add it in the header and request section. Do not publish private customer files, payment credentials or identity documents.

## Preview locally
Open `index.html` directly for the home page and demos. The `services.html` page fetches JSON and therefore **requires a local HTTP server** or GitHub Pages. With Python available, run from this folder: `python -m http.server 8000` and visit `http://localhost:8000/`.

## Price and scope policy
All pricing is an **illustrative starting price** for a tightly scoped task. Confirm the deliverable, complexity, rights to supplied material, client privacy permissions, revision count, and payment protection before accepting. Larger projects receive separate quotes. Use AI assistance only when permitted by the customer and relevant platform.

## Accessibility and privacy
Semantic HTML, visible keyboard focus, contrast-conscious typography, reduced-motion preference, no automatic network requests to third parties. The catalog JSON is loaded from the same origin. The brief builder is local-only. No credentials or contact addresses are embedded.

## Source
Service ideas, demo names and status descriptions were adapted from the prior AI 20$ Back launch kit. This site intentionally uses a neutral identity rather than a new brand name.
