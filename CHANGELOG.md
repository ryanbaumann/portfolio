# Changelog

All notable changes to this project will be documented in this file.

## 2026-07-12: Sticky nav, profile/social sync

- Made the portfolio nav sticky and horizontally resilient on small screens so the site sections stay available while scrolling.
- Added LinkedIn, X, and Substack as explicit social/content sources in homepage chips, footer links, and Person JSON-LD `sameAs`.
- Added a local profile image slot with dimensions and alt text so Ryan's LinkedIn headshot can be dropped in without layout shift; the current checked-in asset is an honest placeholder because LinkedIn image fetches are blocked in this environment.

## 2026-07-12: Copy, trust, and answer-engine pass

- Tightened homepage, about, writing, and demos copy so claims point back to visible work, live demos, decks, or durable career facts.
- Added homepage proof points for Google Maps Platform reach, Mapbox growth-stage work, and Caterpillar patents.
- Improved answer-engine structured data with a ProfilePage summary and Person knowsAbout topics for maps, developer experience, MCP, agent skills, evals, and AI-native tools.
- Kept the portfolio performance posture intact: no new client-side JavaScript, no new dependencies, and no fabricated visuals.

## 2026-07-12: UI/UX + copy refresh, CI hang fix, agentic loop

- Fixed Cloud Run auto-deployment workflow (skipped status) by correcting the repository filter in `.github/workflows/deploy.yml` to check for `ryanbaumann/Portfolio` instead of the legacy `ryanbaumann/trails.ninja` repository.
- Fixed image aspect ratio and layout distortion for the homepage hero image (`/previews/strava-explorer.jpg`) by correcting its HTML template attributes to match its physical `1200x687` dimensions and adding `height: auto` in CSS.
- Added a zero-dependency image dimension parser helper `getImageDimensions` in `build.mjs` that automatically reads and parses SVG (from viewBox/width/height) and JPEG (from SOF marker headers) image files at build time.
- Integrated dynamic `width` and `height` attributes on page detail and standalone article hero images (`.article-hero`) to prevent Cumulative Layout Shift (CLS).
- Added `height: auto` globally to `img`, `.hero-image`, and `.article-hero` in `style.css` to ensure responsive images scale proportionally.
- Fixed the CI hang root cause: the build-and-smoke job ran raw `node --test` in `gateway/`, which imports `server.js` without `NODE_ENV=test`, so `server.listen()` ran and the process never exited. Every run hung until GitHub's 6-hour job timeout, and 10 stuck runs piled up. CI now uses `npm test` (sets `NODE_ENV=test`), `server.js` also guards `listen()` on `NODE_TEST_CONTEXT`, and every job has a 10-20 minute timeout plus cancel-in-progress concurrency.
- Rewrote portfolio copy in Ryan's voice: first person, short sentences, no em-dashes, nothing overstated. Work entries now end with a "What I learned" section instead of "Why it matters."
- Added a new Writing entry (Vibing with Maps on Substack) and two new Talks entries (GeoMob SF, April 2025; vis.gl Summit, Seattle, October 2025) with links to the real decks.
- Cut the generic firesides entry and the keyword-dump About copy.
- Added a real image to every page: honest screenshots where they exist, and generated SVG artifact cards (`scripts/artifact-cards.mjs`) where they don't. Artifact cards state only facts already in the entry copy.
- Work cards and writing/talks rows now render thumbnails.
- Pulled the CSS back to the documented design system: system fonts, simple card lift, no webfont import, no 3D tilt, no scroll reveals.
- Added an "agentic loop" section to `AGENTS.md`.
- Updated `.agents/skills/portfolio-writing/SKILL.md` and `.agents/skills/portfolio-design/SKILL.md` with today's lessons.

## 2026-07-12 — CMS hardening and Ryan copy pass

- Hardened the portfolio flat-file CMS with build-time checks for required metadata, ISO writing dates, URL shape, duplicate slugs, images/alt text, broken internal links, and draft/noindex safety.
- Added explicit draft, canonical, image, imageAlt, tags, updated, and slug support for portfolio content plus an RSS feed for writing.
- Updated blog/work/talk templates, `npm run new:post`, and portfolio docs so humans and agents can add valid content with one command.
- Tightened Ryan-first copy and added a visible homepage/about media slot using existing preview assets.

## [Unreleased] - 2026-07-12 — Ryan Baumann portfolio overhaul

### Added — SEO, AEO, and Social Sharing
- Extended portfolio generation to emit `<link rel="canonical">`, full `og:*` and `twitter:*` metadata, and JSON-LD structured data (`Person`, `WebSite`, `BlogPosting`).
- Automated generation of `sitemap.xml` and `robots.txt`.
- Added build-time metadata validation checks.
- Implemented static share links without relying on client-side JS.

### Added — UI/UX Polish
- Reworked page layouts for mobile, narrow, and desktop views with responsive CSS `clamp()`.
- Added an accessible, visually-hidden skip link for keyboard navigation.
- Improved demo grids with a new 2-column intermediate breakpoint.
- Added subtle hover states and optimized touch targets.

### Added — Gateway Security and Private Demos
- Introduced support for `visibility: public | unlisted | private` and `auth` config in `apps.json`.
- Added a timing-safe, zero-dependency password gate using `node:crypto` HMAC session cookies.
- Implemented route-aware rate limiting policies for API routes vs photos.
- Filtered private apps from the `/api/apps` response to prevent disclosure.

### Fixed — Strava Photo Proxy
- Fixed Maps 3D WebGL CloudFront CORS errors by passing Strava popover photos through the gateway's `/api/photo-proxy`.
- Added `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy: cross-origin` headers to binary responses in the gateway without compromising validation policies.

### Added — CI/CD Hardening
- Hardened GitHub Actions to run package-level checks (`npm ci`, `lint`, `test`, `build`) concurrently via a matrix job.
- Added Docker build verification and Gitleaks secret scanning.
- Prevented deployment race conditions with `concurrency` groups.
- Added explicit preflight checks for required GitHub variables and secrets.
- Implemented a post-deploy smoke test against the live production URL.

### Added — Planning
- Added a detailed end-to-end portfolio overhaul plan covering Ryan-first branding, generic agent workflows, CMS hardening, copy/content enrichment, SEO/social sharing, responsive UX, gateway security/private demos/rate limits, Strava photo proxy fixes, CI/CD hardening, and final verification.

### Changed — Brand direction
- Re-centered public docs, package metadata, gateway logs, demo home links, and portfolio site metadata on the Ryan Baumann Portfolio brand and canonical `https://www.ryanbaumann-portfolio.com/` URL while preserving legacy `trails-ninja` service/repo references where renaming could affect deployment.

### Changed — Agent workflows
- Moved canonical local skills from tool-specific `.claude/` and `.codex/` directories into generic `.agents/skills/`, including portfolio content/writing/design/presenting guidance and Google Maps Platform skill references.

## [Unreleased] - 2026-07-12 — One site, one design

### Changed — The portfolio is now the site
- The portfolio serves at the root path: `apps.json` mounts it at `/`, the
  gateway matches the most specific app path first, and `/portfolio/*`
  308-redirects to `/*`. The separate dark landing page in `gateway/public/`
  is deleted — one design language everywhere.
- Homepage rebuilt: name-first hero (Engineer · Builder · Tinkerer), quick
  links, featured work, a Demos section with real screenshots generated
  straight from `apps.json`, writing, talks, background. Nav gains Demos
  (`/demos/` index page); every demo already links home, and smoke now
  enforces navigation in every direction.
- Copy pass across `site.json`, about, work, and writing in Ryan's voice;
  work entries gained verified project links and real images
  (kepler.gl-on-Mapbox, mapboxgl-jupyter notebook, mapboxgl-powerbi visual)
  rendered as case-study heroes via new `image`/`imageAlt` front matter.

### Fixed — Demos
- **isochrones**: 2D `AdvancedMarkerElement` was given a `PinElement` via
  `marker.append(pin)` — that's the 3D `Marker3DInteractiveElement` pattern;
  on 2D it throws mid-init and kills every interaction (click, drag, search,
  ring generation) even with a valid key. Now passes `content: pin.element`.
- **All three demos**: a failed Maps JS loader (bad key, blocked referrer)
  no longer fails silently — each app surfaces a visible, actionable error.
  strava-explorer previously left its Connect/Demo buttons permanently
  disabled with no message.
- **aqi-map, isochrones**: added favicons (killed a 404 per page load).

### Added — Paved paths
- `npm run new:demo -- <name>`: scaffolds a Vite demo app and wires
  `apps.json`, the Dockerfile builder+COPY stages, and dependabot in one
  command. Verified end-to-end: scaffold → build → smoke green.
- `npm run new:post -- "Title"`: scaffolds a blog post (`--external <url>`
  for link-outs).
- `npm run previews`: regenerates honest demo screenshots with Playwright
  (local staged build or `BASE_URL=https://trails.ninja`).
- `docs/ARCHITECTURE.md`: written — it was referenced by README, AGENTS.md,
  and code comments (including numbered design rules) but never existed.

## [Unreleased] - 2026-07-12

### Added — Portfolio app (staged for its own `portfolio` repo)
- **`portfolio/`**: Ryan's full portfolio — work case studies, writing
  (blog placeholder designed and routed), talks, and an About subpage —
  built as a zero-dependency static site generator (`build.mjs`) over a
  flat-file markdown CMS (`content/` + front matter). Zero client-side
  JavaScript, single-request pages, light/dark themes. Self-contained with
  its own README, `.gitignore`, and portable agent guidance now under
  `.agents/skills/portfolio-*` (content, writing, design, presenting) so it can be lifted into a standalone `portfolio`
  GitHub repo unchanged. Mounted at `/portfolio/` via `apps.json` and a new
  Dockerfile stage; the landing page hero now links to it.

### Changed — AQI map rebuilt on Google Maps Platform
- **`aqi-map/`** rewritten from a Browserify/Mapbox GL/PurpleAir contour
  app to a Vite app on a 2D Google map: Air Quality API heatmap tiles
  (Universal AQI / US AQI / PM2.5, with legend + opacity control),
  click-to-inspect `currentConditions:lookup` (AQI, category, dominant
  pollutant, concentrations), and Places `PlaceAutocompleteElement` search.
  Runs entirely on the referrer-restricted `VITE_GMP_API_KEY` browser key —
  no server proxy needed. Removed the gateway's `/api/purpleair/sensors`
  proxy and `/api/config/aqi-map` endpoint plus `PURPLEAIR_API_KEY`,
  `MAPBOX_PUBLIC_TOKEN`, and `MAPBOX_STYLE_URL` env vars everywhere
  (gateway, setup script, smoke tests, CI/deploy docs).

### Changed — Isochrones UX overhaul
- **`isochrones/`**: live-by-default rings (auto-generate on load and on
  any origin/scenario/setting change, debounced, generation-tokened),
  parallel band requests instead of serial, place search for the origin,
  compact scenario chips with a collapsible "Fine-tune" panel, per-band
  stats with cumulative area + incremental delta, hover-to-highlight
  between the list and the map, and dark map styling.

### Added — Single-container portfolio gateway
- **`gateway/`**: a zero-npm-dependency Node >=20 ES-module server
  (`gateway/server.js` + `gateway/lib/`) that is now the single entry point
  for the whole repo in production. It serves the portfolio landing page
  (`gateway/public/`), every app's static build (routed from the new root
  `apps.json` manifest, with a local-dev fallback to each app's
  `dev_build_dir`), and same-origin `/api/*` proxies for every
  secret-bearing call: Strava OAuth token exchange/refresh/deauthorize +
  photo proxy (ported from `strava-explorer/server/broker.js`, which is
  left intact for standalone use), Google Maps Isochrones, and PurpleAir
  sensor data. Every proxy endpoint returns `503` with a JSON error instead
  of crashing when its secret env var is unset, so the gateway always boots
  and smoke-tests keyless. Adds path-traversal-safe static serving, MIME
  typing, hashed-asset vs. HTML cache-control policy, security headers
  (including HSTS) on every response, and per-route rate limiting.
- **Portfolio landing page** (`gateway/public/index.html`): dependency-free
  dark-theme hero + responsive app card grid, hydrated from `/api/apps`
  with a baked-in static fallback, accessible (landmarks, skip link, AA
  contrast, `prefers-reduced-motion`), no trackers.
- **`apps.json`**: root-level manifest — adding a folder + an entry here is
  the entire process for adding a new demo app (see AGENTS.md's "Adding a
  new demo app").
- **Root `Dockerfile`**: multi-stage build, one `node:20-slim` builder
  stage per app, a slim non-root runtime stage carrying only `gateway/` +
  each app's static output + `apps.json`. Plus `.dockerignore`. Updated to accept `VITE_GMP_API_KEY` and `VITE_STRAVA_CLIENT_ID` build arguments.
- **`scripts/build-local.mjs`**: builds every app from `apps.json` and
  stages output under `apps/<name>/` exactly like the Dockerfile's runtime
  stage — the one code path both CI and humans use to answer "does it
  build," since Docker itself isn't always available.
- **`scripts/smoke.mjs`**: dependency-free end-to-end smoke test — route
  liveness, HTML/asset-reference resolution for every app, the
  `apps.json` <-> `/api/apps` contract, the `/<app>` -> `/<app>/` redirect,
  Strava OAuth URL shape, a secret-leak scan (Google/Mapbox/Stripe key
  patterns, PEM blocks, `client_secret`, a PurpleAir-key heuristic) over
  every served asset, and keyless proxy behavior. Wired as `npm run smoke`.
- **CI/CD**: rewrote `.github/workflows/ci.yml` (strava-explorer lint+test,
  plus a new secrets-free build-all + smoke job; dropped the old Playwright
  step, superseded by the smoke test) and `.github/workflows/deploy.yml`
  (single Cloud Build + Cloud Run deploy via Workload Identity Federation,
  replacing the old GCS-bucket + separate-broker deploy). Added
  `.github/dependabot.yml` for weekly npm updates per app dir plus
  GitHub Actions. Passing `VITE_GMP_API_KEY` and `VITE_STRAVA_CLIENT_ID` build arguments to `gcloud builds submit`.
- **Real screenshots**: Generated and added high-resolution visual previews for `aqi-map` and `isochrones` landing cards, wired up via `apps.json` as `/previews/aqi-map.jpg` and `/previews/isochrones.jpg`.

### Changed
- `strava-explorer` and `isochrones` Vite configs now read `BASE_PATH` (env)
  for their build `base`, so the gateway can mount them at
  `/strava-explorer/` and `/isochrones/`; `strava.js` defaults the OAuth
  broker base and redirect URI to same-origin when unset, and no longer
  skips the Strava deauthorize network call just because that base is the
  same-origin empty-string default.
- `aqi-map` no longer requires a PurpleAir key in the browser: it fetches
  Mapbox config from `/api/config/aqi-map` (falling back to
  `window.AQI_MAP_CONFIG` for local `npm start`) and calls
  `/api/purpleair/sensors` instead of PurpleAir directly.
- Added an accessible "&larr; trails.ninja" home link to each app's UI.


### Fixed (found via the new smoke test / gateway code review)
- A keyless `strava-explorer` build was dead-code-eliminating the entire
  Strava OAuth authorize URL: esbuild statically proves
  `if (!STRAVA_CLIENT_ID) return null` is always true when
  `VITE_STRAVA_CLIENT_ID` is unset, and strips the unreachable URL
  construction below it. `scripts/build-local.mjs` now defaults it to an
  obvious placeholder when unset (client IDs aren't secret — Strava puts
  them directly in the authorize URL every user sees).
- `gateway/lib/strava.js` and `gateway/lib/isochrones.js` checked broker
  configuration before validating the request body, so a keyless server
  503'd on a malformed request instead of 400ing.
- A cache-control heuristic was flagging ordinary hyphenated filenames
  (`strava-explorer.jpg`, coincidentally 8 characters) as content-hashed
  and handing them a year-long immutable cache.
- Re-enabled dynamic resolution of `STRAVA_REDIRECT_URI` by removing legacy
  `.env.production` and `.env.development` files from the frontend subdirectories
  that were silently overriding the dynamic fallback with hardcoded `localhost:5173`
  values during Vite builds.

## [Unreleased] - 2026-07-03

### Changed / Improved (Workstreams B & E)
- **Shared Utilities (B4)**: Created `src/geo.js` containing pure mathematical and geospatial utilities (`haversineKm`, `bearingDeg`, `lerp`, `lerpAngle`, `clamp`, `samplePointAlongLine`, `samplePointAlongLineExact`, `calculateCumulativeDistances`, `downsamplePath`, `smoothPath`, and `calculateElevationLoss`). These are independent of `google.maps` to enable modularity and testing.
- **Unit/Telemetry Formatting (B4)**: Created `src/units.js` consolidating imperial and metric unit conversions (`KM_PER_MILE`, `MILES_PER_KM`, `FEET_PER_METER`, `M_PER_FT`, `MPS_TO_MPH`) and formatters (`formatDistance`, `formatElevation`, `formatSpeed`, `formatDuration`).
- **Unified LatLng Normalization (B4)**: Created `src/latlng.js` with `toLatLngLiteral()` to clean up inline coordinate conversions in the codebase.
- **Logging Discipline (B3)**: Created `src/log.js` containing a development-only `debug()` logger and always-on `warn()` and `error()` functions. Replaced all console statements in the application with these functions.
- **GMP Modernization (E1-E4)**:
  - Switched the Maps JavaScript API loader channel to `'beta'`.
  - Added internal attribution tracking ID: `gmp_git_agentskills_v1`.
  - Implemented asynchronous waiting for `gmp-steadystate` event on `Map3DElement` before initiating flights to eliminate visual camera jumps on route loads.
  - Added event listeners for `gmp-error` on `Map3DElement` to gracefully report WebGL initialization errors.
  - Consolidated fallback altitude handling under the named constant `DEFAULT_ALTITUDE_M` = 10.
- **Package Maintenance and Cleanups (B1, B2)**:
  - Renamed package to `"strava-3d-explorer"`, marked it private, updated scripts to support `"vitest"` for testing, and added `"lint": "eslint src/"`.
  - Deleted historical files and dead weight (`MIGRATION_PLAN.md`, `strava-explorer/PLAN.md`, `resources/strava-v3.md`, `debug.js`, `scripts/curl_test.sh`, and `static/line.svg`).
  - Removed dead athlete profile blocks, CSS rules, and old canvas tags from `index.html`.
- **Docs and Licenses (B5)**:
  - Replicated project MIT license to the repository root `LICENSE` file.
  - Documented the modular client architecture and security constraints in `README.md` and added a cost warning note.
  - Updated `AGENTS.md` with package requirements, testing instructions, and references to the `isochrones/` project.

## [Unreleased] - 2026-06-24

### Added
- **Isochrones Demo**: Added a new [isochrones/](isochrones/) Vite + Node demo that reuses `VITE_GMP_API_KEY`, proxies Isochrones API requests through a local server, and visualizes selectable reachability polygons for delivery, commute, and response-planning use cases.
- **Premium Dark Mode UI**: Overhauled [index.html](strava-explorer/index.html) with a premium glassmorphism theme, translucent control panels, custom telemetry grid, and custom-styled form controls (sliders, selects).
- **Start/Finish 3D Pins**: Added custom green (`#4CAF50`) and red (`#F44336`) standard `PinElement` markers for the start and finish of Strava routes in [gmp.js](strava-explorer/src/gmp.js).
- **Dynamic Tour Timing**: The follow-camera fly-through duration now scales based on route length instead of a fixed time, improving the visual pacing on both short trails and long rides.
- **Auto-Pop Photo Milestones**: Photo markers automatically pop up larger for exactly 3 seconds as the follow-camera flyby sweeps past their coordinates in [followCamera.js](strava-explorer/src/followCamera.js), then auto-close. Triggers are automatically armed/disarmed on timeline scrubs.
- **Overlapping Photo Clustering (Anti-Flicker)**: Implemented 10-meter spatial photo grouping in [gmp.js](strava-explorer/src/gmp.js) that collapses overlapping photos into a single volumetric 3D marker with a dynamically drawn count badge and a paginated slide-show popover.

### Changed / Improved
- **Isochrones Environment Configuration**: Configured the [isochrones/](isochrones/) demo to load `GMP_SERVER_API_KEY` (with `VITE_GMP_API_KEY` fallback) from a local `.env` file using Node's native `process.loadEnvFile()` in [server.js](isochrones/server.js), aligning it with key security best practices.
- **Aspect-Ratio Thumbnail Rendering**: Updated `resizeImageToDataUrl` in [gmp.js](strava-explorer/src/gmp.js) to preserve the source image's aspect ratio dynamically instead of forcing a square crop.
- **Maps JS API Version**: Switched back to the `alpha` build channel in [gmp.js](strava-explorer/src/gmp.js) to gain access to the fixed 3D custom element observer loop, allowing clean, non-deprecated usage of `PinElement`.
- **Enhanced Camera Smoothing**: Blended multiple look-ahead route coordinates and implemented a frame-rate-aware yaw rate limit in [followCamera.js](strava-explorer/src/followCamera.js) to prevent sudden camera jumps or "rubber-banding" around switchbacks.
- **Improved Elevation Tracking**: Connected elevation profile clicks directly to tracking markers and follow-camera progress, enabling fluid map scrub previews.
- **Shareable URL Parameters & Deep-Linking**: Implemented serialization of date filters, activity selection, and all follow-camera settings to query parameters using `history.replaceState()`. Includes intelligent deep-linking that safely auto-loads shared activities.
- **Floating HUD Share Button**: Added a beautiful glass-morphism "Share Tour" button with built-in clipboard copying and visual feedback.
- **Compact UI Optimization**: Removed static debug HUD badge and tightened vertical padding between the sidebar title and the "Pick a route" section.
- **Documentation Restructuring**: Cleaned up the root directory by renaming the cryptic `Hs.md` to [HOSTING.md](strava-explorer/HOSTING.md), and resolved duplication of hosting instructions in [README.md](strava-explorer/README.md) by replacing it with a concise reference to [HOSTING.md](strava-explorer/HOSTING.md).
- **README Simplification**: Restructured the user-facing README files across all three projects (root, `strava-explorer`, and `aqi-map`) to focus on basic, easy-to-follow overviews and standard open-source sections including terms of service compliance, security guidelines, and licensing.
- **Image Optimization & Preview**: Resized and compressed a large 11MB screenshot to a web-optimized [strava-explorer.jpg](strava-explorer/strava-explorer.jpg) (325KB) using macOS `sips` and added it as a visual preview to the top of [README.md](strava-explorer/README.md).

### Fixed
- **Security Hardening**: Untracked local `.env.development` and `.env.production` files to ensure they respect `.gitignore` and are not accidentally committed, and replaced an internal Googleplex redirect URI with a generic placeholder.
- **Synchronized Follow-Camera & Marker Tracking**: Fixed an issue where the follow-camera and tracking marker fell out of sync during the 3D route animation in [followCamera.js](strava-explorer/src/followCamera.js). Refactored the engine to use a 15-point rolling average across the full route array, re-enabled spatial LERP interpolation on the camera center to eliminate high-speed speed-up jank, and bound the tracking marker directly to the final interpolated camera center.
- **Mountainous Camera Tilt & Elevation Avoidance**: Fixed camera looking too vertical (staring straight down) in mountainous regions in [followCamera.js](strava-explorer/src/followCamera.js) by replacing the tilt drop with a dynamic tilt boost (raising tilt up to 85 degrees to look ahead at climbs) and reduced range zoom aggressiveness to make camera mesh avoidance less conservative.
- **3D Photo Marker Stack Overflow & Rendering**: Fixed another `RangeError: Maximum call stack size exceeded` crash by refactoring `displayPhotoMarkers` in [gmp.js](strava-explorer/src/gmp.js) to use `HTMLTemplateElement` wrapping a direct `HTMLImageElement` instead of using the custom `<gmp-pin>` element, which has dynamic rendering/observing loops when combined with remote images and popover bindings. Connected the popover to the marker using `gmpPopoverTargetElement` instead of setting `positionAnchor: marker` on the popover element.
- **Call Stack Overflow & Deprecation Errors**: Fixed a `RangeError: Maximum call stack size exceeded` recursion loop and `<gmp-pin>` deprecation warnings by updating Google Maps loader to `alpha` and directly appending the `PinElement` object (`marker.append(pin)`) instead of the deprecated, recursive `pin.element` property.
- **Reference Errors**: Fixed ReferenceErrors where `temp_token` and `getTourSettings` were undefined during URL state parsing and authentication flow.
- **Custom Pin Image Deprecation**: Swapped deprecated `glyph` to `glyphSrc` for loading photo URLs onto custom `PinElement` markers, preventing WebGL/Maps 3D serialization failures.
- **3D Photo Marker Sizing**: Replaced custom unscalable `HTMLTemplateElement` image billboards with properly proportioned, natively scalable `PinElement` structures.

---

## [1.1.0] - 2026-06-20

### Added
- Cloud Run token broker for OAuth flow, separating `STRAVA_CLIENT_SECRET` from client-side bundle.
- GCS + Cloud CDN static assets build and deployment scripts.

### Changed
- Refactored Strava activity processing to store access and refresh tokens locally in browser `localStorage`.

---

## [1.0.0] - 2026-06-19

### Added
- Initial project structure.
- `strava-explorer/`: Vite + Google Maps Platform 3D Maps app for 3D route viewing.
- `aqi-map/`: Mapbox GL + PurpleAir hyperlocal AQI map.
